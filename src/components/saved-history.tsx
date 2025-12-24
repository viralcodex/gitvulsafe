import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { useRouter } from "next/navigation";
import { RefreshCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Tooltip, TooltipContent } from "./ui/tooltip";
import { TooltipTrigger } from "./ui/tooltip";

const SavedHistory = () => {
  const [history, sethistory] = useState<
    Array<{
      [key: string]: string;
    }>
  >([]);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const loadhistory = () => {
      const storedhistory = localStorage.getItem("githubHistory");
      if (storedhistory) {
        sethistory(JSON.parse(storedhistory));
      }
    };

    loadhistory();

    const handlePreferenceUpdate = () => {
      loadhistory();
    };
    window.addEventListener("githubHistoryUpdated", handlePreferenceUpdate);

    return () => {
      window.removeEventListener(
        "githubHistoryUpdated",
        handlePreferenceUpdate
      );
    };
  }, []);

  const parseUrl = (hist: { [key: string]: string }) => {
    router.push(
      `/${hist.sanitizedUsername}/${hist.sanitizedRepo}?branch=${hist.branch}`
    );
  };

  const refreshhistory = () => {
    const storedhistory = localStorage.getItem("githubhistory");
    if (storedhistory) {
      sethistory(JSON.parse(storedhistory));
    }
    toast.success("History refreshed!");
  }

  const deletehistory = () => {
    localStorage.removeItem("githubhistory");
    sethistory([]);
    toast.success("All history deleted!");
  };

  const togglePrefSideCard = () => {
    const histCard = document.getElementById("history-card");
    if (histCard) {
      if (!isOpen) {
        histCard.style.transform = "translateX(0)";
        histCard.style.transition = "transform 0.25s ease-in-out";
        setTimeout(() => {
          histCard.style.opacity = "1";
        }, 250);
        setIsOpen(true);
      } else {
        histCard.style.transform = "translateX(-100%)";
        histCard.style.transition = "transform 0.25s ease-in-out";
        setIsOpen(false);
      }
    }
  };
  return (
    <div aria-label="Saved repository history">
      <Card
        id="history-card"
        style={{ transform: "translateX(-100%)", opacity: "0.3" }}
        className="bg-background w-[80%] h-131 rounded-xl sm:h-155 sm:w-75 fixed top-92 sm:top-46 left-0 sm:m-4 mx-3 my-4 z-101 overflow-auto scrollbar-background-thumb scrollbar-background-bg hover:opacity-100"
      >
        <button
          id="togglebar"
          className={cn(
            "absolute bg-accent-foreground w-4 h-[100%] rounded-r-xl right-0 opacity-20 hover:opacity-100 cursor-pointer border-none"
          )}
          onClick={togglePrefSideCard}
          aria-label={isOpen ? "Close history sidebar" : "Open history sidebar"}
          aria-expanded={isOpen}
        />
        <CardHeader>
          <div className="flex flex-row justify-between items-center cursor-pointer pt-4">
            <span className="text-foreground text-xl font-semibold">
              {"Saved history"}
            </span>
            <div className="flex flex-row gap-x-4" role="group" aria-label="History actions">
              <Tooltip>
                <TooltipTrigger asChild id="refresh-history">
                  <button
                    className="text-accent bg-transparent border-none cursor-pointer"
                    onClick={refreshhistory}
                    aria-label="Refresh history list"
                  >
                    <RefreshCcw />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Refresh History</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild id="delete-history">
                  <button
                    className="text-accent bg-transparent border-none cursor-pointer"
                    onClick={deletehistory}
                    aria-label="Delete all history"
                  >
                    <Trash2 />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete all History</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <hr className="mx-6" />
        <CardContent>
          <ul className="text-sm text-muted-foreground px-9 list-disc" role="list">
            {!history || history.length !== 0
              ? history.map((hist, index) => (
                  <li
                    key={index}
                    className="cursor-pointer rounded-md hover:bg-accent-foreground py-1 px-2 wrap-anywhere"
                    onClick={() => parseUrl(hist)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        parseUrl(hist);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Navigate to ${hist.sanitizedUsername}/${hist.sanitizedRepo} branch ${hist.branch}`}
                  >
                    <span>
                      <strong>{hist.sanitizedUsername.toTitleCase()}</strong>/
                      <strong>{hist.sanitizedRepo.toTitleCase()}</strong>
                    </span>
                    <span>
                      {" "}
                      ::: <strong>{hist.branch}</strong>
                    </span>
                  </li>
                ))
              : "No saved history found."}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SavedHistory;
