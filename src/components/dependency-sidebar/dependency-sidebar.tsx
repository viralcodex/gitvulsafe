import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Dependency, GraphNode, Vulnerability } from "@/constants/constants";
import removeMarkdown from "remove-markdown";
import {
  Check,
  Copy,
  Download,
  Maximize,
  Minimize,
  RefreshCcw,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Badge } from "../ui/badge";
import { cn, getSeverityConfig } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DependencyDetails from "@/components/dependency-sidebar/dependency-details";
import DependencyAIDetails from "./dependency-ai-details";
import { getAiVulnerabilitiesSummary } from "@/lib/api";
import Image from "next/image";
import { useTextSelection } from "@/providers/text-selection-provider";

interface DependencyDetailsProps {
  node: GraphNode;
  dependencies: { [technology: string]: Dependency[] };
  isMobile?: boolean;
  isOpen?: boolean;
  isSidebarExpanded: boolean;
  isDiagramExpanded?: boolean;
  onClose?: () => void;
  setIsMobile?: (isMobile: boolean) => void;
  setIsSidebarExpanded: (expanded: boolean) => void;
  setIsDiagramExpanded?: (expanded: boolean) => void;
}

const DependencyDetailsCard = (props: DependencyDetailsProps) => {
  const {
    node,
    dependencies,
    onClose,
    isSidebarExpanded,
    isDiagramExpanded,
    setIsSidebarExpanded,
    isMobile,
  } = props;

  const { setSelectedDependency } = useTextSelection();
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<string>("Vuln_details");

  let transitiveNodeDetails: Dependency | undefined;
  let matchedTransitiveNode: Dependency | undefined;

  const directDep = dependencies[node.ecosystem!]?.find(
    (dep) => `${dep.name}@${dep.version}` === node.id
  );

  if (!directDep) {
    matchedTransitiveNode = Object.values(dependencies[node.ecosystem!])
      .flat()
      .find((dep) =>
        dep.transitiveDependencies?.nodes?.some(
          (transDep) => `${transDep.name}@${transDep.version}` === node.id
        )
      );
    if (matchedTransitiveNode) {
      transitiveNodeDetails =
        matchedTransitiveNode.transitiveDependencies?.nodes?.find(
          (transDep) => `${transDep.name}@${transDep.version}` === node.id
        );
    }
  }

  // console.log(
  //   "Extra Node Details:",
  //   directDep,
  //   extraTransitiveNodeDetails,
  //   matchedTransitiveNode
  // );

  const allDetails =
    transitiveNodeDetails ?? matchedTransitiveNode ?? directDep;

  // console.log("All Details:", allDetails);

  // Set the selected dependency in context whenever allDetails changes
  useEffect(() => {
    if (allDetails) {
      setSelectedDependency(allDetails);
    }
    return () => {
      setSelectedDependency(undefined); // Clean up when component unmounts
    };
  }, [allDetails, setSelectedDependency]);

  //group references by type
  const processedVulns = allDetails?.vulnerabilities?.map((vuln) => {
    const groupedRefs: { [type: string]: string[] } = {};
    if (vuln.references && vuln.references.length > 0) {
      vuln.references.forEach((ref) => {
        if (!groupedRefs[ref.type]) groupedRefs[ref.type] = [];
        groupedRefs[ref.type].push(ref.url);
      });
    }
    return { ...vuln, groupedRefs };
  });

  // Generate overall details text for copy/download
  const overallText = [
    `Dependency: ${node.label} (${node.version || "unknown"})`,
    ...(processedVulns ?? []).map((vuln, idx) => {
      let vulnText = `\nVulnerability ${idx + 1}:`;
      vulnText += `\nSummary: ${
        vuln.summary ? removeMarkdown(vuln.summary) : "No summary available"
      }`;
      vulnText += `\nDetails: ${
        vuln.details ? removeMarkdown(vuln.details) : "No details available"
      }`;
      if (vuln.severityScore) {
        vulnText += `\nSeverity:`;
        vulnText += `\n  CVSS V3 Score: ${vuln.severityScore.cvss_v3 || "N/A"}`;
        vulnText += `\n  CVSS V4 Score: ${vuln.severityScore.cvss_v4 || "N/A"}`;
      }
      if (vuln.references && Object.keys(vuln.groupedRefs).length > 0) {
        vulnText += `\nReferences:`;
        Object.entries(vuln.groupedRefs).forEach(([type, urls]) => {
          vulnText += `\n  ${type}:`;
          urls.forEach((url) => {
            vulnText += `\n    ${url}`;
          });
        });
      }
      return vulnText;
    }),
  ].join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(overallText);
    setIsCopied(true);
    toast.success("Copied to clipboard!");
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  const fetchSummary = useCallback(async () => {
    if (
      !allDetails ||
      !allDetails.vulnerabilities ||
      allDetails.vulnerabilities.length === 0
    ) {
      setError("No vulnerabilities available for this dependency");
      return;
    }
    setIsLoading(true);
    setError(null);

    const vulnerabilities = {
      name: allDetails?.name,
      version: allDetails?.version,
      vulnerabilities: allDetails?.vulnerabilities?.map(
        (vuln: Vulnerability) => {
          return {
            ...vuln,
            affected: vuln.affected?.map((affected) => ({
              ...affected,
              versions: [],
            })),
          };
        }
      ),
    };
    try {
      const response = await getAiVulnerabilitiesSummary(vulnerabilities);
      setSummary(response);
      sessionStorage.setItem(
        `ai-summary-${allDetails.name}@${allDetails.version}`,
        response
      );
    } catch (err) {
      setError("Failed to fetch AI summary: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [allDetails]);

  useEffect(() => {
    const cachedSummary = sessionStorage.getItem(
      `ai-summary-${allDetails?.name}@${allDetails?.version}`
    );
    if (cachedSummary) {
      setSummary(cachedSummary);
      setIsLoading(false);
      return;
    }
    if (!allDetails || !allDetails.vulnerabilities) {
      setError("No vulnerabilities available for this dependency");
      return;
    }
    fetchSummary();
  }, [allDetails, fetchSummary]);

  const downloadDetails = () => {
    const blob = new Blob([overallText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${node.label}-dependency-details.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: number) => {
    if (!severity) return "bg-gray-500";
    const numericSeverity = severity;
    if (numericSeverity >= 9.0) return "bg-red-600";
    if (numericSeverity >= 7.0) return "bg-orange-600";
    if (numericSeverity >= 4.0) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getSeverityBadge = (score?: string) => {
    const config = getSeverityConfig(score);
    return (
      <Badge
        className={cn(
          isSidebarExpanded ? "text-sm" : "text-xs",
          config.className
        )}
      >
        {config.text}
      </Badge>
    );
  };

  if (!node) {
    return <div className="text-center">No dependency selected</div>;
  }

  return (
    <div
      className={cn(
        "absolute right-0 flex flex-col",
        isSidebarExpanded
          ? isMobile
            ? "w-full p-1 h-[calc(100vh-4rem)] pr-1"
            : "w-[35%] p-1 h-[calc(100vh-4rem)] pr-1"
          : isMobile
            ? "w-full p-1 top-1/3 pr-1"
            : isDiagramExpanded ? "top-1/4" : "top-[260px]" ,"z-10 p-1 pr-1"
      )}
    >
      <Card
        className={cn(
          "bg-background border-none text-accent p-0 gap-0 relative rounded-lg",
          isSidebarExpanded
            ? isMobile
              ? "h-[92vh]"
              : "h-[100%]"
            : isMobile
              ? "h-[66vh]"
              : "w-[400px] h-[calc(100vh-17rem)]"
        )}
      >
        <CardHeader
          className={cn(
            getSeverityColor(node.severity!),
            "font-bold px-4 py-3 rounded-t-lg border-b-1"
          )}
        >
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col items-start w-[50%]">
              <p>{node.label.toTitleCase()} </p>
              <p className="text-xs text-accent">{node.version}</p>
            </div>
            <div className="flex flex-row gap-2 w-[50%] justify-end">
              {isCopied ? (
                <Check className="cursor-pointer" color="white" />
              ) : (
                <Copy
                  className="cursor-pointer"
                  onClick={handleCopy}
                  color="white"
                />
              )}
              <Download
                className="cursor-pointer"
                onClick={downloadDetails}
                color="white"
              />
              {isSidebarExpanded ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Minimize
                      className="cursor-pointer"
                      onClick={() => {
                        setIsSidebarExpanded(false);
                      }}
                      color="white"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Collapse</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Maximize
                      className="cursor-pointer"
                      onClick={() => {
                        setIsSidebarExpanded(true);
                      }}
                      color="white"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Expand</TooltipContent>
                </Tooltip>
              )}
              <X className="cursor-pointer" onClick={onClose} color="white" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-0 gap-0 whitespace-normal break-words overflow-y-auto w-full h-full">
          <Tabs
            defaultValue="Vuln_details"
            className="w-auto h-full flex flex-col"
          >
            <div className="flex flex-row items-center justify-between">
              <TabsList className="rounded-t-none sticky top-0 z-10 mx-2 flex flex-row gap-2">
                <TabsTrigger
                  value="Vuln_details"
                  onClick={() => setTabValue("Vuln_details")}
                  className="rounded-t-none cursor-pointer w-fit"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="AI_vuln_details"
                  onClick={() => setTabValue("AI_vuln_details")}
                  className="rounded-t-none cursor-pointer flex items-center px-5 font-semibold"
                >
                  <Image
                    src={"genai.svg"}
                    alt="AI Icon"
                    width={24}
                    height={24}
                    className=""
                  />
                  AI Fix Plan
                </TabsTrigger>
              </TabsList>
              {tabValue === "AI_vuln_details" && (
                <div className="flex flex-row justify-end mt-1 mr-4">
                  <Tooltip>
                    <TooltipTrigger asChild className="">
                      <RefreshCcw
                        size={24}
                        className="cursor-pointer bg-background rounded-sm"
                        onClick={fetchSummary}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Refresh AI Response</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-background-bg scrollbar-background-thumb">
              <TabsContent value="Vuln_details" className="mt-0">
                <DependencyDetails
                  processedVulns={processedVulns}
                  allDetails={allDetails}
                  getSeverityBadge={getSeverityBadge}
                  transitiveNodeDetails={transitiveNodeDetails}
                  matchedTransitiveNode={matchedTransitiveNode}
                  isSidebarExpanded={isSidebarExpanded}
                />
              </TabsContent>
              <TabsContent value="AI_vuln_details" className="mt-0">
                <DependencyAIDetails
                  dependency={allDetails}
                  isSidebarExpanded={isSidebarExpanded}
                  error={error}
                  isLoading={isLoading}
                  summary={summary}
                  isCopied={isCopied}
                  setIsCopied={setIsCopied}
                  handleCopy={handleCopy}
                  getSeverityBadge={getSeverityBadge}
                  setError={setError}
                  setIsLoading={setIsLoading}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        <CardFooter className="p-2">
          <p
            className={cn(
              isSidebarExpanded ? "text-sm" : "text-xs",
              "italic text-foreground px-2"
            )}
          >
            *AI results can be inaccurate. Always verify before taking action.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DependencyDetailsCard;
