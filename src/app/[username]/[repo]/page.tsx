"use client";

import { useGraph } from "@/hooks/useGraph";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import TopHeaderGithub from "../../../components/top-header-github";
import DepDiagram from "@/components/dependency-diagram";
import { GraphNode, GroupedDependencies, FixPlanSSEMessage, GlobalFixPlanSSEMessage, FixOptimisationPlanSSEMessage, ConflictResolutionPlanSSEMessage, StrategyRecommendationSSEMessage } from "@/constants/model";
import TopHeaderFile from "@/components/top-header-file";
import DependencyDetailsCard from "@/components/dependency-sidebar/dependency-sidebar";
import {
  downloadFixPlanPDF,
  parseFileName,
  verifyFile,
  verifyUrl,
} from "@/lib/utils";
import { getFixPlanSSE, uploadFile } from "@/lib/api";
import toast from "react-hot-toast";
import Image from "next/image";
import { Dropdown } from "@/components/ui/dropdown";
import FixPlanCard from "@/components/fix-plan/fix-plan-card";
import { useIsMobile } from "@/hooks/useMobile";
import { useRepoBranch } from "@/providers/repoBranchProvider";
import { TextSelectionProvider } from "@/providers/textSelectionProvider";
import FloatingAiForm from "@/components/floating-ai-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SavedHistory from "@/components/saved-history";

