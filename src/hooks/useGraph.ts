//this file is used to get the manifest data from the backend.
//then we will feed the dependencies to the vulnerability scanner

import { analyseDependencies } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
  Dependency,
  EcosystemGraphMap,
  GraphData,
  GroupedDependencies,
  ManifestFileContentsApiResponse,
  manifestFiles,
  Relation,
  TransitiveDependency,
  Vulnerability,
} from "@/constants/constants";

//and then based on the results we will create a graph
export const useGraph = (
  refreshTrigger: number,
  setError: (error: string) => void,
  username?: string,
  repo?: string,
  branch?: string,
  file?: string,
) => {
  const [dependencies, setDependencies] = useState<GroupedDependencies>({});
  const [manifestData, setManifestData] = useState<ManifestFileContentsApiResponse | null>(null);
  const [graphData, setGraphData] = useState<EcosystemGraphMap>({});
  const [loading, setLoading] = useState(true);

  const fetchDependencies = useCallback(
    async (username?: string, repo?: string, branch?: string, file?: string) => {
      try {
        const manifestData: ManifestFileContentsApiResponse =
          await analyseDependencies(username!, repo!, branch!, file!);
        console.log("Manifest Data:", manifestData, Object.values(manifestData).flat().length);
        if(manifestData && manifestData.error)
        {
          setError(manifestData.error);
          setLoading(false);
          return;
        }
        if (!manifestData || !manifestData.dependencies) {
          
          setLoading(false);
          return;
        }
        setManifestData(manifestData);
        //group the dependencies by technology
        const groupedDependencies = (Object.entries(manifestData.dependencies).flatMap(([filePath, deps]) =>{
          return deps.map((dep) => ({
            ...dep,
            filePath,
          }));
        })).reduce(
          (acc: GroupedDependencies, dep: Dependency) => {
            if (!acc[dep.ecosystem]) {
              acc[dep.ecosystem] = [];
            }
            acc[dep.ecosystem].push(dep);
            return acc;
          },
          {}
        );
        console.log("Grouped Dependencies:", groupedDependencies);
        setDependencies(groupedDependencies);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching manifest file contents:", err);
        setError(
          "Failed to fetch manifest file contents. Please try again later."
        );
        setLoading(false);
        return;
      }
    },
    [setDependencies, setLoading, setError]
  );

  const createGraphData = useCallback(
    (dependencies: GroupedDependencies) => {
      const graphData: EcosystemGraphMap = {};

      Object.entries(dependencies).forEach(([ecosystem, deps]) => {
        const nodes: GraphData["nodes"] = [];
        const edges: GraphData["edges"] = [];

        // Add central repo node for this ecosystem graph
        const repoNodeId = `${username}/${repo}`;
        nodes.push({
          id: repoNodeId,
          label: manifestFiles[ecosystem].file || ecosystem,
          icon: manifestFiles[ecosystem].icon || undefined,
          type: Relation.CENTER
        });

        const addedNodeIds = new Set<string>();
        // Add dependency nodes and links for the ones that have vulnerabilities
        deps.forEach((dep) => {
          if (
            (!dep.vulnerabilities || dep.vulnerabilities.length === 0) &&
            !dep.transitiveDependencies?.nodes?.some(
              (transNode) =>
                transNode?.vulnerabilities &&
                transNode?.vulnerabilities.length > 0
            )
          ) {
            return;
          }
          // Find max CVSS score for the dependency
          const maxCvss = getSeverityScores(dep.vulnerabilities!);
          const depNodeId = `${dep.name}@${dep.version}`;

          edges.push({
            source: repoNodeId,
            target: depNodeId,
            type: Relation.PRIMARY,
          });

          if (addedNodeIds.has(depNodeId)) {
            console.warn("Duplicate dependency node found:", depNodeId);
            return;
          }

          // console.log("DEP COUNT", dep.vulnerabilities?.length, depNodeId);
          nodes.push({
            id: depNodeId,
            label: dep.name,
            type: Relation.PRIMARY,
            version: dep.version,
            ecosystem: dep.ecosystem,
            severity: maxCvss,
            vulnCount: dep.vulnerabilities!.length,
          });
          // console.log(depNodeId);

          addedNodeIds.add(depNodeId); // <-- Track added node IDs

          // Add vulnerable transitive nodes and edges
          const transDeps: TransitiveDependency =
            dep.transitiveDependencies || {};
          if (transDeps) {
            transDeps.nodes?.forEach((transNode) => {
              if (
                !transNode.vulnerabilities ||
                transNode.vulnerabilities.length === 0
              ) {
                return;
              }
              const transNodeId = `${transNode.name}@${transNode.version}`;
              const maxTransCvss = getSeverityScores(transNode.vulnerabilities);
              // console.log("Is there duplicate node", transNodeId, addedNodeIds.has(transNodeId));
              if (
                transNode.dependencyType !== Relation.SELF &&
                !addedNodeIds.has(transNodeId)
              ) {
                nodes.push({
                  id: transNodeId,
                  label: transNode.name,
                  type: Relation.TRANSITIVE,
                  version: transNode.version,
                  ecosystem: transNode.ecosystem,
                  severity: maxTransCvss,
                  vulnCount: transNode.vulnerabilities.length,
                });
                addedNodeIds.add(transNodeId); // <-- Track added node IDs
              }
            });
          }
          // if (transDeps && Array.isArray(transDeps.nodes)) {
          // Optionally, add edges between transitive nodes if present in backend
          if (transDeps.edges && Array.isArray(transDeps.edges) && transDeps.edges.length > 0) {
            transDeps.edges.forEach((edge) => {
              const nodesArr = transDeps.nodes || [];
              const sourceNode = nodesArr[edge.source];
              const targetNode = nodesArr[edge.target];
              
              // console.log("Transitive Edge:", sourceNode, targetNode);
              // Ensure both nodes exist and have vulnerabilities
              if (!sourceNode || !targetNode) return;
              // if (
              //   !sourceNode.vulnerabilities ||
              //   sourceNode.vulnerabilities.length === 0
              // )
              //   return;
              // if (
              //   !targetNode.vulnerabilities ||
              //   targetNode.vulnerabilities.length === 0
              // )
                // return;
              const sourceId = `${sourceNode.name}@${sourceNode.version}`;
              const targetId = `${targetNode.name}@${targetNode.version}`;
              edges.push({
                source: sourceId,
                target: targetId,
                type: Relation.TRANSITIVE
              });
            });
          } 
          else if (transDeps.nodes && transDeps.nodes.length > 0) {
            // If no edges, attach each transitive node to its parent dependency node
            transDeps.nodes.forEach((transNode) => {
              if (!transNode.vulnerabilities || transNode.vulnerabilities.length === 0) return;
              if (transNode.dependencyType === Relation.SELF) return;
              const transNodeId = `${transNode.name}@${transNode.version}`;
              edges.push({
                source: depNodeId,
                target: transNodeId,
                type: Relation.TRANSITIVE 
              });
            });
          }
        });

        graphData[ecosystem] = { nodes, edges };
      });

      console.log("Graph Data:", graphData);
      return graphData;
    },
    [username, repo]
  );

  const getSeverityScores = (vulnerabilities: Vulnerability[]) => {
    const scores = vulnerabilities
      .flatMap((v) => [
        Number(v.severityScore?.cvss_v3),
        Number(v.severityScore?.cvss_v4),
      ])
      .filter((v) => !isNaN(v));
    const maxCvss = Math.max(...scores, 0);
    return maxCvss;
  };
  
  console.log("USE GRAPH LOADING STATE", loading);
  useEffect(() => {
    setLoading(true);
    console.log("Fetching dependencies for:", {
      username,
      repo,
      branch,
      file,
      refreshTrigger,
    });
    fetchDependencies(username, repo, branch, file);
  }, [branch, file, repo, username, refreshTrigger, fetchDependencies]);

  useEffect(() => {
    if (Object.keys(dependencies).length > 0) {
      const newGraphData = createGraphData(dependencies);
      setGraphData(newGraphData);
    }
  }, [dependencies, createGraphData]);

  return {
    dependencies,
    setDependencies,
    graphData,
    setGraphData,
    manifestData,
    setManifestData,
    loading,
    setLoading,
  };
};
