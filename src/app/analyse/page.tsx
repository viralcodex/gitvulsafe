"use client";

import { AppSidebar } from "@/components/dependency-list";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useGraph } from "@/hooks/useGraph";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback, use } from "react";
import TopHeaderGithub from "../../components/topheadergithub";
import DepDiagram from "@/components/dependency-diagram";
import {
  GraphNode,
  GroupedDependencies,
  SSEMessage,
} from "@/constants/constants";
import TopHeaderFile from "@/components/topheaderfile";
import DependencyDetailsCard from "@/components/dependency-sidebar/dependency-sidebar";
import { parseFileName, verifyFile, verifyUrl } from "@/lib/utils";
import { getFixPlanSSE, uploadFile } from "@/lib/api";
import toast from "react-hot-toast";
import { useRepoData } from "@/hooks/useRepoData";
import Image from "next/image";
import { Dropdown } from "@/components/ui/dropdown";
import FixPlanCard from "@/components/fix-plan-card";

const Page = () => {
  const branch = useSearchParams().get("branch") || "";
  const username = useSearchParams().get("username") || "";
  const repo = useSearchParams().get("repo") || "";
  const file = useSearchParams().get("file") || "";

  const [error, setError] = useState<string>("");
  const [isNodeClicked, setIsNodeClicked] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [isDiagramExpanded, setIsDiagramExpanded] = useState<boolean>(false);
  const [fileHeaderOpen, setFileHeaderOpen] = useState<boolean>(!!file);
  const [uploaded, setUploaded] = useState<boolean>(false);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState<string>("");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [debouncedUrl, setDebouncedUrl] = useState<string>("");
  const [isFixPlanLoading, setIsFixPlanLoading] = useState<boolean>(false);
  const [fixPlan, setFixPlan] = useState<Record<string, string>>({});
  const [fixPlanError, setFixPlanError] = useState<string>("");
  const [isFixPlanDialogOpen, setFixPlanDialogOpen] = useState<boolean>(false);
  const [fixPlanComplete, setFixPlanComplete] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" && window.innerWidth < 640
  );

  const repoUrl = useMemo(() => {
    if (!debouncedUrl) return null;
    const result = verifyUrl(debouncedUrl, setError);
    if (!result) return null;
    return debouncedUrl;
  }, [debouncedUrl]);

  const {
    dependencies,
    setDependencies,
    graphData,
    setGraphData,
    manifestData,
    setManifestData,
    loading,
    setLoading,
  } = useGraph(refreshTrigger, setError, username, repo, branch, file);

  const {
    branches,
    selectedBranch,
    loadingBranches,
    branchError,
    setSelectedBranch,
    setBranches,
    setBranchError,
    hasMore,
    totalBranches,
    loadNextPage,
  } = useRepoData(repoUrl);

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

  useEffect(() => {
    if (repoUrl !== null) {
      const currentRepoFromParams =
        username && repo ? `https://github.com/${username}/${repo}` : null;
      if (repoUrl !== currentRepoFromParams) {
        setSelectedBranch(null);
        setBranches([]);
      }
    }
  }, [repoUrl, username, repo, setSelectedBranch, setBranches]);

  // Handle file header state based on the file prop
  useEffect(() => {
    if (file) {
      setFileHeaderOpen(true);
      setInputFile(null);
      setUploaded(false);
      setNewFileName(file);
      setInputUrl("");
    } else {
      setFileHeaderOpen(false);
    }
  }, [file, setFileHeaderOpen]);

  useEffect(() => {
    if (dependencies && graphData && Object.keys(dependencies).length > 0) {
      setLoading(false);
    }
  }, [dependencies, graphData, setLoading]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: getViewportWidth(), height: window.innerHeight });
      // setIsNodeClicked(false);
      // setSelectedNode(null);
      // setIsSidebarExpanded(false);
      setIsMobile(getViewportWidth() < 640);
    };
    console.log("Window size changed:");
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  //Handle navigation event to close everything
  useEffect(() => {
    const handleNavigation = () => {
      setIsNodeClicked(false);
      setSelectedNode(null);
      setIsSidebarExpanded(false);
      setIsDiagramExpanded(false);
      setFileHeaderOpen(false);
      setInputFile(null);
      setUploaded(false);
    };

    console.log("Page changed");
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  // Close sidebar and reset state when URL parameters change
  useEffect(() => {
    setIsNodeClicked(false);
    setSelectedNode(null);
    setIsSidebarExpanded(false);
    setIsDiagramExpanded(false);
  }, [username, repo, branch, file]);

  const omMessage = useCallback((message: SSEMessage) => {
    console.log("SSE Message:", message);

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
    toast.error("Error generating fix plan");
    setFixPlanError("Error generating fix plan: " + error);
    setIsFixPlanLoading(false);
    setFixPlan({});
  }, []);

  const onComplete = useCallback(() => {
    toast.success("Fix plan generation completed!");
    setFixPlanComplete(true);
    setIsFixPlanLoading(false);
  }, []);

  const generateFixPlan = useCallback(
    async (regenerateFixPlan: boolean = false) => {
      if (isFixPlanLoading) return; // Prevent multiple simultaneous calls
      setFixPlanError("");
      if (Object.keys(fixPlan).length > 0 && !regenerateFixPlan) {
        setFixPlanDialogOpen(true);
        return;
      }
      setFixPlanDialogOpen(true);
      setIsFixPlanLoading(true);
      setError(""); // Clear any previous errors
      setFixPlan({}); // Reset fix plan state

      try {
        await getFixPlanSSE(
          username,
          repo,
          selectedBranch ?? branch,
          omMessage,
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
      isFixPlanLoading,
      fixPlan,
      username,
      repo,
      selectedBranch,
      branch,
      omMessage,
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
      setIsSidebarExpanded(false);
    },
    [selectedNode]
  );

  const handleDetailsCardClose = () => {
    setIsNodeClicked(false);
    setSelectedNode(null);
    setIsSidebarExpanded(false);
  };

  const handleSetDependencies = (deps: GroupedDependencies) => {
    setDependencies({});
    setGraphData({});
    setLoading(true);
    if (deps) setDependencies(deps);
  };

  //handle github url
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUrl(inputUrl);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputUrl]);

  // Update inputUrl when username, repo, or branch changes
  useEffect(() => {
    if (username && repo) {
      const url = `https://github.com/${username}/${repo}`;
      setInputUrl(url);
      setDebouncedUrl(url);
    }
  }, [branch, repo, username]);

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

  const handleRefresh = () => {
    console.log("Refreshing graph data...");
    setRefreshTrigger((prev) => prev + 1);
  };

  const resetGraph = () => {
    setGraphData({});
    setDependencies({});
    setSelectedNode(null);
    setIsNodeClicked(false);
    setIsSidebarExpanded(false);
    setIsDiagramExpanded(false);
    setLoading(false);
    svgRef.current = null;
  };

  // console.log("File Header:", newFileName, file, inputFile, uploaded);

  return (
    <div className="flex flex-col h-full">
      {isFixPlanDialogOpen ? (
        <FixPlanCard
          onClose={() => setFixPlanDialogOpen(false)}
          onDownload={() => {}}
          content={fixPlan}
          manifestData={manifestData}
          setManifestData={setManifestData}
          regenerateFixPlan={generateFixPlan}
          ecosystemOptions={ecosystemOptions}
          fixPlanError={fixPlanError}
          setFixPlanError={setFixPlanError}
          isFixPlanLoading={isFixPlanLoading}
          fixPlanComplete={fixPlanComplete}
          setFixPlanComplete={setFixPlanComplete}
        />
      ) : (
        <></>
      )}
      <div
        className={
          isSidebarExpanded && !isMobile
            ? "w-[65%] flex flex-col items-center justify-center"
            : "flex-1"
        }
      >
        <SidebarProvider className="rounded-lg">
          <AppSidebar
            dependencies={dependencies}
            isLoading={loading}
            error={error}
            className="rounded-lg border-none h-[calc(100vh-13rem)]"
          />
        </SidebarProvider>
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
            setIsSidebarExpanded={setIsSidebarExpanded}
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
            setIsSidebarExpanded={setIsSidebarExpanded}
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
          className={`flex flex-row items-center justify-center w-full gap-2 mb-4 pt-4`}
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
            className="cursor-pointer gap-x-2 w-[45%] sm:w-[200px] flex flex-row items-center justify-center bg-background p-2 border-1 border-accent rounded-md"
          >
            <Image
              className="text-accent"
              src="genai.svg"
              alt="Generate Fix Plan"
              width={28}
              height={28}
            />
            <p className="py-1">Generate Fix Plan</p>
          </div>
        </div>
        <DepDiagram
          svgRef={svgRef}
          graphData={graphData}
          selectedEcosystem={selectedEcosystem}
          isLoading={loading}
          isSidebarExpanded={isSidebarExpanded}
          isMobile={isMobile}
          windowSize={windowSize}
          isDiagramExpanded={isDiagramExpanded}
          isNodeClicked={isNodeClicked}
          isFixPlanLoading={isFixPlanLoading}
          onNodeClick={handleNodeClick}
          setIsLoading={setLoading}
          setIsMobile={setIsMobile}
          setWindowSize={setWindowSize}
          setIsDiagramExpanded={setIsDiagramExpanded}
          setIsFixPlanLoading={setIsFixPlanLoading}
          generateFixPlan={generateFixPlan}
          error={error}
        />
        {error && <div className="text-red-500 text-center">{error}</div>}
      </div>
      {selectedNode && isNodeClicked && (
        <DependencyDetailsCard
          node={selectedNode}
          dependencies={dependencies}
          isOpen={isNodeClicked}
          isMobile={isMobile}
          isSidebarExpanded={isSidebarExpanded}
          onClose={handleDetailsCardClose}
          setIsMobile={setIsMobile}
          setIsSidebarExpanded={setIsSidebarExpanded}
        />
      )}
    </div>
  );
};

export default Page;
