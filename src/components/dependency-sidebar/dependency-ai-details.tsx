import { Dependency } from "@/constants/constants";
import { cn, getRemediationPriorityConfig } from "@/lib/utils";
import { Badge } from "../ui/badge";
import * as LucideIcons from "lucide-react";

interface DependencyAIDetailsProps {
  dependency: Dependency | undefined;
  isSidebarExpanded?: boolean;
  error: string | null;
  isLoading: boolean;
  summary: string | null;
  isCopied: boolean;
  setIsCopied: (copied: boolean) => void;
  handleCopy: () => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  getSeverityBadge: (score: string) => React.ReactNode;
}

const DependencyAIDetails = (props: DependencyAIDetailsProps) => {
  const {
    dependency,
    isSidebarExpanded,
    error,
    isLoading,
    summary,
    handleCopy,
    getSeverityBadge,
  } = props;

  if (
    !dependency ||
    !dependency.vulnerabilities ||
    dependency.vulnerabilities.length === 0
  ) {
    return <div className="pt-12 px-4">No dependency details available</div>;
  }

  console.log("AI Summary:", summary);

  const parsedSummary = summary ? JSON.parse(summary) : null;

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconName
      ? (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[
          iconName
        ]
      : null;

    return IconComponent ? (
      <IconComponent className="h-8 w-8" size={24} strokeWidth={3} />
    ) : null;
  };

  const getRemediationPriorityBadge = (priority: string) => {
    const config = getRemediationPriorityConfig(priority);
    return (
      <Badge
        className={cn(
          isSidebarExpanded ? "text-sm" : "text-xs",
          config.className
        )}
      >
        {getIconComponent(config.icon)}
        {config.text}
      </Badge>
    );
  };

  const getTimelineBadge = (timeline: string) => {
    timeline = timeline.split(",.")[0].trim();
    if (!timeline || timeline.toLowerCase() === "n/a") {
      return (
        <Badge
          className={cn(
            isSidebarExpanded ? "text-sm" : "text-xs",
            "bg-gray-500 text-white rounded-sm m-0"
          )}
        >
          N/A
        </Badge>
      );
    }
    return (
      <Badge
        className={cn(
          isSidebarExpanded ? "text-sm" : "text-xs",
          "bg-blue-600 text-white rounded-sm m-0"
        )}
      >
        {timeline.toTitleCase()}
      </Badge>
    );
  };

  const parseListItems = (actions: string[]) => {
    if (!actions || actions.length === 0) return "No actions available";
    return (
      <ul className="pl-4 list-disc flex-wrap">
        {actions.map((action, idx) => {
          const processedAction = action.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
          );
          const parts = processedAction.split(/(<code>.*?<\/code>)/g);
          return (
            <li key={idx} className="mb-1">
              {parts.map((part, i) => {
                if (part.startsWith("<code>") && part.endsWith("</code>")) {
                  const code = part.replace(/<\/?code>/g, "");
                  return (
                    <span
                      key={i}
                      className="w-fit flex flex-row flex-wrap items-center my-1 bg-accent-foreground rounded-sm cursor-pointer"
                      onClick={handleCopy}
                    >
                      <pre className="inline px-2 py-2 text-xs font-mono">
                        <code className="inline">{code}</code>
                      </pre>
                    </span>
                  );
                } else {
                  const cleanedPart = part.replace(/^[.,;:!?]\s*/, "");
                  return (
                    <span
                      key={i}
                      dangerouslySetInnerHTML={{
                        __html: cleanedPart,
                      }}
                    />
                  );
                }
              })}
            </li>
          );
        })}
      </ul>
    );
  };

  const parseText = (text: string) => {
    if (!text) return "No text available";
    // Replace **bold** with <strong>bold</strong>
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
        }}
      />
    );
  };

  const getExploitVectorBadge = (vector: string) => {
    if (!vector || vector.toLowerCase() === "n/a") {
      return (
        <Badge
          className={cn(
            isSidebarExpanded ? "text-sm" : "text-xs",
            "bg-gray-500 text-white rounded-sm m-0"
          )}
        >
          N/A
        </Badge>
      );
    }
    return (
      <Badge
        className={cn(
          isSidebarExpanded ? "text-sm" : "text-xs",
          "bg-amber-700 text-white rounded-sm m-0"
        )}
      >
        {"Vector: " + vector.toTitleCase()}
      </Badge>
    );
  };

  return (
    <div className="px-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-full w-full">
          Loading AI summary...
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <div>
          <div className="mb-4">
            <div className="flex flex-row gap-x-2 mb-2 flex-wrap gap-y-2">
              {getSeverityBadge(parsedSummary?.risk_score)}
              {getRemediationPriorityBadge(
                parsedSummary?.remediation_priority || "N/A"
              )}
              {getTimelineBadge(parsedSummary?.timeline_estimate || "N/A")}
              {getExploitVectorBadge(parsedSummary?.exploit_vector || "N/A")}
            </div>
            <div className="mb-4">
              <p className="text-md font-bold text-input mb-1">
                Remediation Actions
              </p>
              <div className={cn(isSidebarExpanded ? "text-sm" : "text-xs")}>
                {parseListItems(parsedSummary?.recommended_actions || [])}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-md font-bold text-input mb-1">Summary</p>
              <p className={cn(isSidebarExpanded ? "text-sm" : "text-xs")}>
                {parseText(parsedSummary?.summary)}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-md font-bold text-inpu mb-1">Impact</p>
              <p className={cn(isSidebarExpanded ? "text-sm" : "text-xs")}>
                {parseText(parsedSummary?.impact)}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-md font-bold text-input mb-1">
                Affected Components
              </p>
              <div className={cn(isSidebarExpanded ? "text-sm" : "text-xs")}>
                {parseListItems(parsedSummary?.affected_components) || []}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-md font-bold text-inpu mb-1">
              Risk Score Justification
            </p>
            <div className={cn(isSidebarExpanded ? "text-sm" : "text-xs")}>
              {parseListItems(parsedSummary?.risk_score_justification)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyAIDetails;
