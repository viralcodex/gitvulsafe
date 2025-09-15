import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import { config, isProduction } from "./config/env";
import { sanitize, extractSanitizedString, sanitizeFileName } from "./utils/utils";
import {
  getCachedAnalysis,
  upsertAnalysis,
  insertFile,
  getFileDetails,
  deleteCachedAnalysis,
} from "./db/actions";
import AiService from "./service/ai_service";
import AgentsService from "./service/agents_service";
import AnalysisService from "./service/analysis_service";
import {
  analysisRateLimiter,
  aiRateLimiter,
  generalRateLimiter,
  inlineAiRateLimiter,
  fixPlanRateLimiter,
} from "./utils/rate_limits";
import { DependencyApiResponse, manifestFiles } from "./constants/constants";

const app = express();
const PORT = config.port || 8080;
const upload = multer();

// Security middleware - stricter in production
if (isProduction) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );
}
// Development - more permissive helmet settings
else {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
}

// CORS configuration
app.use(
  cors({
    origin: isProduction ? [config.origin] : "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

if (isProduction) {
  app.use(
    morgan("combined", {
      skip: (req, res) => res.statusCode < 400,
    })
  );
} else {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(generalRateLimiter);

app.get("/", (req, res) => {
  res.json({
    response: "DepHound backend is running!",
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

app.post("/branches", (req: Request, res: Response) => {
  (async () => {
    const { username, repo, github_pat, page, pageSize } = req.body;

    // Enhanced input validation
    if (!username || !repo) {
      return res.status(400).json({
        error: "Username and repo are required",
        timestamp: new Date().toISOString(),
      });
    }

    const sanitizedData = sanitize({ username, repo });
    const sanitizedUsername = extractSanitizedString(sanitizedData.username);
    const sanitizedRepo = extractSanitizedString(sanitizedData.repo);

    console.log("Received branches request:", {
      username: sanitizedUsername,
      repo: sanitizedRepo,
      hasToken: !!github_pat,
    });

    const analysisService = new AnalysisService(github_pat);

    try {
      const data = await analysisService.getBranches(
        sanitizedUsername,
        sanitizedRepo,
        page,
        pageSize
      );
      res.json({
        branches: data.branches,
        defaultBranch: data.defaultBranch,
        hasMore: data.hasMore,
        total: data.total,
      });
    } catch (error) {
      console.error("Error fetching branches:", error);

      // Enhanced error logging for production
      if (isProduction) {
        console.error("Branches API Error:", {
          timestamp: new Date().toISOString(),
          endpoint: "/branches",
          username,
          repo,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.status(500).json({ error: "Failed to fetch branches" });
    }
  })().catch((err) => {
    console.error("Unhandled error in /branches:", err);
    res.status(500).json({ error: "Internal server error" });
  });
});

app.post(
  "/analyseDependencies",
  analysisRateLimiter,
  (req: Request, res: Response) => {
    (async () => {
      const { username, repo, branch, github_pat } = req.body;

      // Input validation
      if (!username || !repo || !branch) {
        return res
          .status(400)
          .json({ error: "Username, repo, and branch are required" });
      }

      console.log("Received analyseDependencies request:", {
        username,
        repo,
        branch,
      });

      let cachedData: Array<{
        uuid: string;
        username: string;
        repo: string;
        branch: string;
        branches: string[];
        data: DependencyApiResponse | null;
        created_at: Date;
      }> = [];

      try {
        cachedData = await getCachedAnalysis(username, repo, branch);

        if (cachedData.length > 0 && cachedData[0].data) {
          return res.json(cachedData[0].data);
        }
      } catch (dbError) {
        console.error("Database error checking cache:", dbError);
        // Continue with fresh analysis if DB check fails
      }

      const analysisService = new AnalysisService(github_pat);

      try {
        const analysisResults = await analysisService.analyseDependencies(
          username,
          repo,
          branch
        );
        // console.log("Analysis Results:", analysisResults);

        // Try to get branches for this repo/branch from cache, else fetch from GitHub
        let branches =
          cachedData.length > 0 ? cachedData[0].branches : undefined;
        if (!branches) {
          // fallback: fetch from GitHub
          const branchData = await analysisService.getBranches(username, repo);
          branches = branchData.branches;
        }
        await upsertAnalysis({
          username,
          repo,
          branch,
          data: analysisResults,
          branches,
        });
        res.json(analysisResults);
      } catch (error) {
        console.error("Error analysing dependencies:", error);
        await deleteCachedAnalysis(username, repo, branch);
        res.status(500).json({ error: "Failed to analyse dependencies" });
      }
    })().catch((err) => {
      console.error("Unhandled error in /analyseDependencies:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  }
);

app.post(
  "/uploadFile",
  upload.single("file"),
  (req: Request, res: Response) => {
    (async () => {
      const file = req.file;
      console.log("Received file upload request:", file?.originalname);
      
      if (!file) {
        return res.status(400).json({
          error: "No file uploaded",
          timestamp: new Date().toISOString(),
        });
      }

      // Enhanced file validation
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      if (file.size > maxSize) {
        return res.status(400).json({
          error: "File size exceeds the 5MB limit",
          maxSize: "5MB",
          receivedSize: `${Math.round((file.size / 1024 / 1024) * 100) / 100}MB`,
          timestamp: new Date().toISOString(),
        });
      }

      // File type validation
      const fileExtension = file.originalname.toLowerCase().split(".").pop();
      if (
        !fileExtension ||
        !Object.values(manifestFiles).some((type) =>
          type.includes(fileExtension)
        )
      ) {
        return res.status(400).json({
          error: "Invalid file type",
          timestamp: new Date().toISOString(),
        });
      }

      console.log("File uploaded:", file.originalname);

      await insertFile({
        name: sanitizeFileName(file.originalname),
        content: file.buffer.toString("utf-8"),
      });

      res.json({
        message: "File uploaded successfully",
        filename: file.originalname,
      });
    })().catch((error) => {
      console.error("Error uploading file:", error);

      if (isProduction) {
        console.error("File upload error:", {
          timestamp: new Date().toISOString(),
          endpoint: "/uploadFile",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.status(500).json({
        error: "Failed to upload file",
        timestamp: new Date().toISOString(),
      });
    });
  }
);

app.post("/analyseFile", analysisRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }
    console.log("Received analyseFile request for file:", file);
    const analysisService = new AnalysisService();
    const cachedFileDetails = await getFileDetails(file);
    try {
      const analysisResults = await analysisService.analyseFile(cachedFileDetails);

      // console.log("Analysis Results for file:", analysisResults);

      res.json(analysisResults);
    } catch (error) {
      console.error("Error analysing file:", error);
      res.status(500).json({ error: "Failed to analyse file" });
    }
  })().catch((error) => {
    console.error("Unhandled error in /analyseFile:", error);
    res.status(500).json({ error: "Internal server error" });
  });
});

app.post("/aiVulnSummary", aiRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { vulnerabilities } = req.body;
    if (!vulnerabilities || vulnerabilities.vulnerabilities.length === 0) {
      return res.status(400).json({ error: "No vulnerabilities provided" });
    }
    console.log(
      "Received aiVUlnSummary request with vulnerabilities:",
      vulnerabilities
    );
    const aiService = new AiService();
    try {
      const summary =
        await aiService.generateVulnerabilitySummary(vulnerabilities);
      res.json({ summary });
    } catch (error) {
      console.error("Error generating vulnerability summary:", error);
      res
        .status(500)
        .json({ error: "Failed to generate vulnerability summary" });
    }
  })().catch((error) => {
    console.error("Unhandled error in /aiVUlnSummary:", error);
    res.status(500).json({ error: "Internal server error" });
  });
});

app.post("/inlineai", inlineAiRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { prompt, context, selectedText } = req.body;
    if (!selectedText || !prompt || !context) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    console.log("Received inlineai request with text:", selectedText);
    const aiService = new AiService();
    try {
      const response = await aiService.generateInlineResponse(
        prompt,
        context,
        selectedText
      );
      res.json({ response });
    } catch (error) {
      console.error("Error generating inline response:", error);
      res.status(500).json({ error: "Failed to generate inline response" });
    }
  })().catch((error) => {
    console.error("Unhandled error in /inlineai:", error);
    res.status(500).json({ error: "Internal server error" });
  });
});

app.get("/fixPlan", fixPlanRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { username, repo, branch } = req.query;

    if (!username || !repo || !branch) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    console.log("Received fixPlan request for:", { username, repo, branch });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "X-Accel-Buffering": "no",
    });

    // Send initial connection confirmation
    res.write(
      `data: ${JSON.stringify({ type: "connection", message: "Connected to fix plan generator" })}\n\n`
    );

    // Set a timeout to prevent hanging connections
    const timeout = setTimeout(() => {
      res.write(`data: ${JSON.stringify({ error: "Request timeout" })}\n\n`);
      res.end();
    }, 60000); // 60 seconds timeout

    req.on("close", () => {
      console.log("Connection closed by client");
      clearTimeout(timeout);
      res.end();
    });

    req.on("error", () => {
      console.log("Connection error");
      clearTimeout(timeout);
      res.end();
    });

    try {

      const data = await getCachedAnalysis(
        username as string,
        repo as string,
        branch as string
      );

      if (data.length === 0 || !data[0].data) {
        res.write(
          `data: ${JSON.stringify({
            error:
              "Error: No analysis data found for the specified repo and branch. Please run dependency analysis first.",
          })}\n\n`
        );
        res.end();
        return;
      }

      // SSE Steps - init
      res.write(
        `data: ${JSON.stringify({
          progress: "Initializing fix plan generation...",
          step: "init",
        })}\n\n`
      );

      const agentsService = new AgentsService(data[0].data); //initial service with stored analysis data

      const progressCallback = (
        step: string,
        message: string,
        dependencyData?: Record<string, unknown>
      ) => {
        res.write(
          `data: ${JSON.stringify({
            step: step,
            progress: message,
            data: dependencyData,
            timestamp: new Date().toISOString()
          })}\n\n`
        );
      };

      const response = await agentsService.generateComprehensiveFixPlan(progressCallback);

      // Send final result
      res.write(
        `data: ${JSON.stringify({
          result: response,
          step: "analysis_complete",
          progress: "Fix plan generation completed!"
        })}\n\n`
      );

      // Send end event to signal completion
      res.write(`event: end\ndata: ${JSON.stringify({ complete: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error generating fix plan:", error);
      res.write(
        `data: ${JSON.stringify({
          error: "Failed to generate fix plan",
          details: error instanceof Error ? error.message : "Unknown error"
        })}\n\n`
      );
      res.end();
    }
  })().catch((error) => {
    console.error("Unhandled error in /fixPlan:", error);
    res.write(
      `data: ${JSON.stringify({
        error: "Internal server error"
      })}\n\n`
    );
    res.end();
  });
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  console.error("Unhandled error:", err);

  if (isProduction) {
    // Don't leak error details in production
    res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  } else {
    // Show full error details in development
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
});

// Handle 404 routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
process.on("SIGTERM", () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`DepHound server started successfully!`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `Security: ${isProduction ? "Production mode (strict)" : "Development mode (permissive)"}`
  );
  console.log(
    `Logging: ${isProduction ? "Production (errors only)" : "Development (verbose)"}`
  );
  console.log(`Started at: ${new Date().toISOString()}`);

  if (isProduction) {
    console.log(`CORS origin: ${config.origin}`);
    console.log(`Trust proxy: enabled`);
  } else {
    console.log(`CORS: allowing all origins (development)`);
  }
});
