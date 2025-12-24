import React from "react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { TooltipProvider } from "./ui/tooltip";

interface HeaderToggleProps {
  from: string;
  setIsFileHeaderOpen: (open: boolean) => void;
}
const HeaderToggle = ({ setIsFileHeaderOpen, from }: HeaderToggleProps) => {
  const handleToggle = () => {
    switch (from) {
      case "file":
        setIsFileHeaderOpen(false);
        break;
      case "github":
        setIsFileHeaderOpen(true);
        break;
    }
  };
  const getFileLogo = () => {
    switch (from) {
      case "file":
        return "/file-logo.svg";
      case "github":
        return "/github.svg";
      default:
        return "/file-logo.svg";
    }
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleToggle}
            className="bg-accent rounded-2xl p-1 cursor-pointer absolute -top-3 -right-3"
          >
            <Image
              src={getFileLogo()}
              alt={"logo svg to toggle header"}
              width={25}
              height={25}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background/80 text-accent text-xs px-2 py-1 rounded-md transition-all ease-in duration-300">
          {from === "file" ? "Toggle File Header" : "Toggle GitHub Header"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HeaderToggle;
