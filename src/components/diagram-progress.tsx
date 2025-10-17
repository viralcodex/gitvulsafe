import { useEffect, useState } from "react";
import { Progress } from "./ui/progress";
import { progressSSE } from "@/lib/api";
import toast from "react-hot-toast";

const DiagramProgress = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing");
  const [dots, setDots] = useState<string>("");

  useEffect(() => {
    const eventSource = progressSSE(
      (step: string, prg: number) => {
        setCurrentStep(step);
        setProgress(Number(prg.toFixed(1)));
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
    }, 750)
    return () => clearTimeout(interval)
    }, [dots]);

  return (
    <div className="space-y-2 sm:w-[25%] w-[75%]">
      <Progress value={progress} className="w-full border-1 h-4" />
      <div className="text-sm text-muted-foreground px-1 xl:text-lg">
        <div className="flex flex-row items-center text-sm">
            <span>
              {currentStep}
            </span>
            <span className="inline-block w-4 text-left">{dots}</span>
          </div>
        <div className="flex justify-between items-center text-sm">
          <span className="">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default DiagramProgress;
