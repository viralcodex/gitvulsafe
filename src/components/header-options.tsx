import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import React from "react";
import { PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

interface HeaderOptionsProps {
  data?: { [key: string]: string | null } | null;
}
const HeaderOptions = ({ data }: HeaderOptionsProps) => {
  const addGithubPreference = () => {
    if (!data) {
      toast.error("No history to save!");
      return;
    }
    const existingPrefs = JSON.parse(
      localStorage.getItem("githubHistory") || "[]"
    ) as Array<{ [key: string]: string | null }>;
    if (existingPrefs.length >= 10) {
      toast.error("Maximum of 10 items can be saved!", {style: {maxWidth: '500px'}});
      return;
    }
    if(existingPrefs.some(pref => 
      pref.sanitizedUsername === data.sanitizedUsername &&
      pref.sanitizedRepo === data.sanitizedRepo &&
      pref.branch === data.branch
    )) {
      toast.error("This history item already exists!");
      return;
    }
    localStorage.setItem(
      "githubHistory",
      JSON.stringify(existingPrefs.concat([data || {}]))
    );

    window.dispatchEvent(new Event("githubHistoryUpdated"));

    toast.success("GitHub History Added!");
    console.log(localStorage.getItem("githubHistory"));
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={addGithubPreference}
            className="bg-accent rounded-2xl p-1 cursor-pointer absolute -top-3 -left-3"
          >
            <PlusCircle strokeWidth={3} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background/80 text-accent text-xs px-2 py-1 rounded-md transition-all ease-in duration-300">
          Save to History
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HeaderOptions;
