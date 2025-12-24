import { Dependency } from "@/constants/model";
import { cn, getRemediationPriorityConfig } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { 
  AlertTriangle, 
  LightbulbIcon as LightBulb,
  MinusCircle,
  Siren,
  type LucideIcon 
} from "lucide-react";
import { Progress } from "../ui/progress";
import { useEffect, useRef, useState } from "react";
import { PROGRESS_MESSAGES } from "@/constants/constants";

interface DependencyAIDetailsProps {
  dependency: Dependency | undefined;
  isMobile?: boolean;
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
    isMobile,
    error,
    isLoading,
    summary,
    handleCopy,
    getSeverityBadge,
  } = props;

  const [progress, setProgress] = useState<number>(0);
  const [finalised, setFinalised] = useState<boolean>(false);
  const [dots, setDots] = useState<string>("");
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [message, setMessage] = useState<string>("Finalizing summary");
  const count = useRef(0);
  const cyclingStarted = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  useEffect(() => {
    if (isLoading) {
      setFinalised(false);
      setProgress(0);
      setMessage("Finalizing summary");
      setTimeElapsed(0);
      count.current = 0;
      cyclingStarted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }

      const getRandomValueInRange = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };

      const updateProgress = () => {
        setProgress((prevProgress) => {
          if (prevProgress <= 30)
            return Math.min(prevProgress + getRandomValueInRange(15, 20), 90);
          if (prevProgress <= 60)
            return Math.min(prevProgress + getRandomValueInRange(5, 10), 90);
          if (prevProgress < 90)
            return Math.min(prevProgress + getRandomValueInRange(3, 7), 90);
          return prevProgress;
        });
      };

      const interval = setInterval(
        updateProgress,
        getRandomValueInRange(1000, 2000)
      );

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoading]);

  useEffect(() => {
    if (summary) {
      setProgress(100);
      const timer = setTimeout(() => {
        setFinalised(true);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [summary]);

  useEffect(() => {
    const interval = setTimeout(() => {
      setDots((prev) => {
        const newDots = prev.length >= 3 ? "" : prev + ".";
        return newDots;
      });
    }, 750);

    return () => clearTimeout(interval);
  }, [dots]);

  // Track time elapsed while loading
  useEffect(() => {
    let startTime: number;
    let interval: NodeJS.Timeout;
    if(progress >= 90 && !finalised)
    {
      startTime = Date.now();
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if(interval) clearInterval(interval);
    }
  }, [finalised, progress]);

  //cycle messages after reaching 90% progress (when generation taking longer than 3 second)
  useEffect(() => {
    if (progress >= 90 && !finalised && timeElapsed >= 2000 && !cyclingStarted.current) {
      cyclingStarted.current = true;
      setMessage(PROGRESS_MESSAGES[count.current % PROGRESS_MESSAGES.length]);
      count.current++;
      intervalRef.current = setInterval(() => {
        setMessage(PROGRESS_MESSAGES[count.current % PROGRESS_MESSAGES.length]);
        count.current++;
      }, 2000);
    }
    return () => {
      if (finalised && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [progress, timeElapsed, finalised]);

  if (
    !dependency ||
    !dependency.vulnerabilities ||
    dependency.vulnerabilities.length === 0
  ) {
    return <div className="pt-12 px-4">No dependency details available</div>;
  }

  const parsedSummary = summary ? JSON.parse(summary) : null;

  const iconMap: Record<string, LucideIcon> = {
    Siren,
    AlertTriangle,
    MinusCircle,
    LightBulb,
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || null;

    return IconComponent ? (
      <IconComponent className="h-8 w-8" size={24} strokeWidth={3} />
    ) : null;
  };

  const getRemediationPriorityBadge = (priority: string) => {
    const config = getRemediationPriorityConfig(priority);
    return (
      <Badge className={cn(isMobile ? "text-sm" : "text-xs", config.className)}>
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
            isMobile ? "text-sm" : "text-xs",
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
          isMobile ? "text-sm" : "text-xs",
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
            isMobile ? "text-sm" : "text-xs",
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
          isMobile ? "text-sm" : "text-xs",
          "bg-amber-700 text-white rounded-sm m-0"
        )}
      >
        {"Vector: " + vector.toTitleCase()}
      </Badge>
    );
  };

  return (
    <div className="px-4 h-full w-full">
      {!finalised ? (
        <div className="flex flex-col items-center justify-center h-full">
          <Progress value={progress} className="my-2 max-w-[75%]" />
          <div className="flex flex-row items-center text-sm">
            <span>{progress < 90 ? "Generating AI Summary" : message}</span>
            <span className="inline-block w-4 text-left">{dots}</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center h-full flex flex-col items-center justify-center gap-4">
          <AlertTriangle size={96} />
          {error}
        </div>
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
              <p
                className={cn(
                  isMobile ? "text-sm" : "text-md",
                  "font-bold text-input mb-1"
                )}
              >
                Remediation Actions
              </p>
              <div className={cn(isMobile ? "text-xs" : "text-sm")}>
                {parseListItems(parsedSummary?.recommended_actions || [])}
              </div>
            </div>
            <div className="mb-4">
              <p
                className={cn(
                  isMobile ? "text-sm" : "text-md",
                  "font-bold text-input mb-1"
                )}
              >
                Summary
              </p>
              <p className={cn(isMobile ? "text-xs" : "text-sm")}>
                {parseText(parsedSummary?.summary)}
              </p>
            </div>
            <div className="mb-4">
              <p
                className={cn(
                  isMobile ? "text-sm" : "text-md",
                  "font-bold text-input mb-1"
                )}
              >
                Impact
              </p>
              <p className={cn(isMobile ? "text-xs" : "text-sm")}>
                {parseText(parsedSummary?.impact)}
              </p>
            </div>
            <div className="mb-4">
              <p
                className={cn(
                  isMobile ? "text-sm" : "text-md",
                  "font-bold text-input mb-1"
                )}
              >
                Affected Components
              </p>
              <div className={cn(isMobile ? "text-sm" : "text-xs")}>
                {parseListItems(parsedSummary?.affected_components) || []}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <p
              className={cn(
                isMobile ? "text-sm" : "text-md",
                "font-bold text-input mb-1"
              )}
            >
              Risk Score Justification
            </p>
            <div className={cn(isMobile ? "text-xs" : "text-sm")}>
              {parseListItems(parsedSummary?.risk_score_justification)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyAIDetails;
