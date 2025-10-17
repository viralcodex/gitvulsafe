"use client";

import { useGraph } from "@/hooks/useGraph";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import TopHeaderGithub from "../../../components/top-header-github";
import DepDiagram from "@/components/dependency-diagram";
import { GraphNode, GroupedDependencies, SSEMessage } from "@/constants/model";
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
import FixPlanCard from "@/components/fix-plan-card";
import { useIsMobile } from "@/hooks/useMobile";
import { useRepoBranch } from "@/providers/repoBranchProvider";

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
  const [isFixPlanDialogOpen, setFixPlanDialogOpen] = useState<boolean>(false);
  const [isFixPlanComplete, setFixPlanComplete] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
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
    refreshTrigger,
    setError,
    setManifestError,
    username,
    repo,
    branch,
    file
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
    } else {
      setFileHeaderOpen(false);
    }
  }, [file, setFileHeaderOpen, setInputUrl]);

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

  const onMessage = useCallback((message: SSEMessage) => {
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
      try {
        await getFixPlanSSE(
          username,
          repo,
          selectedBranch ?? branch,
          onMessage,
          onError,
          onComplete
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
            setError("Failed to upload file. Please try again later. " + err);
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

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

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
          content={fixPlan}
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

export default Page;
