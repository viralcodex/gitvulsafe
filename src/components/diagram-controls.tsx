import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip";
import {
  PlusIcon,
  MinusIcon,
  RefreshCw,
  Minimize,
  Maximize,
} from "lucide-react";
import React from "react";
import { Button } from "./ui/button";

interface DiagramControlsProps {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  isDiagramExpanded?: boolean;
  setIsDiagramExpanded?: (expanded: boolean) => void;
  scale?: number;
}
const DiagramControls = (props: DiagramControlsProps) => {
  const {
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    isDiagramExpanded,
    setIsDiagramExpanded,
    scale = 1.0,
  } = props;
  return (
    <div id="diagram-controls">
      <div className="absolute bottom-16 right-4 flex flex-col items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild id="reset-zoom">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75 disabled:bg-ring"
                onClick={handleZoomIn}
                disabled={scale >= 2.0}
              >
                <PlusIcon strokeWidth={4}/>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom-in</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild id="reset-zoom">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75 disabled:bg-ring"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <MinusIcon strokeWidth={4} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom-out</TooltipContent>
          </Tooltip>
      </div>
      <div className="absolute bottom-4 right-4 flex flex-row items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild id="reset-zoom">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75"
                onClick={handleResetZoom}
              >
                <RefreshCw strokeWidth={4} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-center</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild id="toggle-zoom">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75"
                onClick={() => {
                  if (setIsDiagramExpanded) {
                    setIsDiagramExpanded(!isDiagramExpanded);
                  }
                }}
              >
                {isDiagramExpanded ? (
                  <Minimize strokeWidth={4} />
                ) : (
                  <Maximize strokeWidth={4} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDiagramExpanded ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
      </div>
    </div>
  );
};

export default DiagramControls;
