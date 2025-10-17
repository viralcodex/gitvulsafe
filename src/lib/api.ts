import {
  BranchesApiResponse,
  ManifestFileContentsApiResponse,
  ProgressSSE,
  Vulnerability,
  VulnerabilityFix,
} from "@/constants/model";
import { getNewFileName } from "./utils";
import { progressSteps } from "@/constants/constants";

const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_API_PROD_URL
    : process.env.NEXT_PUBLIC_API_DEV_URL;

export async function getRepoBranches(
  username: string,
  repo: string,
  github_pat?: string,
  page?: number,
  pageSize?: number
): Promise<BranchesApiResponse> {
  try {
    if (!page) page = 1;
    if (!pageSize) pageSize = 100;

    // console.log("repourl", `${baseUrl}/branches`);
    const url = new URL(`${baseUrl}/branches`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, repo, github_pat, page, pageSize }),
    });

    if (response.status === 429) {
      return response.json();
    }

    const data = (await response.json()) as BranchesApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return { error: "Failed to fetch branches. Please try again later." };
  }
}

export async function getManifestFileContents(
  username: string,
  repo: string,
  branch: string
): Promise<ManifestFileContentsApiResponse> {
  try {
    const url = new URL(`${baseUrl}/manifestData`);
    const github_pat =
      process.env.GITHUB_PAT ?? localStorage.getItem("github_pat") ?? undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, repo, branch, github_pat }),
    });

    if (response.status === 429) {
      return await response.json();
    }

    const data = (await response.json()) as ManifestFileContentsApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching manifest file contents:", error);
    throw new Error(
      "Failed to fetch manifest file contents. Please try again later."
    );
  }
}

export async function analyseDependencies(
  username: string,
  repo: string,
  branch: string,
  file: string
): Promise<ManifestFileContentsApiResponse> {
  try {
    const url = file
      ? new URL(`${baseUrl}/analyseFile`)
      : new URL(`${baseUrl}/analyseDependencies`);
    const github_pat =
      process.env.GITHUB_PAT ?? localStorage.getItem("github_pat") ?? undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: file
        ? JSON.stringify({ file })
        : JSON.stringify({ username, repo, branch, github_pat }),
    });

    if (response.status === 429) {
      return await response.json();
    }

    const data = (await response.json()) as ManifestFileContentsApiResponse;
    return data;
  } catch (error) {
    console.error("Error analysing dependencies:", error);
    throw new Error("Failed to analyse dependencies. Please try again later.");
  }
}

export async function uploadFile(
  file: File
): Promise<{ response: JSON; newFileName: string }> {
  try {
    const url = new URL(`${baseUrl}/uploadFile`);

    const formData = new FormData();
    const newFileName = getNewFileName(file.name);
    const newFile = new File([file], newFileName, {
      type: file.type,
    });

    formData.append("file", newFile);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    if (response.status === 429) {
      return { response: await response.json(), newFileName };
    }

    // console.log("File uploaded successfully"); // This line is for debugging, can be removed
    return { response: await response.json(), newFileName };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file. Please try again later.");
  }
}

export async function getAiVulnerabilitiesSummary(vulnerabilities: {
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
}): Promise<string> {
  try {
    const url = new URL(`${baseUrl}/aiVulnSummary`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vulnerabilities }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate AI vulnerabilities summary");
    }

    if (response.status === 429) {
      return await response.json();
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error("Error generating AI vulnerabilities summary:", error);
    throw new Error(
      "Failed to generate AI vulnerabilities summary. Please try again later."
    );
  }
}

export async function getInlineAiResponse(
  prompt: string,
  selectedText: string,
  context?: {
    name?: string;
    version?: string;
    vulnerabilities?: Vulnerability[];
  }
): Promise<string> {
  try {
    // console.log(prompt, selectedText, context);
    const url = new URL(`${baseUrl}/inlineai`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, selectedText, context }),
    });

    if (!response.ok) {
      throw new Error("Failed to get inline AI response");
    }

    if (response.status === 429) {
      return await response.json();
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error getting inline AI response:", error);
    throw new Error(
      "Failed to get inline AI response. Please try again later."
    );
  }
}

