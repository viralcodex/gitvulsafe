"use client";

import React, { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useRouter } from "next/navigation";
import { verifyFile, verifyUrl } from "@/lib/utils";
import { useRepoData } from "@/hooks/useRepoData";
import { uploadFile } from "@/lib/api";
import toast from "react-hot-toast";

const MainContent = () => {
  const [url, setUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState<string>("");
  const [uploaded, setUploaded] = useState<boolean>(false);
  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    loadingBranches,
    branchError,
    setBranchError,
    hasMore,
    totalBranches,
    loadNextPage,
  } = useRepoData(url);

  const router = useRouter();

  useEffect(() => {
    if (url && verifyUrl(url, setBranchError)) {
      setBranchError("");
    }
  }, [setBranchError, url]);

  useEffect(() => {
    if (file) {
      setUploaded(false);
      const result = verifyFile(file, setBranchError, setFile);
      if (!result) {
        setFile(null);
        setUploaded(false);
        return;
      }
      setBranchError("");
      void uploadFile(file)
        .then((response) => {
          console.log("File uploaded successfully");
          toast.success("File uploaded successfully");
          setNewFileName(response.newFileName);
          setUploaded(true);
          return true;
        })
        .catch((err) => {
          console.error("Error uploading file:", err);
          setBranchError("Failed to upload file. Please try again later.");
          setUploaded(false);
        });
      
    }
  }, [file, setBranchError]);

  //debounce effect to enter github url and fetch branches
  // useEffect(() => {
  //   setLoadingBranches(true);
  //   const fetchBranches = async () => {
  //     const result = verifyUrl(url, setError);
  //     if (!result) {
  //       setLoadingBranches(false);
  //       return; // Error will be set in verifyUrl
  //     }
  //     const { sanitizedUsername, sanitizedRepo } = result;
  //     console.log("username", sanitizedUsername, "repo", sanitizedRepo);
  //     const branches = await getRepoBranches(
  //       sanitizedUsername,
  //       sanitizedRepo,
  //       localStorage.getItem("github_pat") ?? undefined
  //     );

  //     console.log("branches", branches);

  //     if (branches.error) {
  //       setError(branches.error);
  //       setBranches([]);
  //       setLoadingBranches(false);
  //       setSelectedBranch(null);
  //     } else {
  //       setBranches(branches.branches || []);
  //       if (branches.defaultBranch) {
  //         setSelectedBranch(branches.defaultBranch);
  //       }
  //     }
  //   };

  //   const debounceTimeout = setTimeout(() => {
  //     if (url) {
  //       fetchBranches();
  //     } else {
  //       setBranches([]);
  //       setSelectedBranch(null);
  //     }
  //     setError("");
  //     setLoadingBranches(false);
  //   }, 2000); // 2 seconds debounce delay
  //   return () => clearTimeout(debounceTimeout);
  // }, [url]);

  

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!url && !file) {
      setBranchError("Please enter a GitHub URL or upload a manifest file.");
      return;
    }

    if (file) {
      if (!uploaded) {
        toast.error("Please wait for the file to be uploaded.");
        return;
      }
      // If a file is selected, redirect to the analysis page with the file
      router.push(`/analyse?file=${encodeURIComponent(newFileName)}`);
      setUploaded(true);
      return;
    }

    // Handle form submission logic here
    const result = verifyUrl(url, setBranchError);

    if (!result) {
      return; // Error will be set in verifyRepoUrl
    }

    const { sanitizedUsername, sanitizedRepo } = result;

    if (url && !file)
      router.push(
        `/analyse?username=${encodeURIComponent(
          sanitizedUsername
        )}&repo=${encodeURIComponent(
          sanitizedRepo
        )}${`&branch=${encodeURIComponent(selectedBranch!)}`}`
      );
  };

  return (
    <Card className="w-full max-w-3xl border-[3px] border-black bg-gray-200/50 p-4 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="flex flex-row gap-3 sm:flex-row sm:gap-4">
          <Input
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-md border-[3px] border-black px-3 py-4 text-base font-bold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-6 sm:text-lg sm:placeholder:text-lg"
            placeholder="https://github.com/username/repo"
            disabled={file !== null}
          />
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-y-2">
          <Dropdown
            branches={branches}
            selectedBranch={selectedBranch}
            onSelectBranch={setSelectedBranch}
            loadingBranches={loadingBranches && file === null}
            setError={setBranchError}
            hasMore={hasMore}
            totalBranches={totalBranches}
            loadNextPage={loadNextPage}
            className=""
          />
          <div className="flex items-center w-full gap-x-2 mt-2">
            <div className="flex-grow h-px bg-white" />
            <span className="font-bold text-muted-foreground text-sm sm:text-base">
              or
            </span>
            <div className="flex-grow h-px bg-white" />
          </div>
          <div className="flex flex-grow w-full flex-col items-start justify-center my-2">
            <label className="block text-md font-bold text-primary-foreground mb-2">
              Upload a manifest file <span className="italic font-semibold">(.json, .yaml, .xml, .txt)</span> - Max 5MB
            </label>
            <Input
              className="flex-1 rounded-md border-[3px] border-black px-3 text-base font-bold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-4 cursor-pointer"
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setBranchError("");
              }}
              disabled={url !== ""}
            />
          </div>
          <div className="flex w-full items-center justify-center gap-x-4">
            <Button
              className="cursor-pointer bg-accent text-black border-[3px] border-black p-4 px-4 text-base transition-transform hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:transform hover:bg-primary-foreground sm:p-6 sm:px-6 sm:text-lg disabled:cursor-not-allowed"
              type="submit"
              disabled={loadingBranches || (!url && !file) || (file !== null && !uploaded)}
            >
              Analyse
            </Button>
            <Button
              className="cursor-pointer bg-accent-foreground text-accent border-[3px] border-black p-4 px-4 text-base transition-transform hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:transform hover:bg-primary-foreground sm:p-6 sm:px-6 sm:text-lg"
              type="reset"
              onClick={() => {
                setFile(null);
                setUrl("");
                setSelectedBranch(null);
                setBranchError("");
                setUploaded(false);
                setNewFileName("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
        {branchError && (
          <p className="text-red-500 text-sm flex w-full items-center justify-center">
            {branchError}
          </p>
        )}
      </form>
    </Card>
  );
};

export default MainContent;
