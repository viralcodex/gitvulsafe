"use client";

import React, { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useRouter } from "next/navigation";
import { verifyFile, verifyUrl } from "@/lib/utils";
import { uploadFile } from "@/lib/api";
import toast from "react-hot-toast";
import { useRepoBranch } from "@/providers/repoBranchProvider";

const MainContent = () => {
  const [url, setUrl] = useState<string>("");
  const [debouncedUrl, setDebouncedUrl] = useState<string>("");
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
    setCurrentUrl,
  } = useRepoBranch();

  const router = useRouter();

  // Debounce URL input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUrl(url);
    }, 750);
    return () => clearTimeout(handler);
  }, [url]);

  // Update global provider URL when debounced URL changes
  useEffect(() => {
    if (debouncedUrl && verifyUrl(debouncedUrl, setBranchError)) {
      setBranchError("");
      setCurrentUrl(debouncedUrl); // Update the global provider URL
    } else if (!debouncedUrl) {
      setCurrentUrl(""); // Clear the global provider URL when input is empty
    }
  }, [debouncedUrl, setBranchError, setCurrentUrl]);

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
      router.push(`/file_upload/${encodeURIComponent(newFileName)}`);
      setUploaded(true);
      return;
    }

    // Handle form submission logic here
    const result = verifyUrl(url, setBranchError);

    if (!result) {
      return; // Error will be set in verifyRepoUrl
    }

    const { sanitizedUsername, sanitizedRepo } = result;

    if (url && !file) {
      const branchParam = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : '';
      router.push(
        `/${encodeURIComponent(sanitizedUsername)}/${encodeURIComponent(sanitizedRepo)}${branchParam}`
      );
    }
  };

  const clear = () => {
    setFile(null);
    setUrl("");
    setSelectedBranch(null);
    setBranchError("");
    setUploaded(false);
    setNewFileName("");
  };

  const isDisabled = () => {
    return (
      loadingBranches ||
      (!url && !file) ||
      (file !== null && !uploaded) ||
      ((!branches ||
      !branches.length) && (!file))
    );
  };

  return (
    <Card className="w-full max-w-3xl border-[3px] border-black bg-gray-200/50 p-4 sm:p-8 shadow-[0px_0px_10px_0px_#FFFFFF]" role="region" aria-label="Repository analysis form">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Submit repository for analysis">
        <div className="flex flex-row gap-3 sm:flex-row sm:gap-4">
          <Input
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-md border-[3px] border-black px-3 py-4 text-base font-bold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-6 sm:text-lg sm:placeholder:text-lg"
            placeholder="https://github.com/username/repo"
            disabled={file !== null}
            aria-label="GitHub repository URL"
            aria-describedby={branchError ? "branch-error" : undefined}
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
          <div className="flex items-center w-full gap-x-2 mt-2" role="separator" aria-label="Or">
            <div className="flex-grow h-px bg-white" aria-hidden="true" />
            <span className="font-bold text-muted-foreground text-sm sm:text-base">
              or
            </span>
            <div className="flex-grow h-px bg-white" aria-hidden="true" />
          </div>
          <div className="flex flex-grow w-full flex-col items-start justify-center my-2">
            <label htmlFor="manifest-file-input" className="block text-md font-bold text-primary-foreground mb-2">
              Upload a manifest file{" "}
              <span className="italic font-semibold">
                (.json, .yaml, .xml, .txt)
              </span>{" "}
              - Max 5MB
            </label>
            <Input
              id="manifest-file-input"
              className="flex-1 rounded-md border-[3px] border-black px-3 text-base font-bold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-4 cursor-pointer"
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setBranchError("");
              }}
              disabled={url !== ""}
              aria-label="Upload manifest file"
              aria-describedby="file-upload-description"
            />
          </div>
          <div className="flex w-full items-center justify-center gap-x-4" role="group" aria-label="Form actions">
            <Button
              className="cursor-pointer bg-accent text-black border-[3px] border-black p-4 px-4 text-base transition-transform hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:transform hover:bg-primary-foreground sm:p-6 sm:px-6 sm:text-lg disabled:cursor-not-allowed"
              type="submit"
              disabled={isDisabled()}
              aria-label="Analyse repository dependencies"
            >
              Analyse
            </Button>
            <Button
              className="cursor-pointer bg-accent-foreground text-accent border-[3px] border-black p-4 px-4 text-base transition-transform hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:transform hover:bg-primary-foreground sm:p-6 sm:px-6 sm:text-lg"
              type="reset"
              onClick={clear}
              aria-label="Clear form"
            >
              Clear
            </Button>
          </div>
        </div>
        {branchError && (
          <p id="branch-error" className="text-red-500 text-sm flex w-full items-center justify-center" role="alert" aria-live="polite">
            {branchError}
          </p>
        )}
      </form>
    </Card>
  );
};

export default MainContent;
