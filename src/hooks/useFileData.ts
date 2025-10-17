import { manifestFiles } from "@/constants/constants";
import { uploadFile } from "@/lib/api";
import React, { useEffect } from "react";
import toast from "react-hot-toast";

const useFileData = (file: File) => {
  const [inputFile, setInputFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string>("");
  const [uploaded, setUploaded] = React.useState<boolean>(false);

  useEffect(() => {
    if (inputFile) {
      verifyFile(file);
    }
  }, [inputFile, file]);

  const verifyFile = (file: File) => {
    if (!file) {
      setFileError("No file selected");
      return;
    }

    const fileName = file.name;
    if (
      !fileName ||
      !Object.keys(manifestFiles).some(
        (f) => manifestFiles[f].file === fileName
      )
    ) {
      setFileError("Invalid manifest file type");
      return;
    }

    setFileError("");
    // Handle the file upload logic here
    console.log("File uploaded:", file.name);

    setInputFile(file);

    void uploadFile(file)
      .then(() => {
        console.log("File uploaded successfully");
        toast.success("File uploaded successfully");
        setUploaded(true);
      })
      .catch((err) => {
        console.error("Error uploading file:", err);
        setFileError("Failed to upload file. Please try again later.");
      });
  };
  return {
    uploaded,
    fileError,
  };
};

export default useFileData;
