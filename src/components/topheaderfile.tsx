import { LucideLoader2, LucideArrowBigRight } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import HeaderToggle from "./header-toggle";

interface TopHeaderFileProps {
  file: string;
  isLoading?: boolean;
  error?: string;
  isDiagramExpanded?: boolean;
  uploaded: boolean;
  newFileName: string;
  inputFile: File | null;
  setError: (error: string) => void;
  setIsFileHeaderOpen: (open: boolean) => void;
  setIsNodeClicked: (isClicked: boolean) => void;
  setIsSidebarExpanded: (isSidebarExpanded: boolean) => void;
  setIsDiagramExpanded?: (isDiagramExpanded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setInputFile: (file: File | null) => void;
  resetGraphSvg: () => void;
}
const TopHeaderFile = (props: TopHeaderFileProps) => {
  const {
    file,
    isLoading,
    isDiagramExpanded,
    uploaded,
    newFileName,
    inputFile,
    setInputFile,
    setError,
    setIsFileHeaderOpen,
    setIsNodeClicked,
    setIsSidebarExpanded,
    setLoading,
    resetGraphSvg
  } = props;

  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputFile) {
      setError("No file selected");
      return;
    }
    if (!uploaded) {
      setError("File not uploaded yet. Please wait.");
      toast.error("File not uploaded yet. Please wait.");
      return;
    }
    // Redirect or perform any action with the uploaded file
    console.log("File ready for analysis:", newFileName);
    toast.success("File ready for analysis");
    setIsNodeClicked(false);
    setIsSidebarExpanded(false);
    setLoading(true);
    setError("");
    resetGraphSvg();
    router.push(`/file_upload/${encodeURIComponent(newFileName)}`);
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
          <HeaderToggle from="file" setIsFileHeaderOpen={setIsFileHeaderOpen} />
          <div className="border-1 rounded-md text-accent text-md flex flex-col items-center justify-center sm:max-w-[30%] w-full p-2">
            <span className="">{file}</span>
          </div>
          <div className="flex flex-col items-center justify-center sm:w-[50%] h-13 rounded-md border-1 px-4 py-2">
            <Input
              className="flex flex-col items-center justify-center border-none cursor-pointer text-sm"
              type="file"
              onChange={(e) => {
                setInputFile(e.target.files?.[0] || null);
                setError("");
              }}
            />
          </div>
          <Button
            className="sm:h-13 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm cursor-pointer"
            type="submit"
            disabled={isLoading || !uploaded || !inputFile}
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

export default TopHeaderFile;