const Page = () => {
  const params = useParams<{ username: string; repo: string }>();
  const username = params.username;
  const repo = params.repo;
  const branch = useSearchParams().get("branch") || "";
  const [inputUrl, setInputUrl] = useState<string>("");
  const file = username?.includes("file_") ? decodeURIComponent(repo) : "";
  const [error, setError] = useState<string>("");
  const [manifestError, setManifestError] = useState<string[]>([]);
  const [fixPlanError, setFixPlanError] = useState<Record<string, string>>({});
  const [isNodeClicked, setIsNodeClicked] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isDiagramExpanded, setIsDiagramExpanded] = useState<boolean>(false);
  const [fileHeaderOpen, setFileHeaderOpen] = useState<boolean>(!!file);
  const [uploaded, setUploaded] = useState<boolean>(false);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState<string>("");
  const [isFixPlanLoading, setIsFixPlanLoading] = useState<boolean>(false);
  const [fixPlan, setFixPlan] = useState<Record<string, string>>({});
  const [globalFixPlan, setGlobalFixPlan] = useState<string>("");
  const [fixOptimizationPlan, setFixOptimizationPlan] = useState<string>("");
  const [conflictResolutionPlan, setConflictResolutionPlan] = useState<string>("");
  const [strategyPlan, setStrategyPlan] = useState<string>("");
  const [isFixPlanDialogOpen, setFixPlanDialogOpen] = useState<boolean>(false);
  const [isFixPlanComplete, setFixPlanComplete] = useState<boolean>(false);
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  const fixPlanRef = useRef<HTMLDivElement>(null);
  
  const svgRef = useRef<SVGSVGElement | null>(null);
  const prevBranchRef = useRef<string>("");

  const isMobile = useIsMobile();

  const {
    dependencies,
    setDependencies,
    graphData,
    setGraphData,
    manifestData,
    setManifestData,
    loading,
    setLoading,
  } = useGraph(
    setError,
    setManifestError,
    username,
    repo,
    branch,
    file,
    forceRefresh
  );

  const {
    branches,
    selectedBranch,
    loadingBranches,
    branchError,
    setSelectedBranch,
    setBranchError,
    hasMore,
    totalBranches,
    loadNextPage,
    setCurrentUrl,
  } = useRepoBranch();

  // Initialize URL from route parameters when route changes
  useEffect(() => {
    if (username && repo && !username.includes("file_upload")) {
      const githubUrl = `https://github.com/${username}/${repo}`;
      setInputUrl(githubUrl);
      setCurrentUrl(githubUrl);
    }
  }, [username, repo, setCurrentUrl]); // This will run when route parameters change


  const getViewportWidth = () =>
    typeof document !== "undefined"
      ? document.documentElement.clientWidth
      : 1024;

  const getViewportHeight = () => {
    return typeof document !== "undefined"
      ? document.documentElement.clientHeight
      : 768;
  };

  const [windowSize, setWindowSize] = useState({
    width: getViewportWidth(),
    height: getViewportHeight(),
  });

  const [selectedEcosystem, setSelectedEcosystem] = useState<
    string | undefined
  >(graphData ? Object.keys(graphData)[0] : undefined);

  useEffect(() => {
    if (graphData && Object.keys(graphData).length > 0) {
      setSelectedEcosystem((prev) =>
        prev && graphData[prev] ? prev : Object.keys(graphData)[0]
      );
    }
  }, [graphData]);

  const ecosystemOptions = useMemo(() => {
    if (!graphData) return [];
    const keys = Object.keys(graphData);
    return keys.length > 0 ? keys : [];
  }, [graphData]);

  // Branch sync: handle both URL parameter and default branch selection
  useEffect(() => {
    if (branches.length > 0) {
      if (branch && branches.includes(branch)) {
        if (prevBranchRef.current !== branch) {
          setSelectedBranch(branch);
          prevBranchRef.current = branch;
        }
      } else if (!selectedBranch) {
        setSelectedBranch(branches[0]);
        prevBranchRef.current = branches[0];
      }
    }
  }, [branch, branches, selectedBranch, setSelectedBranch]);

  // Handle file header state based on the file prop
  useEffect(() => {
    if (file) {
      setFileHeaderOpen(true);
      setInputFile(null);
      setUploaded(false);
      setNewFileName(file);
      setCurrentUrl(""); // Clear URL to reset branches when in file mode
    } else {
      setFileHeaderOpen(false);
    }
  }, [file, setFileHeaderOpen, setInputUrl, setCurrentUrl]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: getViewportWidth(), height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  //Handle navigation event to close everything
  useEffect(() => {
    const handleNavigation = () => {
      setIsNodeClicked(false);
      setSelectedNode(null);
      setIsDiagramExpanded(false);
      setFileHeaderOpen(false);
      setInputFile(null);
      setUploaded(false);
    };

    // console.log("Page changed");
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  // Close sidebar and reset state when URL parameters change
  useEffect(() => {
    setIsNodeClicked(false);
    setSelectedNode(null);
    setIsDiagramExpanded(false);
  }, [username, repo, branch, file]);

  const onMessage = useCallback((message: FixPlanSSEMessage) => {
    if (
      message &&
      message.dependencyName &&
      message.dependencyVersion &&
      message.fixPlan
    ) {
      const key = `${message.dependencyName}@${message.dependencyVersion}`;

      setFixPlan((prev) => {
        const fixPlanString =
          typeof message.fixPlan === "object"
            ? JSON.stringify(message.fixPlan, null, 2)
            : String(message.fixPlan);

        return {
          ...prev,
          [key]: fixPlanString,
        };
      });
    } else {
      console.warn("Invalid message structure received:", message);
    }
  }, []);

  const onError = useCallback((error: string) => {
    toast.dismiss();

    const errorParts = error.split(" ");
    let dependencyKey = "";

    for (const part of errorParts) {
      if (part.includes("@") && part.length > 3) {
        dependencyKey = part;
        break;
      }
    }

    if (dependencyKey) {
      // console.log("Error for dependency:", dependencyKey, error);
      setFixPlanError((prev) => ({
        ...prev,
        [dependencyKey]: error,
      }));
    } else {
      // console.log("General error (no specific dependency):", error);
    }
  }, []);

  const onComplete = useCallback(() => {
    toast.dismiss();
    toast.success("Fix plan generation completed!");
    setFixPlanComplete(true);
    setIsFixPlanLoading(false);
  }, [setFixPlanComplete, setIsFixPlanLoading]);

  const onGlobalFixPlanMessage = useCallback((message: GlobalFixPlanSSEMessage) => {
    if (message && message.globalFixPlan) {
      const globalPlan =
        typeof message.globalFixPlan === "object"
          ? JSON.stringify(message.globalFixPlan, null, 2)
          : String(message.globalFixPlan);

      setGlobalFixPlan(globalPlan);
    } else {
      console.warn("Invalid global fix plan message structure received:", message);
    }
  }, []);

  const onFixOptimizationMessage = useCallback((message: FixOptimisationPlanSSEMessage) => {
    if (message && message.optimisedPlan) {
      const fixOptPlan =
        typeof message.optimisedPlan === "object"
          ? JSON.stringify(message.optimisedPlan, null, 2)
          : String(message.optimisedPlan);

      setFixOptimizationPlan(fixOptPlan);
    } else {
      console.warn("Invalid fix optimization plan message structure received:", message);
    }
  }, []);

  const onConflictResolutionMessage = useCallback((message: ConflictResolutionPlanSSEMessage) => {
    if (message && message.conflictResolutionPlan) {
      const conflictPlan =
        typeof message.conflictResolutionPlan === "object"
          ? JSON.stringify(message.conflictResolutionPlan, null, 2)
          : String(message.conflictResolutionPlan);

      setConflictResolutionPlan(conflictPlan);
    } else {
      console.warn("Invalid conflict resolution plan message structure received:", message);
    }
  }, []);

  const onStrategyRecommendationMessage = useCallback((message: StrategyRecommendationSSEMessage) => {
    if (message && message.finalStrategy) {
      const strategyRec =
        typeof message.finalStrategy === "object"
          ? JSON.stringify(message.finalStrategy, null, 2)
          : String(message.finalStrategy);

      setStrategyPlan(strategyRec);
    } else {
      console.warn("Invalid strategy recommendation message structure received:", message);
    }
  }, []);

  const generateFixPlan = useCallback(
    async (regenerateFixPlan: boolean = false) => {
      if (!graphData || Object.keys(graphData).length === 0) {
        setError("No graph data available to generate fix plan.");
        return;
      }
      setFixPlanDialogOpen(true);
      if (isFixPlanLoading) return; // Prevent multiple simultaneous calls
      setFixPlanError({});
      if (Object.keys(fixPlan).length > 0 && !regenerateFixPlan) {
        setFixPlanDialogOpen(true);
        return;
      }
      setIsFixPlanLoading(true);
      setError("");
      setFixPlan({});
      setGlobalFixPlan("");
      setFixOptimizationPlan("");
      setConflictResolutionPlan("");
      setStrategyPlan("");
      try {
        await getFixPlanSSE(
          username,
          repo,
          selectedBranch ?? branch,
          onMessage,
          onError,
          onComplete,
          onGlobalFixPlanMessage,
          onFixOptimizationMessage,
          onConflictResolutionMessage,
          onStrategyRecommendationMessage
        );
      } catch (error) {
        console.error("Error generating fix plan:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while generating the fix plan.";
        toast.error(errorMessage);
        setError(errorMessage);
        setIsFixPlanLoading(false);
         setFixPlan({});
         setGlobalFixPlan("");
         setFixOptimizationPlan("");
         setConflictResolutionPlan("");
         setStrategyPlan("");
      }
    },
    [
      graphData,
      isFixPlanLoading,
      fixPlan,
      username,
      repo,
      selectedBranch,
      branch,
      onMessage,
      onError,
      onComplete,
      onGlobalFixPlanMessage,
      onFixOptimizationMessage,
      onConflictResolutionMessage,
      onStrategyRecommendationMessage,
    ]
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (selectedNode !== node) {
        setSelectedNode(node);
        setIsNodeClicked(true);
        return;
      }
      setIsNodeClicked(false);
      setSelectedNode(null);
    },
    [selectedNode]
  );

  const handleDetailsCardClose = () => {
    setIsNodeClicked(false);
    setSelectedNode(null);
  };

  const handleSetDependencies = (deps: GroupedDependencies) => {
    setDependencies({});
    setGraphData({});
    setLoading(true);
    if (deps) setDependencies(deps);
  };

  useEffect(() => {
    toast.dismiss();
    if (error) toast.error(error);
  }, [error]);


  // Handle file upload
  useEffect(() => {
    if (inputFile) {
      setUploaded(false);
      const result = verifyFile(inputFile, setError, setInputFile);
      if (!result) {
        setError(
          "Invalid file type. Please select a file of type .json, .yaml, .xml, .txt"
        );
      } else {
        setError("");
        void uploadFile(inputFile)
          .then((response) => {
            // console.log("File uploaded successfully");
            toast.success("File uploaded successfully");
            setNewFileName(response.newFileName);
            setUploaded(true);
            return true;
          })
          .catch((err) => {
            // console.error("Error uploading file:", err);
            setError(err);
            setUploaded(false);
            toast.error("Failed to upload file. Please try again later.");
          });
      }
    }
  }, [inputFile, setError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    // console.log("Input URL:", url);
    setInputUrl(url);
    if (url && !verifyUrl(url, setBranchError)) {
      return;
    }
    setBranchError("");
  };

  // Debounce URL input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if(inputUrl && verifyUrl(inputUrl, setBranchError))
        setCurrentUrl(inputUrl);
    }, 1000);
    return () => clearTimeout(handler);
  }, [inputUrl, setBranchError, setCurrentUrl]);

  const handleRefresh = useCallback(() => {
    // Set forceRefresh flag and increment trigger
    setForceRefresh(true);
    // Reset forceRefresh after a short delay to ensure it's used for this fetch only
    setTimeout(() => setForceRefresh(false), 100);
  }, []);

  const resetGraph = () => {
    setGraphData({});
    setDependencies({});
    setSelectedNode(null);
    setIsNodeClicked(false);
    setIsDiagramExpanded(false);
    svgRef.current = null;
  };

  // console.log("File Header:", newFileName, file, inputFile, uploaded);

  // console.log("LOADING:", inputUrl, currentUrl);
  return (
    <div className="flex flex-col h-full">
      {isFixPlanDialogOpen && (
        <FixPlanCard
          onClose={() => setFixPlanDialogOpen(false)}
          onDownload={async () => {
            await downloadFixPlanPDF(fixPlanRef);
          }}
          fixPlanRef={fixPlanRef}
          fixPlan={fixPlan}
          optimisationPlan={fixOptimizationPlan}
          globalFixPlan={globalFixPlan}
          conflictResolutionPlan={conflictResolutionPlan}
          strategyPlan={strategyPlan}
          manifestData={manifestData}
          setManifestData={setManifestData}
          regenerateFixPlan={generateFixPlan}
          ecosystemOptions={ecosystemOptions}
          fixPlanError={fixPlanError}
          setFixPlanError={setFixPlanError}
          isFixPlanLoading={isFixPlanLoading}
          fixPlanComplete={isFixPlanComplete}
          setFixPlanComplete={setFixPlanComplete}
        />
      )}
      <div
        className={
          isNodeClicked && !isMobile
            ? "w-[65%] flex flex-col items-center justify-center"
            : "flex-1"
        }
      >
        {/* <SidebarProvider>
          <AppSidebar
            dependencies={dependencies}
            isLoading={loading}
            error={error}
            className="rounded-lg border-none h-[calc(100vh-13rem)]"
          /> 
        </SidebarProvider>
        */}
        <SavedHistory />
        {fileHeaderOpen ? (
          <TopHeaderFile
            file={parseFileName(newFileName)}
            isLoading={loading}
            error={error}
            isDiagramExpanded={isDiagramExpanded}
            newFileName={newFileName}
            uploaded={uploaded}
            inputFile={inputFile}
            setError={setError}
            setIsFileHeaderOpen={setFileHeaderOpen}
            setIsNodeClicked={setIsNodeClicked}
            setIsDiagramExpanded={setIsDiagramExpanded}
            setLoading={setLoading}
            setInputFile={setInputFile}
            resetGraphSvg={resetGraph}
          />
        ) : (
          <TopHeaderGithub
            isLoading={loading}
            error={error}
            isDiagramExpanded={isDiagramExpanded}
            inputUrl={inputUrl}
            branch={branch}
            branches={branches}
            selectedBranch={selectedBranch}
            loadingBranches={loadingBranches}
            branchError={branchError}
            hasMore={hasMore}
            totalBranches={totalBranches}
            setLoading={setLoading}
            setDependencies={handleSetDependencies}
            setError={setError}
            setGraphData={setGraphData}
            setIsFileHeaderOpen={setFileHeaderOpen}
            setIsNodeClicked={setIsNodeClicked}
            setIsDiagramExpanded={setIsDiagramExpanded}
            resetGraphSvg={resetGraph}
            setSelectedBranch={setSelectedBranch}
            setBranchError={setBranchError}
            handleInputChange={handleInputChange}
            loadNextPage={loadNextPage}
            onRefresh={handleRefresh}
          />
        )}
        <div
          id="Header Buttons"
          className={`flex flex-row items-center justify-center w-full gap-2 mt-4 mb-2`}
        >
          {ecosystemOptions.length > 1 && (
            <div className="sm:w-[200px] w-[40%]">
              <Dropdown
                branches={ecosystemOptions}
                selectedBranch={selectedEcosystem || null}
                onSelectBranch={setSelectedEcosystem}
                loadingBranches={false}
                setError={(error) => setError(error)}
                isBranchDropdown={false}
                hasMore={false}
                totalBranches={ecosystemOptions.length}
                loadNextPage={() => {}}
                className="shadow-none border-input border-1 text-sm p-3"
              />
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                asChild
                id="generate-fix-plan"
                className="bg-accent-foreground"
              >
                <div
                  onClick={() => generateFixPlan(false)}
                  className="cursor-pointer gap-x-2 w-[45%] sm:w-[200px] flex flex-row items-center justify-center bg-background py-3 border-1 border-accent rounded-md"
                >
                  <Image
                    priority
                    className="text-accent"
                    src="/genai.svg"
                    alt="Generate Fix Plan"
                    width={28}
                    height={28}
                  />
                  <p className="sm:text-md text-sm">Generate Fix Plan</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={-8} className="bg-background/80 text-accent text-xs px-2 py-1 rounded-md transition-all ease-in duration-300">
                <p className="font-semibold">Fix plan may take several seconds depending on the size of project.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DepDiagram
          svgRef={svgRef}
          graphData={graphData}
          selectedEcosystem={selectedEcosystem}
          isLoading={loading}
          isMobile={isMobile}
          windowSize={windowSize}
          isDiagramExpanded={isDiagramExpanded}
          isNodeClicked={isNodeClicked}
          isFixPlanLoading={isFixPlanLoading}
          onNodeClick={handleNodeClick}
          setIsLoading={setLoading}
          setWindowSize={setWindowSize}
          setIsDiagramExpanded={setIsDiagramExpanded}
          setIsFixPlanLoading={setIsFixPlanLoading}
          generateFixPlan={generateFixPlan}
          error={error}
          manifestError={manifestError}
        />
      </div>
      {selectedNode && isNodeClicked && (
        <DependencyDetailsCard
          node={selectedNode}
          dependencies={dependencies}
          isOpen={isNodeClicked}
          isMobile={isMobile}
          onClose={handleDetailsCardClose}
        />
      )}
    </div>
  );
};

const PageContent = () => {
  return (
    <TextSelectionProvider>
      <Page />
      <FloatingAiForm />
    </TextSelectionProvider>
  );
}

export default PageContent;