export async function getFixPlan(
  username: string,
  repo: string,
  branch: string
): Promise<VulnerabilityFix> {
  try {
    const url = new URL(`${baseUrl}/fixPlan`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, repo, branch }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate fix plan");
    }

    if (response.status === 429) {
      return await response.json();
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating fix plan:", error);
    throw new Error("Failed to generate fix plan. Please try again later.");
  }
}

export function progressSSE(
  onProgress: (step: string, progress: number) => void,
  onConnection: () => void,
  onError: (error: string) => void
): EventSource {
  try {
    const url = new URL(`${baseUrl}/progress`);
    const eventSource = new EventSource(url.toString());
    let lastStepIndex = -1; // To track the last step index processed
    eventSource.onmessage = (event) => {
      try {
        const data : ProgressSSE = JSON.parse(event.data);
        // console.log("SSE Data:", data);
        if (data.type === "connection") {
          // console.log("SSE Connection established:", data.message);
          onConnection();
          return;
        }

        if (data.step && typeof data.progress === "number") {
          const currentStepIndex = Object.keys(progressSteps).indexOf(
            data.step
          );

          // Only process if step is in correct order or is a valid step
          if (currentStepIndex >= lastStepIndex) {
            lastStepIndex = Math.max(lastStepIndex, currentStepIndex);
            onProgress(progressSteps[data.step], data.progress);
          } else {
            console.warn(
              `Out of order step received: ${data.step} (index: ${currentStepIndex}, last: ${lastStepIndex})`
            );
          }
        }
      } catch (parseError) {
        console.error("Error parsing SSE data:", parseError);
        onError("Error parsing server response");
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      onError("Connection error occurred");
      eventSource.close();
    };

    return eventSource;
  } catch (error) {
    console.error("SSE connection error:", error);
    onError("Failed to connect to progress stream");
    throw error;
  }
}

export async function getFixPlanSSE(
  username: string,
  repo: string,
  branch: string,
  onMessage: (data: Record<string, unknown>) => void,
  onError: (error: string) => void,
  onComplete: () => void
): Promise<EventSource> {
  const url = new URL(`${baseUrl}/fixPlan`);
  url.searchParams.append("username", username);
  url.searchParams.append("repo", repo);
  url.searchParams.append("branch", branch);

  const eventSource = new EventSource(url.toString());

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // // console.log("SSE Data:", data);
      if (data.type === "connection") {
        // // console.log("SSE Connection established:", data.message);
        return;
      }
      switch (data.step) {
        case "vulnerability_analysis_start":
          break;
        case "vulnerability_analysis_complete":
          onMessage(data.data ?? {});
          break;
        case "fix_plan_generation_start":
          break;
        case "fix_plan_generation_complete":
          break;
        case "vulnerability_analysis_error":
          onError(data.progress as string);
          break;
        case "analysis_complete":
          onComplete();
          break;
      }
    } catch (parseError) {
      console.error("Error parsing SSE data:", parseError);
      onError("Error parsing server response");
      eventSource.close();
    }
  };

  eventSource.addEventListener("end", () => {
    // console.log("SSE stream ended");
    onComplete?.();
    eventSource.close();
  });

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    onError?.("Connection error occurred");
    eventSource.close();
  };

  // Return the EventSource so caller can close it manually if needed
  return eventSource;
}

export const healthCheck = async (): Promise<{
  response: string;
  environment: string;
  timestamp: string;
  status: string;
}> => {
  try {
    const url = new URL(`${baseUrl}/health`);
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Health check failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error during health check:", error);
    throw new Error("Failed to perform health check. Please try again later.");
  }
};
