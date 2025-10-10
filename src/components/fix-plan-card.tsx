import { useState, Dispatch, SetStateAction, useEffect, RefObject } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Download, Loader, RefreshCcw, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Badge } from "./ui/badge";
import {
  cn,
  depVulnCount,
  getFixTypeConfig,
  getSeverityConfig,
} from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  ManifestFileContentsApiResponse,
  VulnerabilityFix,
} from "@/constants/constants";
import Image from "next/image";
import toast from "react-hot-toast";
import EmptyCard from "./empty-card";

interface FixPlanCardProps {
  onClose: () => void;
  onDownload: () => void;
  ecosystemOptions?: string[];
  content: Record<string, string>;
  manifestData: ManifestFileContentsApiResponse | null;
  fixPlanError: Record<string, string>;
  fixPlanComplete: boolean;
  isFixPlanLoading: boolean;
  fixPlanRef: RefObject<HTMLDivElement | null>;
  setFixPlanError: Dispatch<SetStateAction<Record<string, string>>>;
  setFixPlanComplete: Dispatch<SetStateAction<boolean>>;
  setManifestData: Dispatch<
    SetStateAction<ManifestFileContentsApiResponse | null>
  >;
  regenerateFixPlan: (regenerateFixPlan: boolean) => void;
}

const FixPlanCard = (props: FixPlanCardProps) => {
  const {
    onClose,
    onDownload,
    content,
    manifestData,
    regenerateFixPlan,
    fixPlanError,
    isFixPlanLoading,
    fixPlanComplete,
    fixPlanRef
  } = props;

  const [showFixPlans, setShowFixPlans] = useState<Record<string, boolean>>({});

  const [isExpandedAll, setIsExpandedAll] = useState(true);

  // const dependencyCount = manifestData
  //   ? Object.values(manifestData.dependencies).flat().length
  //   : 0;

  useEffect(() => {
    //if any one of the values in the object is false, then set isExpandedAll to false
    const isAnyOneSectionClosed = Object.values(showFixPlans).some(
      (v) => v === false
    );
    if (isAnyOneSectionClosed) {
      setIsExpandedAll(false);
    } else {
      setIsExpandedAll(true);
    }
  }, [showFixPlans, setIsExpandedAll]);

  const toggleShowFixPlan = (key: string) => {
    setShowFixPlans((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key], // Default to true (open) if undefined
    }));
  };

  const isOpen = (key: string) => {
    return showFixPlans[key] !== false; // Default to true unless explicitly set to false
  };

  const expandCollapseAll = (expand: boolean) => {
    if (!manifestData?.dependencies) return;

    const newShowFixPlans: Record<string, boolean> = {};

    // Set all file-level items
    Object.entries(manifestData.dependencies).forEach(
      ([filename, dependencies]) => {
        newShowFixPlans[filename] = expand;

        // Set all main dependencies
        dependencies.forEach((dep) => {
          newShowFixPlans[`${dep.name}@${dep.version}`] = expand;

          // Set all transitive dependencies
          if (dep.transitiveDependencies?.nodes) {
            Object.entries(dep.transitiveDependencies.nodes).forEach(
              ([, transDep]) => {
                if (
                  transDep.dependencyType !== "SELF" &&
                  depVulnCount(transDep)
                ) {
                  newShowFixPlans[
                    `${transDep.name}@${transDep.version}@transitive`
                  ] = expand;
                }
              }
            );
          }
        });
      }
    );

    setShowFixPlans(newShowFixPlans);
    setIsExpandedAll(expand);
  };

  const generateFixPlan = (key: string, hasVulnerabilities: boolean) => {
    // No vulnerabilities, so no fix plan
    if (!hasVulnerabilities) {
      return;
    }

    // Fix plan not toggled open
    // if (!isOpen(key)) {
    //   return;
    // }

    key = key.replace("@transitive", "");

    // Check for specific error for this dependency
    if (fixPlanError && fixPlanError[key]) {
      return (
        <div className="p-2 bg-destructive/10 rounded-md">
          <span className="text-sm text-red-500">{fixPlanError[key]}</span>
        </div>
      );
    }

    // If content doesn't exist for this key and loading is not active, show "not processed yet" message
    if (!content[key] && !isFixPlanLoading) {
      return (
        <div className="mt-2 p-2 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            Fix plan couldn&apos;t be generated...
          </span>
        </div>
      );
    }

    // If content doesn't exist for this key but loading is active, show loading
    if (!content[key] && isFixPlanLoading) {
      return (
        <div className="flex items-center gap-2 my-2 p-2 bg-muted rounded-md">
          <Loader className="animate-spin h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            Generating fix plan...
          </span>
        </div>
      );
    }

    // Check if the content is an error message
    if (content[key] && content[key].startsWith("ERROR:")) {
      return (
        <div className="mt-2 p-2 bg-destructive/10 rounded-md overflow-hidden">
          <span className="text-sm text-destructive break-all whitespace-pre-wrap block">
            {content[key].replace("ERROR:", "")}
          </span>
        </div>
      );
    }

    try {
      const fixPlan: VulnerabilityFix = JSON.parse(content[key]);

      if (!fixPlan || Object.keys(fixPlan).length === 0) {
        return (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">
              No fix plan available
            </span>
          </div>
        );
      }

      // Render the actual fix plan data
      return (
        <div className="">
          {fixPlan.fixes.map((fix, index) => (
            <div key={index} className="space-y-2">
              <p>
                <span className="font-semibold">Vulnerability ID:</span>{" "}
                {fix.vulnerability_id}
              </p>
              <p className="flex flex-row gap-x-2">
                Fix Type: {getFixTypeBadge(fix.fix_type)}
              </p>
              {fix.recommended_version && (
                <p>
                  <span className="font-semibold">Recommended Version:</span>{" "}
                  {fix.recommended_version}
                </p>
              )}
              {fix.alternative_packages &&
                fix.alternative_packages.length > 0 && (
                  <p>
                    <span className="font-semibold">Alternative Packages:</span>{" "}
                    {fix.alternative_packages.join(", ")}
                  </p>
                )}
              {fix.fix_command && (
                <p
                  className="cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(fix.fix_command || "");
                    // Optionally, you can add a toast or some feedback to the user
                    toast.success("Fix command copied to clipboard");
                  }}
                >
                  <span className="font-semibold">Fix Command:</span>{" "}
                  <code className="bg-accent-foreground px-2 py-1 rounded">
                    {fix.fix_command}
                  </code>
                </p>
              )}
              <p className="flex flex-row gap-x-2">
                Risk Score:{" "}
                {fix.risk_score
                  ? getSeverityBadge(fix.risk_score.toString())
                  : "N/A"}
              </p>
              <p>
                <span className="font-semibold">Breaking Changes:</span>{" "}
                {fix.breaking_changes ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-semibold">Explanation:</span>{" "}
                {fix.explanation}
              </p>
              {index < fixPlan.fixes.length - 1 && (
                <hr className="my-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      );
    } catch {
      return (
        <div className="mt-2 p-2 bg-destructive/10 rounded-md">
          <span className="text-sm text-destructive">
            Error parsing fix plan...
          </span>
        </div>
      );
    }
  };

  const getSummaryDetails = (key: string) => {
    key = key.replace("@transitive", "");
    // Fix plan not toggled open
    // if (!isOpen(key)) {
    //   return;
    // }
    if (!content[key]) return null;
    if (content[key].startsWith("ERROR:")) {
      return (
        <Badge
          className={cn("text-sm", "bg-red-500 text-white rounded-sm m-0")}
        >
          Error
        </Badge>
      );
    }

    try {
      const fixSummary: VulnerabilityFix = JSON.parse(content[key]);
      if (!fixSummary) return null;

      return (
        <div className="flex flex-row gap-x-1 flex-wrap gap-y-2">
          <Badge className="bg-red-600 text-sm">
            Critical: {fixSummary.summary.critical_count}
          </Badge>
          <Badge className="bg-orange-600 text-sm">
            High: {fixSummary.summary.high_count}
          </Badge>
          <Badge className="bg-yellow-600 text-sm">
            Medium: {fixSummary.summary.medium_count}
          </Badge>
          <Badge className="bg-green-600 text-sm">
            Low: {fixSummary.summary.low_count}
          </Badge>
          {getSeverityBadge(
            fixSummary.summary.overall_risk.toString(),
            "Overall Risk"
          )}
          <Badge className="bg-blue-600 text-sm">
            {fixSummary.summary.urgency}
          </Badge>
        </div>
      );
    } catch {
      return <div className="flex flex-row">Error generating summary...</div>;
    }
  };

  // const getRemediationPriorityBadge = (priority: string, label?: string) => {
  //   const config = getRemediationPriorityConfig(priority);
  //   return (
  //     <Badge className={cn("text-sm", config.className)}>
  //       {label && `${label} :`}
  //       {getIconComponent(config.icon)}
  //       {config.text}
  //     </Badge>
  //   );
  // };

  const getSeverityBadge = (score?: string, label?: string) => {
    const config = getSeverityConfig(score);
    return (
      <Badge className={cn("text-sm", config.className)}>
        {label ? `${label}: ${config.text}` : config.text}
      </Badge>
    );
  };

  const getFixTypeBadge = (fixType: string) => {
    const config = getFixTypeConfig(fixType);
    return (
      <Badge className={cn("text-sm flex flex-row gap-x-2", config.className)}>
        {getIconComponent(config.icon)}
        {config.text}
      </Badge>
    );
  };

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

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/20 backdrop-blur-xs py-4 px-2 sm:p-6">
      <Card className="bg-background border-none text-card w-full h-full sm:max-h-[90vh] flex flex-col gap-0">
        <CardHeader className="sm:px-5 sm:py-4 px-2 py-2 gap-0 bg-muted rounded-t-lg">
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex flex-row items-center gap-x-2">
              <Image
                priority
                src="/genaibutton.svg"
                alt="GenAI Glowing Button"
                width={48}
                height={48}
              />{" "}
              AI Fix Plan
            </div>
            <div className="flex flex-row justify-between space-x-2 sm:space-x-4 lg:space-x-8 xl:space-x-12">
              <Tooltip>
                <TooltipTrigger asChild id="expand-collapse-all">
                  <button onClick={() => expandCollapseAll(!isExpandedAll)}>
                    {isExpandedAll ? (
                      <LucideIcons.EyeOff
                        className={cn("text-muted-foreground cursor-pointer")}
                      />
                    ) : (
                      <LucideIcons.Eye
                        className={cn("text-muted-foreground cursor-pointer")}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isExpandedAll ? "Collapse All" : "Expand All"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild id="regenerate-fix-plan">
                  <button
                    disabled={!fixPlanComplete}
                    onClick={() => regenerateFixPlan(true)}
                  >
                    <RefreshCcw
                      className={cn(
                        fixPlanComplete
                          ? "cursor-pointer"
                          : "text-muted-foreground cursor-not-allowed"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Regenerate Fix Plan</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild id="download-fix-plan">
                  <button disabled={!fixPlanComplete} onClick={onDownload}>
                    <Download
                      className={cn(
                        fixPlanComplete
                          ? "cursor-pointer"
                          : "text-muted-foreground cursor-not-allowed"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download Fix Plan</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild id="close-fix-plan">
                  <X className="cursor-pointer" onClick={onClose} />
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-full gap-0 overflow-y-scroll scrollbar-background-bg scrollbar-background-thumb py-2">
          <div className="pl-3 pr-1 py-2" ref={fixPlanRef}>
            <ul className="list-inside ml-0">
              {manifestData?.dependencies ? (
                Object.entries(manifestData.dependencies).map(
                  ([filename, dependencies]) => {
                    return (
                      <li key={filename} className="mb-4">
                        <span
                          className="font-bold flex flex-row items-center gap-x-1 cursor-pointer py-1"
                          onClick={() => toggleShowFixPlan(filename)}
                        >
                          {isOpen(filename) ? (
                            <LucideIcons.ChevronDownCircle
                              strokeWidth={2}
                              size={28}
                              className="cursor-pointer"
                            />
                          ) : (
                            <LucideIcons.ChevronRightCircle
                              strokeWidth={2}
                              size={28}
                              className="cursor-pointer"
                            />
                          )}
                          {filename}
                        </span>
                        {isOpen(filename) && (
                          <ul className="sm:ml-5 ml-1 py-3">
                            {dependencies.map((dep) => {
                              return (
                                <li
                                  className="gap-y-2 w-full relative"
                                  key={`${dep.name}@${dep.version}`}
                                >
                                  <div className="flex flex-row justify-between items-start">
                                    <span
                                      className="flex-1 flex relative flex-row gap-x-1 cursor-pointer"
                                      onClick={() =>
                                        toggleShowFixPlan(
                                          `${dep.name}@${dep.version}`
                                        )
                                      }
                                    >
                                      <span className="">
                                        {isOpen(
                                          `${dep.name}@${dep.version}`
                                        ) ? (
                                          <LucideIcons.ChevronsDown
                                            strokeWidth={2}
                                            className=""
                                          />
                                        ) : (
                                          <LucideIcons.ChevronsRight
                                            strokeWidth={2}
                                            className=""
                                          />
                                        )}
                                      </span>
                                      {dep.name} - {dep.version}
                                    </span>
                                    {depVulnCount(dep) && (
                                      <span className="text-sm text-muted-foreground mx-1 flex-shrink-0">
                                        {dep.vulnerabilities!.length}{" "}
                                        vulnerabilities
                                      </span>
                                    )}
                                  </div>
                                  {isOpen(`${dep.name}@${dep.version}`) &&
                                    depVulnCount(dep) && (
                                      <div className="ml-1 my-3 p-3 bg-muted rounded-md flex flex-col gap-y-2">
                                        {getSummaryDetails(
                                          `${dep.name}@${dep.version}`
                                        )}
                                        {generateFixPlan(
                                          `${dep.name}@${dep.version}`,
                                          (dep.vulnerabilities?.length || 0) > 0
                                        )}
                                      </div>
                                    )}
                                  <ul className="ml-2 py-3">
                                    {isOpen(`${dep.name}@${dep.version}`) &&
                                      dep.transitiveDependencies?.nodes &&
                                      Object.entries(
                                        dep.transitiveDependencies?.nodes
                                      ).map(([, transDep]) => {
                                        return (
                                          transDep.dependencyType !== "SELF" &&
                                          depVulnCount(transDep) && (
                                            <li
                                              key={`${transDep.name}@${transDep.version}@transitive`}
                                              className="text-sm relative py-1"
                                            >
                                              <div className="flex justify-between items-start">
                                                <span
                                                  className="flex flex-row items-center gap-x-1 cursor-pointer"
                                                  onClick={() =>
                                                    toggleShowFixPlan(
                                                      `${transDep.name}@${transDep.version}@transitive`
                                                    )
                                                  }
                                                >
                                                  <span className="">
                                                    {isOpen(
                                                      `${transDep.name}@${transDep.version}@transitive`
                                                    ) ? (
                                                      <LucideIcons.ChevronDown
                                                        strokeWidth={2}
                                                        size={18}
                                                        className=""
                                                      />
                                                    ) : (
                                                      <LucideIcons.ChevronRight
                                                        strokeWidth={2}
                                                        size={18}
                                                        className=""
                                                      />
                                                    )}
                                                  </span>
                                                  {transDep.name} -{" "}
                                                  {transDep.version}
                                                </span>
                                                {depVulnCount(transDep) && (
                                                  <span className="text-xs text-muted-foreground mx-1 flex-shrink-0">
                                                    {
                                                      transDep.vulnerabilities!
                                                        .length
                                                    }{" "}
                                                    vulnerabilities
                                                  </span>
                                                )}
                                              </div>
                                              {isOpen(
                                                `${transDep.name}@${transDep.version}@transitive`
                                              ) &&
                                                depVulnCount(transDep) && (
                                                  <div className="my-4 p-3 bg-muted rounded-md flex flex-col gap-y-2">
                                                    {getSummaryDetails(
                                                      `${transDep.name}@${transDep.version}@transitive`
                                                    )}
                                                    {generateFixPlan(
                                                      `${transDep.name}@${transDep.version}@transitive`,
                                                      (transDep.vulnerabilities
                                                        ?.length || 0) > 0
                                                    )}
                                                  </div>
                                                )}
                                            </li>
                                          )
                                        );
                                      })}
                                  </ul>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }
                )
              ) : (
                <div className="w-full flex items-center justify-center flex-col flex-grow">
                  <EmptyCard size={400} />
                </div>
              )}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="px-4">
          <p className={cn("text-sm", "italic text-foreground pb-4")}>
            *AI results can be inaccurate. Always verify before taking action.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FixPlanCard;
