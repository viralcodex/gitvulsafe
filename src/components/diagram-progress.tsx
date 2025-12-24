import { useEffect, useState } from "react";
import { Progress } from "./ui/progress";
import { progressSSE } from "@/lib/api";
import toast from "react-hot-toast";
import { progressSteps } from "@/constants/constants";

const DiagramProgress = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing");
  const [dots, setDots] = useState<string>("");

  useEffect(() => {
    const eventSource = progressSSE(
      (step: string, prg: number) => {
        setProgress(Number(prg.toFixed(1)));
        setCurrentStep(step);
      },
      () => {
      },
      (error: string) => {
        console.error("SSE Error:", error);
        toast.error("Disconnected from server");
      }
    );

    return () => {
      console.log("Cleaning up progress SSE connection");
      eventSource.close();
    };
  }, []);

   useEffect(() => {
    const interval = setTimeout(() => {
      setDots((prev) => {
        const newDots = prev.length >= 3 ? "" : prev + ".";
        return newDots;
      });
    }, 750);
    return () => clearTimeout(interval);
  }, [dots]);

  //if step is almost done, show the step for a second before completing...
  useEffect(() => {
    if (currentStep === progressSteps["FINALISING_RESULTS"]) {
      const timeout = setTimeout(() => {
        setCurrentStep(progressSteps["FINALISING_RESULTS"]);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  },[currentStep]); 

  return (
    <div className="space-y-2 sm:w-[25%] w-[75%]" role="region" aria-label="Analysis progress">
      <Progress value={progress} className="w-full border-1 h-4" aria-label="Progress bar" />
      <div className="text-sm text-muted-foreground px-1 xl:text-lg" aria-live="polite" aria-atomic="true">
        <div className="flex flex-row items-center text-sm">
          <span aria-label={`Current step: ${currentStep}`}>
            {currentStep}
          </span>
          <span className="inline-block w-4 text-left" aria-hidden="true">
            {dots}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="" aria-label={`Progress: ${progress} percent complete`}>{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default DiagramProgress;
