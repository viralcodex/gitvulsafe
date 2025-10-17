"use client";

import { useRepoData } from "@/hooks/useRepoData";
import React, { createContext, useContext, useState } from "react";

interface RepoBranchContextType {
  branches: string[];
  selectedBranch: string | null;
  loadingBranches: boolean;
  branchError: string;
  hasMore: boolean;
  totalBranches: number;
  currentUrl: string;
  setSelectedBranch: (branch: string | null) => void;
  setBranchError: (error: string) => void;
  setBranches: (branches: string[]) => void;
  loadNextPage: () => void;
  setCurrentUrl: (url: string) => void;
}

interface RepoBranchProviderProps {
  children: React.ReactNode;
}

const RepoBranchContext = createContext<RepoBranchContextType | undefined>(
  undefined
);

const RepoBranchProvider = ({ children }: RepoBranchProviderProps) => {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const repoData = useRepoData(currentUrl);

  const contextValue = {
    ...repoData,
    currentUrl,
    setCurrentUrl,
  };

  return (
    <RepoBranchContext.Provider value={contextValue}>
      {children}
    </RepoBranchContext.Provider>
  );
};

export const useRepoBranch = () => {
  const context = useContext(RepoBranchContext);

  if (context === undefined) {
    throw new Error("useRepoBranch must be used inside RepoBranchProvider");
  }
  return context;
};

export default RepoBranchProvider;
