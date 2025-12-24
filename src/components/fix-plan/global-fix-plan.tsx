import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  GlobalAnalysisData,
  OptimisationData,
  ConflictResolutionData,
} from "../../constants/model";

interface GlobalFixPlanProps {
  globalFixPlan?: string;
  optimisationPlan?: string;
  conflictResolutionPlan?: string;
  isFixPlanLoading?: boolean;
}

const GlobalFixPlan = (props: GlobalFixPlanProps) => {
  const {
    globalFixPlan,
    optimisationPlan,
    conflictResolutionPlan,
    isFixPlanLoading,
  } = props;

  const [globalFixPlanObj, setGlobalFixPlanObj] = useState<GlobalAnalysisData>(
    {}
  );
  const [optimisationPlanObj, setOptimisationPlanObj] =
    useState<OptimisationData>({});
  const [conflictResolutionPlanObj, setConflictResolutionPlanObj] =
    useState<ConflictResolutionData>({});

  // Update parsed objects when props change
  useEffect(() => {
    if (globalFixPlan) {
      try {
        // Check if it's already an object or needs parsing
        let parsed;
        if (typeof globalFixPlan === "string") {
          // Clean up markdown formatting if present
          let cleanedData = globalFixPlan;

          // Remove markdown code fences if present
          if (cleanedData.includes("```json")) {
            cleanedData = cleanedData
              .replace(/```json\s*/g, "")
              .replace(/\s*```/g, "");
          }

          // Try parsing once
          parsed = JSON.parse(cleanedData);

          // If the result is still a string, parse again (double-encoded JSON)
          if (typeof parsed === "string") {
            // Clean markdown formatting again if needed
            if (parsed.includes("```json")) {
              parsed = parsed.replace(/```json\s*/g, "").replace(/\s*```/g, "");
            }
            parsed = JSON.parse(parsed);
          }
        } else {
          parsed = globalFixPlan;
        }
        console.log("Parsed globalFixPlan:", parsed);
        setGlobalFixPlanObj(parsed);
      } catch (error) {
        console.error("Error parsing globalFixPlan:", error);
      }
    }
  }, [globalFixPlan]);

  useEffect(() => {
    if (optimisationPlan) {
      try {
        // Check if it's already an object or needs parsing
        let parsed;
        if (typeof optimisationPlan === "string") {
          // Clean up markdown formatting if present
          let cleanedData = optimisationPlan;

          // Remove markdown code fences if present
          if (cleanedData.includes("```json")) {
            cleanedData = cleanedData
              .replace(/```json\s*/g, "")
              .replace(/\s*```/g, "");
          }

          // Try parsing once
          parsed = JSON.parse(cleanedData);

          // If the result is still a string, parse again (double-encoded JSON)
          if (typeof parsed === "string") {
            // Clean markdown formatting again if needed
            if (parsed.includes("```json")) {
              parsed = parsed.replace(/```json\s*/g, "").replace(/\s*```/g, "");
            }
            parsed = JSON.parse(parsed);
          }
        } else {
          parsed = optimisationPlan;
        }
        console.log("Parsed globalFixPlan:", parsed);

        setOptimisationPlanObj(parsed);
      } catch (error) {
        console.error("Error parsing optimisationPlan:", error);
      }
    }
  }, [optimisationPlan]);

  useEffect(() => {
    if (conflictResolutionPlan) {
      try {
        // Check if it's already an object or needs parsing
        let parsed;
        if (typeof conflictResolutionPlan === "string") {
          // Clean up markdown formatting if present
          let cleanedData = conflictResolutionPlan;

          // Remove markdown code fences if present
          if (cleanedData.includes("```json")) {
            cleanedData = cleanedData
              .replace(/```json\s*/g, "")
              .replace(/\s*```/g, "");
          }

          // Try parsing once
          parsed = JSON.parse(cleanedData);

          // If the result is still a string, parse again (double-encoded JSON)
          if (typeof parsed === "string") {
            // Clean markdown formatting again if needed
            if (parsed.includes("```json")) {
              parsed = parsed.replace(/```json\s*/g, "").replace(/\s*```/g, "");
            }
            parsed = JSON.parse(parsed);
          }
        } else {
          parsed = conflictResolutionPlan;
        }
        console.log("Parsed globalFixPlan:", parsed);

        setConflictResolutionPlanObj(parsed);
      } catch (error) {
        console.error("Error parsing conflictResolutionPlan:", error);
      }
    }
  }, [conflictResolutionPlan]);

  const parseObject = (obj: unknown): React.ReactNode => {
    if (!obj) return null;

    if (Array.isArray(obj) && obj.length > 0) {
      return (
        <ul className="list-disc space-y-2 ml-4">
          {obj.map((item, index) => (
            <li key={index} className="">
              {parseObject(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof obj === "object" && obj !== null) {
      return (
        <div className="space-y-2 py-2 px-1 bg-accent-foreground rounded-md">
          {Object.entries(obj).map(([key, value], index) => (
            <div key={index} className="ml-2">
              <span className="font-medium text-foreground capitalize">
                {key.replace(/_/g, " ")}:
              </span>{" "}
              <span className="text-muted-foreground">
                {typeof value === "string" ? parseString(value) : parseObject(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (typeof obj === "string") {
      return parseString(obj);
    }

    return <span>{String(obj)}</span>;
  };

  const parseString = (str: string) => {
    if (!str || str.length === 0) {
      return;
    }
    
    // Combined regex to match both backticks and HTML code tags
    const parts = str.split(/(`[^`]+`|<code>.*?<\/code>)/g);

    return (
      <span className="">
        {parts.map((part, index) => {
          if (part.match(/^`[^`]+`$/)) {
            // Handle backticks - remove them and wrap in code element
            const codeText = part.slice(1, -1);
            return (
              <code
                key={index}
                className="bg-accent-foreground px-1 py-0.5 rounded text-sm font-mono"
              >
                {codeText}
              </code>
            );
          } else if (part.match(/^<code>.*<\/code>$/)) {
            // Handle existing HTML code tags - extract content and rewrap
            const codeText = part.replace(/<\/?code>/g, '');
            return (
              <code
                key={index}
                className="bg-accent-foreground p-1 rounded text-sm font-mono"
              >
                {codeText}
              </code>
            );
          } else {
            return <span key={index}>{part}</span>;
          }
        })}
      </span>
    );
  };

  return (
    <div className="px-6 w-full">
      <Tabs defaultValue="global" className="w-full bg-transparent">
        <TabsList className="grid w-full grid-cols-3 items-center justify-center align-middle bg-transparent">
          <TabsTrigger
            value="global"
            className="cursor-pointer hover:bg-accent-foreground/20 transition-hover duration-300 before:line-dash"
          >
            Global Analysis
          </TabsTrigger>
          <TabsTrigger
            value="optimization"
            className="cursor-pointer hover:bg-accent-foreground/20 transition-hover duration-300"
          >
            Optimization
          </TabsTrigger>
          <TabsTrigger
            value="conflicts"
            className="cursor-pointer hover:bg-accent-foreground/20 transition-hover duration-300"
          >
            Conflict Resolution
          </TabsTrigger>
        </TabsList>
        <TabsContent value="global" className="space-y-4">
          <div className="flex w-full gap-2">
            <h2 className="text-xl font-bold">Global Fix Plan Analysis</h2>
          </div>
          {/* Analysis Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Analysis</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Summary</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseString(globalFixPlanObj.analysis?.summary ?? "")
                    : "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Dependency Relationships</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseObject(
                        globalFixPlanObj.analysis?.dependency_relationships ??
                          []
                      )
                    : "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Shared Vulnerabilities</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseObject(
                        globalFixPlanObj.analysis?.shared_vulnerabilities ?? []
                      )
                    : "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Critical Path Analysis</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseObject(
                        globalFixPlanObj.analysis?.critical_path_analysis ?? []
                      )
                    : "Generating..."}
                </div>
              </div>
            </div>
          </div>

          {/* Prioritization Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Prioritization</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Strategy</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseString(
                        globalFixPlanObj.prioritization?.strategy ?? ""
                      )
                    : "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Execution Phases</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseObject(
                        globalFixPlanObj.prioritization?.execution_phases ?? []
                      )
                    : "Generating..."}
                </div>
              </div>
            </div>
          </div>

          {/* Execution Plan Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Execution Plan</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Batch Operations</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseObject(
                        globalFixPlanObj.execution_plan?.batch_operations ?? []
                      )
                    : "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Sequential Requirements</h4>
                <div className="text-sm text-muted-foreground">
                  {!isFixPlanLoading
                    ? parseString(
                        globalFixPlanObj.execution_plan
                          ?.sequential_requirements ?? ""
                      )
                    : "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Global Commands</h4>
                <div className="text-sm text-muted-foreground">
                  {parseObject(
                    globalFixPlanObj.execution_plan?.global_commands
                  ) || "Generating..."}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Management Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Risk Management</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Assessment</h4>
                <div className="text-sm text-muted-foreground">
                  {globalFixPlanObj.risk_management?.assessment ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Breaking Change Analysis</h4>
                <div className="text-sm text-muted-foreground">
                  {globalFixPlanObj.risk_management?.breaking_change_analysis ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Testing Strategy</h4>
                <div className="text-sm text-muted-foreground">
                  {globalFixPlanObj.risk_management?.testing_strategy
                    ? `Unit Tests: ${globalFixPlanObj.risk_management.testing_strategy.unit_tests || "N/A"}, Integration Tests: ${globalFixPlanObj.risk_management.testing_strategy.integration_tests || "N/A"}`
                    : "Testing strategy will appear here..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Rollback Plan</h4>
                <div className="text-sm text-muted-foreground">
                  {globalFixPlanObj.risk_management?.rollback_plan ||
                    "Generating..."}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="flex w-full gap-2">
            <h2 className="text-xl font-bold">Fix Plan Optimization</h2>
          </div>

          {/* Optimization Analysis Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Optimization Analysis</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Summary</h4>
                <div className="text-sm text-muted-foreground">
                  {optimisationPlanObj.optimization_analysis?.summary ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Redundancies Found</h4>
                <div className="text-sm text-muted-foreground">
                  {optimisationPlanObj.optimization_analysis?.redundancies_found
                    ?.map(
                      (r: { type: string; description: string }) =>
                        `${r.type}: ${r.description}`
                    )
                    .join(", ") || "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Batch Opportunities</h4>
                <div className="text-sm text-muted-foreground">
                  {optimisationPlanObj.optimization_analysis?.batch_opportunities
                    ?.map(
                      (b: { name: string; description: string }) =>
                        `${b.name}: ${b.description}`
                    )
                    .join(", ") || "Generating..."}
                </div>
              </div>
            </div>
          </div>

          {/* Execution Optimization Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Execution Optimization</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Strategy</h4>
                <div className="text-sm text-muted-foreground">
                  {optimisationPlanObj.execution_optimization?.strategy ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Consolidated Commands</h4>
                <div className="text-sm text-muted-foreground">
                  {optimisationPlanObj.execution_optimization?.consolidated_commands
                    ?.map(
                      (c: { command: string; description: string }) =>
                        `${c.command}: ${c.description}`
                    )
                    .join(", ") || "Generating..."}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <div className="flex w-full gap-2">
            <h2 className="text-xl font-bold">Conflict Resolution</h2>
          </div>

          {/* Analysis Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Analysis</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Conflicts Summary</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.analysis?.conflicts_summary ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Critical Conflicts</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.analysis?.critical_conflicts
                    ?.map(
                      (c: { dependency: string; description: string }) =>
                        `${c.dependency}: ${c.description}`
                    )
                    .join(", ") || "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Version Conflicts</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.analysis?.version_conflicts
                    ?.map(
                      (v: { package: string; description: string }) =>
                        `${v.package}: ${v.description}`
                    )
                    .join(", ") || "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Breaking Changes</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.analysis?.breaking_changes ||
                    "Generating..."}
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Resolution</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Approach</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.resolution?.approach ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Primary Strategy</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.resolution?.primary_strategy ||
                    "Generating..."}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Backup Strategies</h4>
                <div className="text-sm text-muted-foreground">
                  {conflictResolutionPlanObj.resolution?.backup_strategies
                    ?.map(
                      (s: { name: string; description: string }) =>
                        `${s.name}: ${s.description}`
                    )
                    .join(", ") || "Generating..."}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GlobalFixPlan;
