"use client";

import { useState, useEffect } from 'react';
import { getRepoBranches } from '@/lib/api';
import { verifyUrl } from '@/lib/utils';

export const useRepoData = (url: string | null) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branchError, setBranchError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalBranches, setTotalBranches] = useState<number>(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const pageSize = 100;

  useEffect(() => {
    if (!url) {
      setBranches([]);
      setSelectedBranch(null);
      setLoadingBranches(false);
      setBranchError("");
      setPage(1);
      setHasMore(true);
      setTotalBranches(0);
      setCurrentUrl(null);
      return;
    }

    // Reset pagination state only when URL actually changes
    if (url !== currentUrl) {
      setPage(1);
      setBranches([]);
      setHasMore(true);
      setTotalBranches(0);
      setBranchError("");
      setCurrentUrl(url);
      return; // Return early to let the next effect cycle handle the fetch
    }

    const fetchBranches = async () => {
      const result = verifyUrl(url, setBranchError);
      if (!result) {
        setLoadingBranches(false);
        return;
      }

      const { sanitizedUsername, sanitizedRepo } = result;

      setLoadingBranches(true);
      console.log('Fetching page:', page, 'for URL:', url);
      
      const branchesResponse = await getRepoBranches(
        sanitizedUsername,
        sanitizedRepo,
        localStorage.getItem("github_pat") ?? undefined,
        page,
        pageSize
      );

      if (branchesResponse.error) {
        setBranchError(branchesResponse.error);
        setBranches([]);
        setSelectedBranch(null);
        setHasMore(false);
        setTotalBranches(0);
      } else {
        console.log('Received branches:', branchesResponse.branches?.length, 'hasMore:', branchesResponse.hasMore, 'page:', page);
        // For first page, replace branches. For subsequent pages, append them
        if (page === 1) {
          setBranches(branchesResponse.branches || []);
          setSelectedBranch(branchesResponse.defaultBranch || null);
        } else {
          setBranches(prevBranches => {
            const newBranchesToAdd = branchesResponse.branches || [];
            console.log('Previous branches:', prevBranches.length, 'New branches to add:', newBranchesToAdd);
            // Check for duplicates before adding
            const duplicates = newBranchesToAdd.filter(branch => prevBranches.includes(branch));
            if (duplicates.length > 0) {
              console.warn('Found duplicate branches:', duplicates);
            }
            // Remove duplicates by using Set
            const uniqueBranches = Array.from(new Set([...prevBranches, ...newBranchesToAdd]));
            console.log('Total branches now:', uniqueBranches.length, 'Duplicates removed:', prevBranches.length + newBranchesToAdd.length - uniqueBranches.length);
            return uniqueBranches;
          });
        }
        setHasMore(branchesResponse.hasMore!);
        setTotalBranches(branchesResponse.total || 0);
      }
      
      setLoadingBranches(false);
    };

    // Only add debounce for the first page (URL change), not for pagination
    if (page === 1 && url === currentUrl) {
      const debounceTimeout = setTimeout(fetchBranches, 500);
      return () => clearTimeout(debounceTimeout);
    } else if (page > 1) {
      // For pagination, fetch immediately without debounce
      fetchBranches();
    }
  }, [url, page, pageSize, currentUrl]);

  const loadNextPage = () => {
    console.log('loadNextPage called:', { hasMore, loadingBranches, currentPage: page });
    if(hasMore && !loadingBranches) {
      console.log('Loading next page:', page + 1);
      setPage(prevPage => {
        const nextPage = prevPage + 1;
        console.log('Setting page from', prevPage, 'to', nextPage);
        return nextPage;
      });
    } else {
      console.log('Cannot load next page:', { hasMore, loadingBranches });
    }
  }

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    loadingBranches,
    branchError,
    setBranchError,
    setBranches,
    hasMore,
    totalBranches,
    loadNextPage,
  };
};
