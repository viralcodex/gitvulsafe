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
    <nav id="diagram-controls" aria-label="Diagram controls" role="">
      <div className="absolute bottom-16 right-4 flex flex-col items-center justify-center gap-2" role="group" aria-label="Zoom controls">
          <Tooltip>
            <TooltipTrigger asChild id="zoom-in-btn">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75 disabled:bg-ring"
                onClick={handleZoomIn}
                disabled={scale >= 2.0}
                aria-label={`Zoom in (current zoom: ${(scale * 100).toFixed(0)}%)`}
              >
                <PlusIcon strokeWidth={4} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom-in</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild id="zoom-out-btn">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75 disabled:bg-ring"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                aria-label={`Zoom out (current zoom: ${(scale * 100).toFixed(0)}%)`}
              >
                <MinusIcon strokeWidth={4} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom-out</TooltipContent>
          </Tooltip>
      </div>
      <div className="absolute bottom-4 right-4 flex flex-row items-center justify-center gap-2" role="group" aria-label="View controls">
          <Tooltip>
            <TooltipTrigger asChild id="reset-zoom">
              <Button
                className="p-4 rounded-md bg-muted-foreground text-background shadow hover:bg-accent cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-75"
                onClick={handleResetZoom}
                aria-label="Reset zoom and re-center diagram"
              >
                <RefreshCw strokeWidth={4} aria-hidden="true" />
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
                aria-label={isDiagramExpanded ? "Collapse diagram" : "Expand diagram"}
                aria-expanded={isDiagramExpanded}
              >
                {isDiagramExpanded ? (
                  <Minimize strokeWidth={4} aria-hidden="true" />
                ) : (
                  <Maximize strokeWidth={4} aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDiagramExpanded ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
      </div>
    </nav>
  );
};

export default DiagramControls;
