"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { cn, verifyUrl } from "@/lib/utils";
import { LucideArrowBigRight, LucideLoader2 } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";
import { Dependency, EcosystemGraphMap } from "@/constants/model";
import HeaderToggle from "./header-toggle";

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

  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = verifyUrl(inputUrl, setBranchError);
    if (!result) {
      return; // If URL is invalid, do not proceed
    }
    const { sanitizedUsername, sanitizedRepo } = result;
    console.log("Sanitized Username:", sanitizedUsername);
    console.log("Sanitized Repo:", sanitizedRepo);

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
      console.log("Same URL detected, triggering refresh");
      onRefresh?.();
      return;
    } else {
      // Different URL - navigate normally
      // Clear existing data before navigation to ensure clean state
      resetGraphSvg();
      router.push(newUrl);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isDiagramExpanded
          ? "hidden"
          : "w-full flex flex-col items-center justify-center"
      )}
    >
      <div className="flex flex-col items-center justify-center px-4 pt-4 w-full">
        <Card className="relative max-h-[200px] bg-background sm:max-w-[700px] w-full border-2 border-accent mx-auto mt-4 flex justify-center p-4 gap-4 sm:flex-row flex-col">
          <HeaderToggle
            from="github"
            setIsFileHeaderOpen={setIsFileHeaderOpen}
          />
          <Input
            className="sm:w-[60%] h-13 border-1"
            placeholder="https://github.com/username/repo"
            value={inputUrl}
            onChange={handleInputChange}
          />
          <div className="sm:w-[35%] h-13">
            <Dropdown
              className="shadow-none border-input border-1 h-full text-sm px-3"
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
          <Button
            className="sm:h-13 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm cursor-pointer"
            type="submit"
            disabled={
              isLoading || loadingBranches || !inputUrl || !branches.length
            }
          >
            {isLoading ? (
              <LucideLoader2 className="animate-spin" strokeWidth={3} />
            ) : (
              <span className="flex flex-row items-center justify-center">
                <span className="sm:hidden">Analyse</span>
                <LucideArrowBigRight strokeWidth={3} />
              </span>
            )}
          </Button>
        </Card>
      </div>
    </form>
  );
};

export default TopHeaderGithub;
