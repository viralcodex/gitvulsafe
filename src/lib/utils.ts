import { Dependency, manifestFiles } from "@/constants/constants";
import { clsx, type ClassValue } from "clsx";
import { RefObject } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getNewFileName = (originalName: string): string => {
  const uuid = crypto.randomUUID();
  const fileExtension = originalName.split(".").pop() || "";
  const baseName = originalName.replace(`.${fileExtension}`, "");
  return `${baseName}_${uuid}.${fileExtension}`;
};

//verify the repoUrl format and extract username and repo
export const verifyUrl = (
  repoUrl: string,
  setError?: (error: string) => void
) => {
  const githubUrlPattern =
    /^https?:\/\/github\.com\/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_\.]+)\/?$/;
  const match = githubUrlPattern.exec(repoUrl.trim());

  if (!match) {
    setError?.("Please enter a valid GitHub repository URL");
    return;
  }

  const [, username, repo] = match || [];
  if (!username || !repo) {
    setError?.("Invalid repository URL format");
    return;
  }
  const sanitizedUsername = encodeURIComponent(username);
  const sanitizedRepo = encodeURIComponent(repo);

  return { sanitizedUsername, sanitizedRepo };
};

export const verifyFile = (
  file: File,
  setError: (error: string) => void,
  setFile: (file: File) => void
) => {
  if (!file) {
    setError("No file selected");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    setError("File size exceeds the 5MB limit");
    return;
  }

  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  if (
    !fileExtension ||
    !Object.values(manifestFiles).some((f) => f.file.endsWith(fileExtension))
  ) {
    setError("Invalid manifest file type");
    return;
  }

  setError("");
  setFile(file);

  return true;
};

export const parseFileName = (file: string) => {
  if (!file) return "No file selected";
  const fileName = file.split("_")[0] + file.slice(file.indexOf("."));
  const ecosystem = Object.keys(manifestFiles).find(
    (f) => manifestFiles[f].file === fileName
  );
  return `${ecosystem} : ${fileName}`;
};

export const getSeverityConfig = (score?: string) => {
  if (!score)
    return { text: "N/A", className: "bg-gray-500 text-white rounded-sm m-0" };
  const numericScore = parseFloat(score);

  if (numericScore >= 9.0)
    return {
      text: `${score} (Critical)`,
      className: "bg-red-600 text-white rounded-sm m-0",
    };
  if (numericScore >= 7.0)
    return {
      text: `${score} (High)`,
      className: "bg-orange-600 text-white rounded-sm m-0",
    };
  if (numericScore >= 4.0)
    return {
      text: `${score} (Medium)`,
      className: "bg-yellow-600 text-white rounded-sm m-0",
    };
  if (numericScore >= 0.1)
    return {
      text: `${score} (Low)`,
      className: "bg-green-600 text-white rounded-sm m-0",
    };
  return {
    text: "(N/A)",
    className: "bg-gray-500 text-white rounded-sm m-0",
  };
};

export const getFixTypeConfig = (fixType: string) => {
  switch (fixType.toLowerCase()) {
    case "upgrade":
      return {
        text: "Upgrade",
        icon: "ChevronsUp",
        className: "bg-blue-600 text-white rounded-sm m-0 px-1.5",
      };
    case "patch":
      return {
        text: "Patch",
        icon: "Bandage",
        className: "bg-purple-600 text-white rounded-sm m-0 px-1.5",
      };
    case "replace":
      return {
        text: "Replace",
        icon: "Replace",
        className: "bg-yellow-600 text-white rounded-sm m-0 px-1.5",
      };
    case "configuration":
      return {
        text: "Configuration",
        icon: "Wrench",
        className: "bg-yellow-600 text-white rounded-sm m-0 px-1.5",
      };
    case "remove":
      return {
        text: "Remove",
        icon: "Trash",
        className: "bg-gray-500 text-white rounded-sm m-0 px-1.5",
      };
    default:
      return {
        text: fixType,
        icon: "TriangleAlert",
        className: "bg-gray-500 text-white rounded-sm m-0 px-1.5",
      };
  }
};
export const getRemediationPriorityConfig = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "immediate":
      return {
        text: "Immediate",
        icon: "Siren",
        className: "bg-red-600 text-white rounded-sm m-0 px-1.5",
      };
    case "urgent":
      return {
        text: "High",
        icon: "AlertTriangle",
        className: "bg-orange-600 text-white rounded-sm m-0 px-1.5",
      };
    case "medium":
      return {
        text: "Medium",
        icon: "MinusCircle",
        className: "bg-yellow-600 text-white rounded-sm m-0 px-1.5",
      };
    case "low":
      return {
        text: "Low",
        icon: "LightBulb",
        className: "bg-green-600 text-white rounded-sm m-0 px-1.5",
      };
    default:
      return {
        text: priority,
        icon: "BadgeQuestionMarkIcon",
        className: "bg-gray-500 text-white rounded-sm m-0 px-1.5",
      };
  }
};

export const depVulnCount = (deps: Dependency): boolean => {
  return deps.vulnerabilities && deps.vulnerabilities.length ? true : false;
};

String.prototype.toTitleCase = function (): string {
  return this.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
};

export const downloadFixPlanPDF = async (
  fixPlanRef: RefObject<HTMLDivElement | null>
) => {
};