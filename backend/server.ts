import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';

import { config, isProduction, origin } from './config/env';
import AgentsService from './service/agents_service';
import AiService from './service/ai_service';
import AnalysisService from './service/analysis_service';
import GithubService from './service/github_service';
import ProgressService from './service/progress_service';
import {
  cachedAnalysis,
  deleteCachedAnalysis,
  getCachedFileDetails,
  insertFileCache,
  upsertAnalysis,
} from './utils/cache';
import {
  analysisRateLimiter,
  aiRateLimiter,
  generalRateLimiter,
  inlineAiRateLimiter,
  fixPlanRateLimiter,
} from './utils/rate_limits';
import { sanitize, sanitizeFileName } from './utils/utils';
import {
  validateAndReturnAnalysisCache,
  validateFile,
} from './utils/validations';

const app = express();
const PORT = config.port || 8080;
const upload = multer();

const progressService = new ProgressService();
const githubService = new GithubService();
const analysisService = new AnalysisService();
const aiService = new AiService();

const getGithubService = (token?: string) => {
  return token ? new GithubService(token) : githubService;
};

const getAnalysisService = (token?: string) => {
  return token ? new AnalysisService(token, progressService) : analysisService;
};

if (isProduction) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );
} else {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
}

app.use(
  cors({
    origin: origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

if (isProduction) {
  app.use(
    morgan('combined', {
      skip: (_, res: Response) => res.statusCode < 400,
    }),
  );
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(generalRateLimiter);

app.get('/', (req, res) => {
  res.json({
    response: 'GitVulSafe backend is running!',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

app.post('/branches', (req: Request, res: Response) => {
  (async () => {
    const { username, repo, github_pat, page, pageSize } = req.body;

    // Enhanced input validation
    if (!username || !repo) {
      return res.status(400).json({
        error: 'Username and repo are required',
        timestamp: new Date().toISOString(),
      });
    }

    const sanitizedData = sanitize({ username, repo });
    const sanitizedUsername = String(sanitizedData.username);
    const sanitizedRepo = String(sanitizedData.repo);

    console.log('Received branches request:', {
      username: sanitizedUsername,
      repo: sanitizedRepo,
      hasToken: !!github_pat,
    });

    const githubService = getGithubService(github_pat);
    try {
      const data = await githubService.getBranches(
        sanitizedUsername,
        sanitizedRepo,
        page,
        pageSize,
      );
      res.json({
        branches: data.branches,
        defaultBranch: data.defaultBranch,
        hasMore: data.hasMore,
        total: data.total,
      });
    } catch (error) {
      console.error('Error fetching branches:', error);

      // Enhanced error logging for production
      if (isProduction) {
        console.error('Branches API Error:', {
          timestamp: new Date().toISOString(),
          endpoint: '/branches',
          username,
          repo,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  })().catch((err) => {
    console.error('Unhandled error in /branches:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
});

app.post(
  '/analyseDependencies',
  analysisRateLimiter,
  (req: Request, res: Response) => {
    (async () => {
      const { username, repo, branch, github_pat, forceRefresh } = req.body;

      // Input validation
      if (!username || !repo || !branch) {
        return res
          .status(400)
          .json({ error: 'Username, repo, and branch are required' });
      }

      if (forceRefresh !== undefined && typeof forceRefresh !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid forceRefresh parameter. Expected boolean.',
        });
      }

      console.log('Received analyseDependencies request:', {
        username,
        repo,
        branch,
        forceRefresh: !!forceRefresh,
      });

      if (!forceRefresh) {
        const response = await cachedAnalysis(username, repo, branch, res);
        if (response) {
          console.log('Returning cached analysis for:', {
            username,
            repo,
            branch,
          });
          return response;
        }
      } else {
        // Log force refresh requests for monitoring
        console.log('Force refresh requested - bypassing cache:', {
          username,
          repo,
          branch,
          timestamp: new Date().toISOString(),
        });
        await deleteCachedAnalysis(username, repo, branch);
      }

      const analysisService = getAnalysisService(github_pat);

      try {
        const analysisResults = await analysisService.analyseDependencies(
          username,
          repo,
          branch,
        );
        // console.log("Analysis Results:", analysisResults);

        // Try to get branches for this repo/branch from cache, else fetch from GitHub

        const branchData = await githubService.getBranches(username, repo);
        await upsertAnalysis({
          username,
          repo,
          branch,
          data: analysisResults,
          branches: branchData.branches,
        });
        res.json(analysisResults);
      } catch (error) {
        console.error('Error analysing dependencies:', error);
        await deleteCachedAnalysis(username, repo, branch);
        res.status(500).json({ error: 'Failed to analyse dependencies' });
      }
    })().catch((err) => {
      console.error('Unhandled error in /analyseDependencies:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  },
);

app.post(
  '/uploadFile',
  upload.single('file'),
  (req: Request, res: Response) => {
    (async () => {
      const file = req.file;
      console.log('Received file upload request:', file?.originalname);

      if (!file) {
        return res.status(400).json({
          error: 'No file uploaded',
          timestamp: new Date().toISOString(),
        });
      }

      validateFile(file, res); // Enhanced validation
      console.log('File uploaded:', file.originalname);

      await insertFileCache({
        name: sanitizeFileName(file.originalname),
        content: file.buffer.toString('utf-8'),
      });

      res.json({
        message: 'File uploaded successfully',
        filename: file.originalname,
      });
    })().catch((error) => {
      console.error('Error uploading file:', error);

      if (isProduction) {
        console.error('File upload error:', {
          timestamp: new Date().toISOString(),
          endpoint: '/uploadFile',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      res.status(500).json({
        error: 'Failed to upload file',
        timestamp: new Date().toISOString(),
      });
    });
  },
);

app.post('/analyseFile', analysisRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    console.log('Received analyseFile request for file:', file);
    const analysisService = getAnalysisService();
    const cachedFileDetails = await getCachedFileDetails(file);
    try {
      const analysisResults =
        await analysisService.analyseFile(cachedFileDetails);

      res.json(analysisResults);
    } catch (error) {
      console.error('Error analysing file:', error);
      res.status(500).json({ error: 'Failed to analyse file' });
    }
  })().catch((error) => {
    console.error('Unhandled error in /analyseFile:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
});

app.post('/aiVulnSummary', aiRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { vulnerabilities } = req.body;
    if (!vulnerabilities || vulnerabilities.vulnerabilities.length === 0) {
      return res.status(400).json({ error: 'No vulnerabilities provided' });
    }
    console.log(
      'Received aiVUlnSummary request with vulnerabilities:',
      vulnerabilities,
    );
    try {
      const summary =
        await aiService.generateVulnerabilitySummary(vulnerabilities);
      res.json({ summary });
    } catch (error) {
      console.error('Error generating vulnerability summary:', error);
      res
        .status(500)
        .json({ error: 'Failed to generate vulnerability summary' });
    }
  })().catch((error) => {
    console.error('Unhandled error in /aiVUlnSummary:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
});

app.post('/inlineai', inlineAiRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { prompt, context, selectedText } = req.body;
    if (!selectedText || !prompt || !context) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    console.log('Received inlineai request with text:', selectedText);
    try {
      const response = await aiService.generateInlineResponse(
        prompt,
        context,
        selectedText,
      );
      res.json({ response });
    } catch (error) {
      console.error('Error generating inline response:', error);
      res.status(500).json({ error: 'Failed to generate inline response' });
    }
  })().catch((error) => {
    console.error('Unhandled error in /inlineai:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
});

app.get('/fixPlan', fixPlanRateLimiter, (req: Request, res: Response) => {
  (async () => {
    const { username, repo, branch } = req.query;

    if (!username || !repo || !branch) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Received fixPlan request for:', { username, repo, branch });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection confirmation
    res.write(
      `data: ${JSON.stringify({ type: 'connection', message: 'Connected to fix plan generator' })}\n\n`,
    );

    // Set a timeout to prevent hanging connections
    const timeout = setTimeout(() => {
      res.write(`data: ${JSON.stringify({ error: 'Request timeout' })}\n\n`);
      res.end();
    }, 120000); // 2 minutes timeout

    req.on('close', () => {
      console.log('Connection closed by client');
      clearTimeout(timeout);
      res.end();
    });

    req.on('error', () => {
      console.log('Connection error');
      clearTimeout(timeout);
      res.end();
    });

    try {
      const data = await validateAndReturnAnalysisCache(
        String(username),
        String(repo),
        String(branch),
        res,
      );
      // SSE Steps - init
      res.write(
        `data: ${JSON.stringify({
          progress: 'Initializing fix plan generation...',
          step: 'init',
        })}\n\n`,
      );

      const agentsService = new AgentsService(data); //initial service with stored analysis data

      const progressCallback = (
        step: string,
        message: string,
        dependencyData?: Record<string, unknown>,
      ) => {
        res.write(
          `data: ${JSON.stringify({
            step: step,
            progress: message,
            data: dependencyData,
            timestamp: new Date().toISOString(),
          })}\n\n`,
        );
      };

      const response =
        await agentsService.generateComprehensiveFixPlan(progressCallback);

      // Send final result
      res.write(
        `data: ${JSON.stringify({
          result: response,
          step: 'analysis_complete',
          progress: 'Fix plan generation completed!',
        })}\n\n`,
      );

      // Send end event to signal completion
      res.write(`event: end\ndata: ${JSON.stringify({ complete: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error generating fix plan:', error);
      res.write(
        `data: ${JSON.stringify({
          error: 'Failed to generate fix plan',
          details: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`,
      );
      res.end();
    }
  })().catch((error) => {
    console.error('Unhandled error in /fixPlan:', error);
    res.write(
      `data: ${JSON.stringify({
        error: 'Internal server error',
      })}\n\n`,
    );
    res.end();
  });
});

app.get('/progress', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'X-Accel-Buffering': 'no',
  });

  console.log('New progress connection established');

  // Send initial connection confirmation
  res.write(
    `data: ${JSON.stringify({
      type: 'connection',
      message: 'Connected to progress updates',
      timestamp: new Date().toISOString(),
    })}\n\n`,
  );

  // Set up progress callback to send updates via SSE
  const progressCallback = (step: string, progress: number) => {
    if (!res.destroyed && !res.writableEnded) {
      try {
        res.write(
          `data: ${JSON.stringify({
            step,
            progress,
            timestamp: new Date().toISOString(),
          })}\n\n`,
        );
      } catch (error) {
        console.error('Error writing progress update:', error);
      }
    }
  };

  // Add callback to global service
  progressService.addCallback(progressCallback);
  console.log(
    `Progress callback added. Total callbacks: ${progressService.getCallBackCount()}`,
  );

  // Set a timeout to prevent hanging connections
  const timeout = setTimeout(() => {
    if (!res.destroyed && !res.writableEnded) {
      console.log('Progress connection timeout');
      res.write(
        `data: ${JSON.stringify({
          type: 'timeout',
          message: 'Connection timeout',
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );
      res.end();
    }
  }, 300000); // 5 minutes timeout

  // Send periodic heartbeat to detect broken connections
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) {
      try {
        res.write(
          `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`,
        );
      } catch {
        console.log('Heartbeat failed, connection likely broken');
        clearInterval(heartbeat);
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds

  req.on('close', () => {
    console.log('Progress connection closed by client');
    progressService.removeCallback(progressCallback);
    console.log(
      `Progress callback removed. Remaining callbacks: ${progressService.getCallBackCount()}`,
    );
    clearTimeout(timeout);
    clearInterval(heartbeat);

    // Only reset if no more active connections
    if (progressService.getCallBackCount() === 0) {
      console.log('No more active connections, resetting progress service');
      progressService.reset();
    }

    if (!res.destroyed) {
      res.end();
    }
  });

  req.on('error', (error: Error & { code?: string }) => {
    // Handle different types of connection errors more gracefully
    if (error.code === 'ECONNRESET') {
      console.log(
        'Progress connection reset by client (normal browser close/navigation)',
      );
    } else if (error.code === 'EPIPE') {
      console.log('Progress connection broken pipe (client disconnected)');
    } else {
      console.log('Progress connection error:', error.message ?? error);
    }

    progressService.removeCallback(progressCallback);
    clearTimeout(timeout);
    clearInterval(heartbeat);

    // Only reset if no more active connections
    if (progressService.getCallBackCount() === 0) {
      progressService.reset();
    }

    if (!res.destroyed) {
      res.end();
    }
  });
});

app.use((err: Error, req: Request, res: Response) => {
  console.error('Unhandled error:', err);

  if (isProduction) {
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`GitVulSafe server started successfully!`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `Security: ${isProduction ? 'Production mode (strict)' : 'Development mode (permissive)'}`,
  );
  console.log(
    `Logging: ${isProduction ? 'Production (errors only)' : 'Development (verbose)'}`,
  );
  console.log(`Started at: ${new Date().toISOString()}`);

  if (isProduction) {
    console.log(`CORS origin: ${origin}`);
    console.log(`Trust proxy: enabled`);
  } else {
    console.log(`CORS: allowing all origins (development)`);
  }
});
