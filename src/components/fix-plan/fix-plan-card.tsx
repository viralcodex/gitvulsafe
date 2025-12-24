import {
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
  RefObject,
} from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Download, RefreshCcw, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn, depVulnCount } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ManifestFileContentsApiResponse } from "@/constants/model";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import StrategyPlan from "./strategy-plan";
import GlobalFixPlan from "./global-fix-plan";
import IndividualFixPlan from "./indv-fix-plan";

interface FixPlanCardProps {
  onClose: () => void;
  onDownload: () => void;
  ecosystemOptions?: string[];
  fixPlan: Record<string, string>;
  optimisationPlan: string;
  globalFixPlan: string;
  conflictResolutionPlan?: string;
  strategyPlan: string;
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
    fixPlan,
    globalFixPlan,
    optimisationPlan,
    conflictResolutionPlan,
    strategyPlan,
    manifestData,
    regenerateFixPlan,
    fixPlanError,
    isFixPlanLoading,
    fixPlanComplete,
    fixPlanRef,
  } = props;

  const [showFixPlans, setShowFixPlans] = useState<Record<string, boolean>>({});
  const [isExpandedAll, setIsExpandedAll] = useState(true);

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

  useEffect(()=>{
    if(fixPlanComplete){
      console.log(fixPlan);
    }
  }, [fixPlan, fixPlanComplete]);

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



  return (
    <div className="fixed inset-0 z-101 flex items-center justify-center bg-black/20 backdrop-blur-xs py-4 px-2 sm:p-6">
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
        <CardContent className="h-full overflow-y-scroll scrollbar-background-bg scrollbar-background-thumb">
          <Tabs
            className="flex w-full items-center justify-between"
            defaultValue="global_fix_plan"
          >
            <div>
              <TabsList className="grid w-full grid-cols-2 items-center justify-center rounded-t-none">
                <TabsTrigger
                  value="indv_fix_plan"
                  className="rounded-t-none cursor-pointer"
                >
                  Individual Fix Plans
                </TabsTrigger>
                <TabsTrigger
                  value="global_fix_plan"
                  className="rounded-t-none cursor-pointer"
                >
                  Global Fix Plan
                </TabsTrigger>
                {/* <TabsTrigger
                  value="strategy_plan"
                  className="rounded-t-none cursor-pointer"
                >
                  Strategy Plan
                </TabsTrigger> */}
              </TabsList>
            </div>
            <div className="flex flex-col w-full overflow-y-auto scrollbar-background-bg scrollbar-background-thumb">
              <TabsContent value="indv_fix_plan">
                <IndividualFixPlan
                  fixPlanRef={fixPlanRef}
                  manifestData={manifestData}
                  fixPlan={fixPlan}
                  fixPlanError={fixPlanError}
                  isFixPlanLoading={isFixPlanLoading}
                  toggleShowFixPlan={toggleShowFixPlan}
                  isOpen={isOpen}
                />
              </TabsContent>
              <TabsContent value="global_fix_plan">
                <GlobalFixPlan
                  globalFixPlan={globalFixPlan}
                  optimisationPlan={optimisationPlan}
                  conflictResolutionPlan={conflictResolutionPlan}
                  isFixPlanLoading={isFixPlanLoading}
                />
              </TabsContent>
              {/* <TabsContent value="strategy_plan">
                <StrategyPlan
                  strategyPlan={strategyPlan}
                  isFixPlanLoading={isFixPlanLoading}
                />
              </TabsContent> */}
            </div>
          </Tabs>
        </CardContent>
        <CardFooter className="px-4 flex flex-row">
          <p className={cn("text-sm", "italic text-foreground py-3")}>
            *AI results can be inaccurate. Always verify before taking action.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FixPlanCard;
