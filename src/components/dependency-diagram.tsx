"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import {
  EcosystemGraphMap,
  GraphEdge,
  GraphNode,
  Relation,
} from "@/constants/model";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import EmptyCard from "./empty-card";
import DiagramControls from "./diagram-controls";
import DiagramProgress from "./diagram-progress";
import ErrorBadge from "./error-badge";

interface DepDiagramProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  graphData?: EcosystemGraphMap;
  selectedEcosystem?: string;
  className?: string;
  isLoading?: boolean;
  isMobile?: boolean;
  windowSize: { width: number; height: number };
  isDiagramExpanded?: boolean;
  isNodeClicked?: boolean;
  isFixPlanLoading: boolean;
  error: string;
  manifestError: string[];
  onNodeClick?: (g: GraphNode) => void;
  setIsLoading?: (loading: boolean) => void;
  setIsMobile?: (isMobile: boolean) => void;
  setWindowSize: (size: { width: number; height: number }) => void;
  setIsDiagramExpanded?: (isDiagramExpanded: boolean) => void;
  setIsFixPlanLoading: (isFixPlanLoading: boolean) => void;
  generateFixPlan: () => void;
}

const DepDiagram = ({
  svgRef,
  graphData,
  selectedEcosystem,
  isLoading,
  isMobile,
  windowSize,
  isDiagramExpanded,
  isNodeClicked,
  manifestError,
  onNodeClick,
  setIsDiagramExpanded,
}: DepDiagramProps) => {
  const [centerNode, setCenterNode] = useState<GraphNode>();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<Set<GraphNode>>(
    new Set<GraphNode>()
  );
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(
    new Set<string>()
  );
  const [scale, setScale] = useState<number>(0.8);
  const resetRef = useRef<() => void>(() => {});
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelectionRef = useRef<d3.Selection<
    SVGSVGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const [BFSPathData, setBFSPathData] =
    useState<
      Map<string, { pathNodes: Set<GraphNode>; pathEdges: Set<string> }>
    >();

  // Memoize calculated dimensions to prevent unnecessary re-renders
  const {
    width,
    height,
    scaleWidth,
    scaleHeight,
    centerPositionX,
    centerPositionY,
    nodes
  } = useMemo(() => {
    // Calculate dimensions first, regardless of data availability
    const calculatedWidth = isMobile
      ? windowSize.width - 20
      : isNodeClicked
        ? windowSize.width * 0.64 - 20
        : windowSize.width - 100;

    const calculatedHeight = isMobile
      ? isDiagramExpanded
        ? windowSize.height - 150 - 8
        : windowSize.height - 380 - 8
      : isDiagramExpanded
        ? windowSize.height - 150 - 8
        : windowSize.height - 270 - 8;

    // Use a fixed scale value for layout calculations to prevent re-renders
    const layoutScale = 0.7;
    const calculatedScaleWidth = calculatedWidth / layoutScale;
    const calculatedScaleHeight = calculatedHeight / layoutScale;
    const calculatedCenterPositionX =
      (calculatedWidth - calculatedScaleWidth) / 2;
    const calculatedCenterPositionY =
      (calculatedHeight - calculatedScaleHeight) / 2;

    // Only return null for nodes/edges if data is truly missing
    if (!graphData || !selectedEcosystem || !graphData[selectedEcosystem]) {
      return {
        width: calculatedWidth,
        height: calculatedHeight,
        scaleWidth: calculatedScaleWidth,
        scaleHeight: calculatedScaleHeight,
        centerPositionX: calculatedCenterPositionX,
        centerPositionY: calculatedCenterPositionY,
        nodes: null
      };
    }

    const { nodes } = graphData[selectedEcosystem];

    return {
      width: calculatedWidth,
      height: calculatedHeight,
      scaleWidth: calculatedScaleWidth,
      scaleHeight: calculatedScaleHeight,
      centerPositionX: calculatedCenterPositionX,
      centerPositionY: calculatedCenterPositionY,
      nodes: nodes
    };
  }, [graphData, selectedEcosystem, isMobile, windowSize.width, windowSize.height, isNodeClicked, isDiagramExpanded]);

   const getHighlightedPathAndEdges = useCallback(
     (selectedId: string) => {
      if (!graphData || !selectedEcosystem || !graphData[selectedEcosystem] ||
          !graphData[selectedEcosystem].nodes || !graphData[selectedEcosystem].edges) {
        return {
          pathNodes: new Set<GraphNode>(),
          pathEdges: new Set<string>(),
        };
      }
      const { nodes: currentPathNodes, edges: currentPathEdges } = graphData[selectedEcosystem];
      if (BFSPathData && BFSPathData.has(selectedId)) {
         const cachedEdges = BFSPathData.get(selectedId)?.pathEdges;
         const cachedNodes = BFSPathData.get(selectedId)?.pathNodes;
         return {
           pathNodes: cachedNodes || new Set<GraphNode>(),
           pathEdges: cachedEdges || new Set<string>(),
         };
       }
       const pathMap: Record<string, GraphNode> = {};
       const resultPathNodes = new Set<GraphNode>();
       const resultPathEdges = new Set<string>();
       const queue: GraphNode[] = [];
       const visited = new Set<string>();

       const startNode = currentPathNodes.find((n: GraphNode) => n.type === Relation.CENTER);
       if (!startNode) return { pathNodes: resultPathNodes, pathEdges: resultPathEdges };

       queue.push(startNode);
       visited.add(startNode.id);

       while (queue.length > 0) {
         const currentNode = queue.shift();
         if (!currentNode) continue;

         if (currentNode.id === selectedId) {
           // Reconstruct path (backtracking)
           let current = currentNode;
           while (current) {
             resultPathNodes.add(current);
             const parent = pathMap[current.id];
             if (parent) {
               // Find the edge between parent and current
               const edge = currentPathEdges.find(
                 (e: GraphEdge) =>
                   ((e.source as GraphNode).id === parent.id &&
                     (e.target as GraphNode).id === current.id) ||
                   ((e.source as GraphNode).id === current.id &&
                     (e.target as GraphNode).id === parent.id)
               );
               if (edge) {
                 resultPathEdges.add(
                   `${(edge.source as GraphNode).id}-${(edge.target as GraphNode).id}`
                 );
               }
             }
             current = parent;
           }
           break;
         }

         // Add neighbors to queue
         for (const edge of currentPathEdges) {
           const sourceId =
             (edge.source as GraphNode).id || (edge.source as string);
           const targetId =
             (edge.target as GraphNode).id || (edge.target as string);

           if (sourceId === currentNode.id && !visited.has(targetId)) {
             const targetNode = currentPathNodes.find((n: GraphNode) => n.id === targetId);
             if (targetNode) {
               queue.push(targetNode);
               visited.add(targetId);
               pathMap[targetId] = currentNode;
             }
           } else if (targetId === currentNode.id && !visited.has(sourceId)) {
             const sourceNode = currentPathNodes.find((n: GraphNode) => n.id === sourceId);
             if (sourceNode) {
               queue.push(sourceNode);
               visited.add(sourceId);
               pathMap[sourceId] = currentNode;
             }
           }
         }
       }
       setBFSPathData((prev) => {
         const newMap = new Map(prev);
         newMap.set(selectedId, { pathNodes: resultPathNodes, pathEdges: resultPathEdges });
         return newMap;
       });
       return { pathNodes: resultPathNodes, pathEdges: resultPathEdges };
     },
     [BFSPathData, graphData, selectedEcosystem]
   );
  

  useEffect(() => {
    // More robust checks to prevent diagram disappearing
    if (!svgRef.current || !graphData || !selectedEcosystem || !graphData[selectedEcosystem]) {
      return;
    }
    
    const currentData = graphData[selectedEcosystem];
    // if (!currentData || !currentData.nodes || !currentData.edges || 
    //     !Array.isArray(currentData.nodes) || !Array.isArray(currentData.edges) ||
    //     currentData.nodes.length === 0) {
    //   return;
    // }
    
    // Use the data from graphData directly to avoid stale closures
    const { nodes: currentNodes, edges: currentEdges } = currentData;

    // Capture the current scale value to use throughout this effect
    const currentScale = scale;

    // Find center node immediately
    const centerNodeData = currentNodes.find((n) => n.type === Relation.CENTER);

    if (centerNodeData) {
      setCenterNode(centerNodeData);
    }

    // Initialize center node at the center position immediately
    if (centerNodeData && scaleWidth && scaleHeight) {
      centerNodeData.x = scaleWidth / 2;
      centerNodeData.y = scaleHeight / 2;
      centerNodeData.fx = scaleWidth / 2;
      centerNodeData.fy = scaleHeight / 2;
    }

    // console.log("Rendering graph:", nodes, edges);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 10])
      .range(["#58b368", "#e53935"]);

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr(
        "viewBox",
        `${centerPositionX} ${centerPositionY} ${scaleWidth} ${scaleHeight}`
      );

    // Store svg selection for zoom buttons
    svgSelectionRef.current = svg;

    // Clear existing content first
    svg.selectAll("*").remove();

    // Add glow filter for nodes (add after clearing)
    const defs = svg.append("defs");

    const filter = defs
      .append("filter")
      .attr("id", "node-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    filter
      .append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", 10)
      .attr("result", "blurOut");

    filter
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blurOut", "SourceGraphic"])
      .enter()
      .append("feMergeNode")
      .attr("in", (d) => d);

    // Add a group for zoom/pan
    const zoomGroup = svg.append("g");

    // Move edge, node, image, text elements into zoomGroup
    const edge = zoomGroup
      .append("g")
      .attr("stroke", "#aaa")
      .selectAll("line")
      .data(currentEdges as GraphEdge[])
      .enter()
      .append("line")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d: GraphEdge) =>
        d.type === Relation.TRANSITIVE ? "3 3" : null
      )
      .attr("stroke", (d) => {
        const sourceId = (d.source as GraphNode).id || d.source;
        const targetId = (d.target as GraphNode).id || d.target;
        const edgeKey = `${sourceId}-${targetId}`;
        const reverseEdgeKey = `${targetId}-${sourceId}`;
        return highlightedEdges.has(edgeKey) ||
          highlightedEdges.has(reverseEdgeKey)
          ? "#ffe875"
          : "#aaa";
      });

    const node = zoomGroup
      .append("g")
      .selectAll("circle")
      .data(currentNodes)
      .enter()
      .append("circle")
      .attr("filter", (d) => {
        return d.id === selectedNodeId ? "url(#node-glow)" : null;
      })
      .attr("r", (d) => {
        if (d.type === Relation.PRIMARY) return 25;
        if (d.type === Relation.TRANSITIVE) return 20;
        if (d.type === Relation.CENTER) return 30;
        return 15;
      })
      .attr("stroke", (d) => {
        if (
          d.id === selectedNodeId ||
          highlightedPath.has(d) ||
          d.type === Relation.CENTER
        )
          return "#000000";
        return "#ffffff";
      })
      .attr("stroke-width", (d) => {
        if (d.id === selectedNodeId) return 4; // Thicker border for selected
        if (highlightedPath.has(d)) return 2; // Medium border for path
        return 1.5;
      })
      .attr("fill", (d) => {
        if (d.type === Relation.CENTER) return "#EDEDED";
        if (d.vulnCount === 0) return "#EDEDED";
        if (d.id === selectedNodeId) return "#FFD700";
        if (highlightedPath.has(d)) return "#FFF55C";
        return colorScale(d.severity || 0);
      })
      .attr("opacity", (d) =>
        d.type === Relation.CENTER ? 1 : d.vulnCount! > 0 ? 1 : 0.2
      )
      .style("cursor", (d) =>
        d.type === Relation.CENTER
          ? "default"
          : d.vulnCount! > 0
            ? "pointer"
            : "not-allowed"
      )
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", function (event, d) {
        if (
          (d.type === Relation.PRIMARY || d.type === Relation.TRANSITIVE) &&
          d.vulnCount! > 0 &&
          onNodeClick
        ) {
          console.log("EVENT", event, d);
          if (selectedNodeId === d.id) {
            setSelectedNodeId(null);
            setHighlightedPath(new Set<GraphNode>());
            setHighlightedEdges(new Set<string>());
          } else {
            setSelectedNodeId(d.id);
            const { pathNodes, pathEdges } = getHighlightedPathAndEdges(d.id);
            setHighlightedPath(pathNodes);
            setHighlightedEdges(pathEdges);
          }
          onNodeClick(d);
          setTimeout(() => center(d.id), 200); // Center after state updates
        }
      });

    // Add image to the center node (repo node)
    const imageSize = 40;
    const imageGroup = zoomGroup.append("g");

    if (centerNode && centerNode.icon) {
      imageGroup
        .append("image")
        .attr("href", centerNode.icon)
        .attr("width", imageSize)
        .attr("height", imageSize)
        .attr(
          "x",
          centerNode.x
            ? centerNode.x - imageSize / 2
            : width / 2 - imageSize / 2
        )
        .attr(
          "y",
          centerNode.y
            ? centerNode.y - imageSize / 2
            : height / 2 - imageSize / 2
        )
        .datum(centerNode as GraphNode)
        .call(
          d3
            .drag<SVGImageElement, GraphNode>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );
    }

    // Add severity score text inside each node
    const severityText = zoomGroup
      .append("g")
      .selectAll("text.severity")
      .data(currentNodes)
      .enter()
      .append("text")
      .attr("class", "severity")
      .text((d) => (d.severity !== undefined && d.vulnCount ? d.severity : ""))
      .attr("font-size", 14)
      .attr("font-weight", 700)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("pointer-events", "none")
      .style("fill", (d) => {
        if (highlightedPath.has(d)) {
          return "#201d37";
        }
        return "#fff";
      })
      .style("cursor", "pointer");

    const label = zoomGroup
      .append("g")
      .selectAll("text")
      .data(currentNodes)
      .enter()
      .append("text")
      .text((d) => d.label)
      .attr("font-size", 12)
      .attr("font-weight", 500)
      .attr("text-anchor", "middle")
      .attr("dy", "3.25em")
      .style("text-shadow", "2px 2px 4px black")
      .style("fill", "white");

    const version = zoomGroup
      .append("g")
      .selectAll("text")
      .data(currentNodes)
      .enter()
      .append("text")
      .text((d) =>
        d.type === Relation.PRIMARY || d.type === Relation.TRANSITIVE
          ? (d.version ?? "unknown")
          : ""
      )
      .attr("font-size", 12)
      .attr("text-anchor", "middle")
      .attr("dy", "3.25em")
      .style("text-shadow", "1px 1px 2px black")
      .style("fill", "#FDFDFD");

    // D3 zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on("start", () => setIsDragging(true))
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      })
      .on("end", (event) => {
        setIsDragging(false);
        setScale(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Force simulation for positioning nodes
    const simulation = d3
      .forceSimulation(currentNodes)
      .force(
        "edge",
        d3
          .forceLink(currentEdges)
          .id((d: d3.SimulationNodeDatum) => (d as GraphNode).id)
          .distance((d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => {
            const edge = d as GraphEdge;
            switch (edge.type) {
              case Relation.PRIMARY:
                return 200;
              case Relation.TRANSITIVE:
                return 175;
            }
            return isMobile ? 150 : 200;
          })
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: d3.SimulationNodeDatum) => {
          const node = d as GraphNode;
          let baseCharge = -700;
          switch (node.type) {
            case Relation.CENTER:
              baseCharge = -600;
              break;
            case Relation.PRIMARY:
              baseCharge = -800;
              break;
            case Relation.TRANSITIVE:
              baseCharge = -1000;
              break;
          }
          return baseCharge;
        })
      )
      .on("tick", ticked);

    function ticked() {
      edge
        .attr("x1", (d: GraphEdge) => (d.source as GraphNode).x || 0)
        .attr("y1", (d: GraphEdge) => (d.source as GraphNode).y || 0)
        .attr("x2", (d: GraphEdge) => (d.target as GraphNode).x || 0)
        .attr("y2", (d: GraphEdge) => (d.target as GraphNode).y || 0)
        .attr("stroke", (d) => {
          const sourceId = (d.source as GraphNode).id || d.source;
          const targetId = (d.target as GraphNode).id || d.target;
          const edgeKey = `${sourceId}-${targetId}`;
          const reverseEdgeKey = `${targetId}-${sourceId}`;
          return highlightedEdges.has(edgeKey) ||
            highlightedEdges.has(reverseEdgeKey)
            ? "#FFD700"
            : "#aaa";
        });

      node
        .attr("cx", (d: GraphNode) => d.x || 0)
        .attr("cy", (d: GraphNode) => d.y || 0)
        .attr("fill", (d) => {
          if (d.type === Relation.CENTER) return "#EDEDED";
          if (d.vulnCount === 0) return "#EDEDED";

          if (d.id === selectedNodeId) return "#FFD700";

          if (highlightedPath.has(d)) return "#FFE55C";

          return colorScale(d.severity || 0);
        })
        .attr("stroke", (d) => {
          if (d.id === selectedNodeId) return "#FEFEFE";
          if (highlightedPath.has(d)) return "#FEFEFE";
          return "#fff";
        })
        .attr("stroke-width", (d) => {
          if (d.id === selectedNodeId) return 3;
          if (highlightedPath.has(d)) return 2;
          return 1.5;
        });

      // Position severity text at node center
      severityText
        .attr("x", (d: GraphNode) => d.x || 0)
        .attr("y", (d: GraphNode) => d.y || 0);

      label
        .attr("x", (d: GraphNode) => d.x || 0)
        .attr("y", (d: GraphNode) => d.y || 0);

      version
        .attr("x", (d: GraphNode) => d.x || 0)
        .attr("y", (d: GraphNode) => (d.y || 0) + 15);

      // Update image position on tick
      if (centerNode && centerNode.icon) {
        imageGroup
          .select("image")
          .attr("x", (centerNode.x || 0) - imageSize / 2)
          .attr("y", (centerNode.y || 0) - imageSize / 2);
      }
    }

    function dragstarted(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, SVGGElement>,
      d: GraphNode
    ) {
      setIsDragging(true);
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, SVGGElement>,
      d: GraphNode
    ) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, SVGGElement>,
      d: GraphNode
    ) {
      setIsDragging(false);
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    function center(targetNodeId?: string) {
      const nodeIdToCenter = targetNodeId || selectedNodeId;
      let targetNode: GraphNode | undefined;
      if (nodeIdToCenter && nodes) {
        const selectedNode = nodes.find((n) => n.id === nodeIdToCenter);
        if (
          selectedNode &&
          typeof selectedNode.x === "number" &&
          typeof selectedNode.y === "number"
        ) {
          targetNode = selectedNode;
        }
      }
      // Only fall back to center node if no target was found and no specific ID was requested
      if (!targetNode && !targetNodeId) {
        targetNode = centerNode;
      }
      if (
        targetNode &&
        typeof targetNode.x === "number" &&
        typeof targetNode.y === "number" &&
        width &&
        height
      ) {
        const tx = width / 2 - targetNode.x * currentScale;
        const ty = height / 2 - targetNode.y * currentScale;
        // console.log("Centering on node:", targetNode.label, "at", {
        //   selectedNodeId,
        //   targetNodeX: targetNode.x,
        //   targetNodeY: targetNode.y,
        //   tx,
        //   ty,
        //   width,
        //   height,
        //   currentScale,
        // });
        const transform = d3.zoomIdentity.translate(tx, ty).scale(currentScale);
        svg.transition().duration(0).call(zoom.transform, transform);
      }
    }

    // Center the graph on initial load
    if (!selectedNodeId && centerNodeData) {
      center();
    }

    resetRef.current = center;

    return () => {
      simulation.stop();
      svg.selectAll("*").remove();
      zoomRef.current = null;
      svgSelectionRef.current = null;
      resetRef.current = () => {};
      setBFSPathData(
        new Map<string, { pathNodes: Set<GraphNode>; pathEdges: Set<string> }>()
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    graphData,
    selectedEcosystem,
    selectedNodeId,
    width,
    height,
    scaleWidth,
    scaleHeight,
    centerPositionX,
    centerPositionY,
    centerNode,
    highlightedPath,
    highlightedEdges,
    isMobile,
    onNodeClick,
    isNodeClicked,
  ]);

  useEffect(() => {
    if (!isNodeClicked) {
      setHighlightedEdges(new Set<string>());
      setHighlightedPath(new Set<GraphNode>());
      setSelectedNodeId(null);
    }
  }, [isNodeClicked]);

  useEffect(() => {
    if (resetRef.current) {
      resetRef.current.call(selectedNodeId);
    }
  }, [width, height, selectedNodeId]);

  const handleZoomIn = () => {
    if (svgSelectionRef.current && zoomRef.current && svgRef.current) {
      const selection = d3.select(svgRef.current);
      selection.transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgSelectionRef.current && zoomRef.current && svgRef.current) {
      const selection = d3.select(svgRef.current);
      selection.transition().duration(300).call(zoomRef.current.scaleBy, 0.67);
    }
  };

  const handleResetZoom = () => {
    if (svgSelectionRef.current && zoomRef.current && svgRef.current) {
      setSelectedNodeId(null);
      setCenterNode(undefined);
      // setHighlightedPath(new Set<GraphNode>());
      // setHighlightedEdges(new Set<string>());
      const selection = d3.select(svgRef.current);
      zoomRef.current.scaleTo(selection, 1);
    }
  };

  const getNodePathBadge = () => {
    if (!selectedNodeId || highlightedPath.size === 0) return null;
    const badgePath = Array.from(highlightedPath)
      .reverse()
      .map((node) => node.label)
      .join(" > ");

    return (
      <div className="absolute w-full flex flex-row items-center justify-center pt-2 pointer-events-none">
        <Badge className="bg-sidebar-primary text-accent shadow-[0px_0px_50px_rgba(0,0,0,1)]">
          {badgePath}
        </Badge>
      </div>
    );
  };

  // useEffect(() => {
  //   manifestError.push("Please try re-uploading your manifest file.");
  //   manifestError.push("Please try re-uploading your manifest file.");
  // }, [manifestError]);

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="w-full h-full flex flex-col items-center justify-center py-2">
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{ width: windowSize.width, height: windowSize.height / 2 }}
            aria-label="loading-diagram"
          >
            <DiagramProgress />
          </div>
        ) : (
          <div className="relative" style={{ width, height }}>
            {getNodePathBadge()}
            <ErrorBadge errorMsgs={manifestError} isMobile={isMobile} />
            {graphData && selectedEcosystem && graphData[selectedEcosystem] ? (
              <svg
                ref={svgRef}
                scale={scale}
                className={cn(
                  "border-1 border-accent rounded-xl bg-black/50 flex h-full w-full",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              ></svg>
            ) : (
              <EmptyCard size={400} />
            )}
            {!isLoading &&
              graphData &&
              selectedEcosystem &&
              graphData[selectedEcosystem] && (
                <DiagramControls
                  handleZoomIn={handleZoomIn}
                  handleZoomOut={handleZoomOut}
                  handleResetZoom={handleResetZoom}
                  isDiagramExpanded={isDiagramExpanded}
                  setIsDiagramExpanded={setIsDiagramExpanded}
                  scale={scale}
                />
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DepDiagram, (prevProps, nextProps) => {
  return (
    prevProps.graphData === nextProps.graphData &&
    prevProps.selectedEcosystem === nextProps.selectedEcosystem &&
    prevProps.isNodeClicked === nextProps.isNodeClicked &&
    prevProps.windowSize.width === nextProps.windowSize.width &&
    prevProps.windowSize.height === nextProps.windowSize.height &&
    prevProps.isDiagramExpanded === nextProps.isDiagramExpanded &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.manifestError === nextProps.manifestError &&
    prevProps.svgRef === nextProps.svgRef
  );
});
