"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { cn, verifyUrl } from "@/lib/utils";
import { LucideArrowBigRight, LucideLoader2, RefreshCcwDot } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dependency, EcosystemGraphMap } from "@/constants/model";
import HeaderToggle from "./header-toggle";
import HeaderOptions from "./header-options";
import { ButtonGroup } from "./ui/button-group";

interface TopHeaderProps {
  className?: string;
  isLoading?: boolean;
  error?: string;
  isDiagramExpanded?: boolean;
  branch: string;
  branches: string[];
  selectedBranch: string | null;
  loadingBranches: boolean;
  branchError: string;
  inputUrl: string;
  hasMore: boolean;
  totalBranches: number;
  loadNextPage: () => void;
  setError: (error: string) => void;
  setDependencies: (dependencies: {
    [technology: string]: Dependency[];
  }) => void;
  setGraphData: (graphData: EcosystemGraphMap) => void;
  setLoading: (loading: boolean) => void;
  setIsFileHeaderOpen: (open: boolean) => void;
  setIsNodeClicked: (isClicked: boolean) => void;
  setIsDiagramExpanded?: (isExpanded: boolean) => void;
  resetGraphSvg: () => void;
  setSelectedBranch: (branch: string | null) => void;
  setBranchError: (error: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
}

const TopHeaderGithub = (props: TopHeaderProps) => {
  const {
    isLoading,
    isDiagramExpanded,
    inputUrl,
    branches,
    selectedBranch,
    loadingBranches,
    hasMore,
    totalBranches,
    loadNextPage,
    setIsFileHeaderOpen,
    setIsNodeClicked,
    setLoading,
    setSelectedBranch,
    setBranchError,
    handleInputChange,
    onRefresh,
    resetGraphSvg
  } = props;
  const [result, setResult] = useState<{ sanitizedUsername: string; sanitizedRepo: string, branch: string }>();
  const router = useRouter();

  useEffect(() => {
    if (inputUrl) {
      const verified = verifyUrl(inputUrl, setBranchError);
      if (verified) {
        setResult({ ...verified, branch: selectedBranch || "" });
      }
    }
    return () => { setResult(undefined); };
  }, [inputUrl, setBranchError, selectedBranch]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!result) {
      return;
    }
    const { sanitizedUsername, sanitizedRepo } = result;
    // console.log("Sanitized Username:", sanitizedUsername);
    // console.log("Sanitized Repo:", sanitizedRepo);
    if (!branches || branches.length === 0) {
      console.log("No branches available to select");
      return;
    }

    setLoading(true);
    setIsNodeClicked(false);
    setBranchError("");

    // Check if we're on the same page with same parameters
    const currentUrl = window.location.href;
    const newUrl = `/${encodeURIComponent(sanitizedUsername)}/${encodeURIComponent(sanitizedRepo)}?branch=${encodeURIComponent(
      selectedBranch!
    )}`;

    if (currentUrl.includes(newUrl.slice(1))) {
      console.log(newUrl.slice(1));
      console.log("Same URL detected, showing existing data");
      setLoading(false); // Reset loading state and show existing data
      return;
    } else {
      // Different URL - navigate normally
      // Clear existing data before navigation to ensure clean state
      resetGraphSvg();
      router.push(newUrl);
    }
  };

  const onRefreshAnalysis = () => {
    if (!result) {
      return;
    }
    setLoading(true);
    setIsNodeClicked(false);
    setBranchError("");
    onRefresh();
  };
  const isDisabled = () => {return isLoading || loadingBranches || !result};
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isDiagramExpanded
          ? "hidden"
          : "w-full flex flex-col items-center justify-center"
      )}
      aria-label="GitHub repository analysis form"
    >
      <div className="flex flex-col items-center justify-center px-4 pt-4 w-full">
        <Card className="relative max-h-[200px] bg-background sm:max-w-[700px] w-full border-2 border-accent mx-auto mt-4 flex justify-center p-4 gap-4 sm:flex-row flex-col">
          <HeaderToggle
            from="github"
            setIsFileHeaderOpen={setIsFileHeaderOpen}
          />
          <HeaderOptions data={result} />
          <Input
            className="sm:w-[60%] h-13 border-1"
            placeholder="https://github.com/username/repo"
            value={inputUrl}
            onChange={handleInputChange}
            aria-label="GitHub repository URL"
          />
        <div className="sm:w-[35%] sm:max-w-[35%] h-13">
          <Dropdown
            className="shadow-none border-input border-1 h-full text-sm px-3 overflow-x-auto"
            branches={branches}
            selectedBranch={selectedBranch}
            onSelectBranch={setSelectedBranch}
            loadingBranches={loadingBranches}
            setError={setBranchError}
            hasMore={hasMore}
            totalBranches={totalBranches}
            loadNextPage={loadNextPage}
          />
        </div>
          <ButtonGroup className="sm:flex-row" role="group" aria-label="Repository actions">
            <Button
              className="flex-1 sm:h-13 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm cursor-pointer disabled:cursor-not-allowed"
              type="submit"
              disabled={isDisabled()}
              aria-label="Analyse GitHub repository"
            >
              {isLoading ? (
                <LucideLoader2 className="animate-spin" strokeWidth={3} aria-hidden="true" />
              ) : (
                <span className="flex flex-row items-center justify-center gap-x-2">
                  <span className="sm:hidden">Analyse</span>
                  <LucideArrowBigRight strokeWidth={3} aria-hidden="true" />
                </span>
              )}
            </Button>
            <Button
              className="flex-1 sm:h-13 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm cursor-pointer disabled:cursor-not-allowed"
              type="button"
              onClick={onRefreshAnalysis}
              disabled={isDisabled()}
              aria-label="Refresh repository analysis"
            >
              {isLoading ? (
                <LucideLoader2 className="animate-spin" strokeWidth={3} aria-hidden="true" />
              ) : (
                <span className="flex flex-row items-center justify-center gap-x-2">
                  <span className="sm:hidden">Refresh</span>
                  <RefreshCcwDot strokeWidth={3} aria-hidden="true" />
                </span>
              )}
            </Button>
          </ButtonGroup>
        </Card>
      </div>
    </form>
  );
};

export default TopHeaderGithub;
