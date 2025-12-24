import React, { RefObject } from 'react';
import { 
  ChevronDownCircle, 
  ChevronRightCircle, 
  ChevronsDown, 
  ChevronsRight, 
  Loader, 
  ChevronDown, 
  ChevronRight,
  ChevronsUp,
  Bandage as BandageIcon,
  Replace as ReplaceIcon,
  Wrench,
  Trash2 as Trash,
  TriangleAlert,
  type LucideIcon 
} from "lucide-react";
import { Badge } from "../ui/badge";
import {
  cn,
  depVulnCount,
  getFixTypeConfig,
  getSeverityConfig,
} from "@/lib/utils";
import {
  ManifestFileContentsApiResponse,
  VulnerabilityFix,
} from "@/constants/model";
import toast from "react-hot-toast";
import EmptyCard from '../empty-card';

interface IndividualFixPlanProps {
  fixPlanRef: RefObject<HTMLDivElement | null>;
  manifestData: ManifestFileContentsApiResponse | null;
  fixPlan: Record<string, string>;
  fixPlanError: Record<string, string>;
  isFixPlanLoading: boolean;
  toggleShowFixPlan: (key: string) => void;
  isOpen: (key: string) => boolean;
}

const IndividualFixPlan = ({
  fixPlanRef,
  manifestData,
  fixPlan,
  fixPlanError,
  isFixPlanLoading,
  toggleShowFixPlan,
  isOpen,
}: IndividualFixPlanProps) => {
  
  const generateFixPlan = (key: string, hasVulnerabilities: boolean) => {
    // No vulnerabilities, so no fix plan
    if (!hasVulnerabilities) {
      return;
    }

    key = key.replace("@transitive", "");

    // Check for specific error for this dependency
    if (fixPlanError && fixPlanError[key]) {
      return (
        <div className="p-2 bg-destructive/10 rounded-md">
          <span className="text-sm text-red-500">{fixPlanError[key]}</span>
        </div>
      );
    }

    // If fixPlan doesn't exist for this key and loading is not active, show "not processed yet" message
    if (!fixPlan[key] && !isFixPlanLoading) {
      return (
        <div className="mt-2 p-2 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            Fix plan couldn&apos;t be generated...
          </span>
        </div>
      );
    }

    // If fixPlan doesn't exist for this key but loading is active, show loading
    if (!fixPlan[key] && isFixPlanLoading) {
      return (
        <div className="flex items-center gap-2 my-2 p-2 bg-muted rounded-md">
          <Loader className="animate-spin h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            Generating fix plan...
          </span>
        </div>
      );
    }

    // Check if the fixPlan is an error message
    if (fixPlan[key] && fixPlan[key].startsWith("ERROR:")) {
      return (
        <div className="mt-2 p-2 bg-destructive/10 rounded-md overflow-hidden">
          <span className="text-sm text-destructive break-all whitespace-pre-wrap block">
            {fixPlan[key].replace("ERROR:", "")}
          </span>
        </div>
      );
    }

    try {
      const fixPlans: VulnerabilityFix = JSON.parse(fixPlan[key]);

      if (!fixPlans || Object.keys(fixPlans).length === 0) {
        return (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">
              No fix plan available
            </span>
          </div>
        );
      }

      // Check if fixes array exists
      if (!fixPlans.fixes || !Array.isArray(fixPlans.fixes)) {
        return (
          <div className="mt-2 p-2 bg-destructive/10 rounded-md">
            <span className="text-sm text-destructive">
              Invalid fix plan structure: missing fixes array
            </span>
            <details className="mt-2">
              <summary className="text-xs cursor-pointer">Raw data</summary>
              <pre className="text-xs mt-1 whitespace-pre-wrap">
                {JSON.stringify(fixPlans, null, 2)}
              </pre>
            </details>
          </div>
        );
      }

      // Render the actual fix plan data
      return (
        <div className="">
          {fixPlans.fixes.map((fix, index) => (
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
                <p className="cursor-pointer">
                  <span className="font-semibold">Fix Command:</span>{" "}
                  <code
                    className="bg-accent-foreground px-2 py-1 rounded"
                    onClick={() => {
                      navigator.clipboard.writeText(fix.fix_command || "");
                      toast.success("Fix command copied to clipboard");
                    }}
                  >
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
              {index < fixPlans.fixes.length - 1 && (
                <hr className="my-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      return (
        <div className="mt-2 p-2 bg-destructive/10 rounded-md">
          <span className="text-sm text-destructive">
            Error parsing fix plan: {error instanceof Error ? error.message : 'Unknown error'}
          </span>
        </div>
      );
    }
  };

  const getSummaryDetails = (key: string) => {
    key = key.replace("@transitive", "");
    if (!fixPlan[key]) return null;
    if (fixPlan[key].startsWith("ERROR:")) {
      return (
        <Badge
          className={cn("text-sm", "bg-red-500 text-white rounded-sm m-0")}
        >
          Error
        </Badge>
      );
    }

    try {
      const fixSummary: VulnerabilityFix = JSON.parse(fixPlan[key]);
      if (!fixSummary) return null;

      // Check if summary exists
      if (!fixSummary.summary) {
        return (
          <Badge className={cn("text-sm", "bg-red-500 text-white rounded-sm m-0")}>
            No Summary Available
          </Badge>
        );
      }

      return (
        <div className="flex flex-row gap-x-1 flex-wrap gap-y-2">
          <Badge className="bg-red-600 text-sm">
            Critical: {fixSummary.summary.critical_count || 0}
          </Badge>
          <Badge className="bg-orange-600 text-sm">
            High: {fixSummary.summary.high_count || 0}
          </Badge>
          <Badge className="bg-yellow-600 text-sm">
            Medium: {fixSummary.summary.medium_count || 0}
          </Badge>
          <Badge className="bg-green-600 text-sm">
            Low: {fixSummary.summary.low_count || 0}
          </Badge>
          {getSeverityBadge(
            fixSummary.summary.overall_risk?.toString() || "0",
            "Overall Risk"
          )}
          <Badge className="bg-blue-600 text-sm">
            {fixSummary.summary.urgency || "N/A"}
          </Badge>
        </div>
      );
    } catch (error) {
      return <div className="flex flex-row text-xs text-destructive">Error generating summary: {error instanceof Error ? error.message : 'Unknown error'}</div>;
    }
  };

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

  const iconMap: Record<string, LucideIcon> = {
    ChevronsUp,
    Bandage: BandageIcon,
    Replace: ReplaceIcon,
    Wrench,
    Trash,
    TriangleAlert,
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || null;

    return IconComponent ? (
      <IconComponent className="h-8 w-8" size={24} strokeWidth={3} />
    ) : null;
  };

  return (
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
                      <ChevronDownCircle
                        strokeWidth={2}
                        size={28}
                        className="cursor-pointer"
                      />
                    ) : (
                      <ChevronRightCircle
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
                                  {isOpen(`${dep.name}@${dep.version}`) ? (
                                    <ChevronsDown
                                      strokeWidth={2}
                                      className=""
                                    />
                                  ) : (
                                    <ChevronsRight
                                      strokeWidth={2}
                                      className=""
                                    />
                                  )}
                                </span>
                                {dep.name} - {dep.version}
                              </span>
                              {depVulnCount(dep) && (
                                <span className="text-sm text-muted-foreground mx-1 flex-shrink-0">
                                  {dep.vulnerabilities!.length} vulnerabilities
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
                                                <ChevronDown
                                                  strokeWidth={2}
                                                  size={18}
                                                  className=""
                                                />
                                              ) : (
                                                <ChevronRight
                                                  strokeWidth={2}
                                                  size={18}
                                                  className=""
                                                />
                                              )}
                                            </span>
                                            {transDep.name} - {transDep.version}
                                          </span>
                                          {depVulnCount(transDep) && (
                                            <span className="text-xs text-muted-foreground mx-1 flex-shrink-0">
                                              {transDep.vulnerabilities!.length}{" "}
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
        <div className="flex flex-row items-center justify-center text-muted-foreground italic">
          ~~~~~ Wish you a good day :) ~~~~~
        </div>
      </ul>
    </div>
  );
}

export default IndividualFixPlan