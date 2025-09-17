import axios, { AxiosInstance } from "axios";
import yaml from "js-yaml";
import { parseStringPromise } from "xml2js";
import { Cvss3P0, Cvss4P0 } from "ae-cvss-calculator";
import {
  Ecosystem,
  Dependency,
  DependencyGroups,
  DependencyApiResponse,
  ManifestFile,
  ManifestFileContents,
  ManifestFiles,
  OSVBatchResponse,
  OSVQuery,
  TransitiveDependency,
  Vulnerability,
  DepsDevDependency,
  FileDetails,
  Branch,
  manifestFiles,
  MavenDependency,
} from "../constants/constants";

const GITHUB_API_BASE_URL = "https://api.github.com";

class AnalysisService {
  private client: AxiosInstance;

  constructor(githubPAT?: string) {
    this.client = axios.create({
      baseURL: GITHUB_API_BASE_URL,
      headers: githubPAT
        ? {
            Authorization: `Bearer ${githubPAT}`,
            Accept: "application/vnd.github.v3+json",
          }
        : {
            Accept: "application/vnd.github.v3+json",
          },
    });
  }

  /**
   * Fetches default branch for a given repo
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @returns Promise<string[]> - list of branch names
   */
  async getDefaultBranch(username: string, repo: string): Promise<string> {
    try {
      const response = await this.client.get(`/repos/${username}/${repo}`);
      return response.data.default_branch;
    } catch (error) {
      console.error("Error fetching default branch:", error);
      throw new Error("Failed to fetch default branch from GitHub");
    }
  }

  /**
   * Fetches branches for a given repo with true server-side pagination
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @param page - Page number (1-based)
   * @param perPage - Number of branches per page
   * @returns Promise<{ branches: string[]; defaultBranch: string; hasMore: boolean; total: number }>
   */
  async getBranches(
    username: string,
    repo: string,
    page: number = 1,
    perPage: number = 100
  ): Promise<{
    branches: string[];
    defaultBranch: string;
    hasMore: boolean;
    total: number;
  }> {
    try {
      // Fetch only the requested page from GitHub API
      const response = await this.client.get(
        `/repos/${username}/${repo}/branches`,
        { params: { per_page: perPage, page } }
      );

      const branches = response.data.map((branch: Branch) => branch.name);

      // Get default branch separately
      const defaultBranch = await this.getDefaultBranch(username, repo);

      // Determine if there are more pages by checking Link header
      let hasMore = false;
      let totalPages = page; // At least current page exists

      const linkHeader = response.headers["link"];
      if (linkHeader) {
        // Check if there's a "next" link
        hasMore = linkHeader.includes('rel="next"');

        // Try to parse total pages from "last" link
        const lastMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
        if (lastMatch) {
          totalPages = parseInt(lastMatch[1], 10);
        }
      } else if (response.data.length === perPage) {
        // If we got a full page and no Link header, there might be more
        hasMore = true;
      }

      // Estimate total branches count (this is approximate)
      const estimatedTotal = hasMore
        ? totalPages * perPage
        : (page - 1) * perPage + branches.length;

      return {
        branches,
        defaultBranch,
        hasMore,
        total: estimatedTotal,
      };
    } catch (error) {
      console.error("Error fetching branches:", error);
      throw new Error("Failed to fetch branches from GitHub");
    }
  }

  /**
   * Fetches manifest files (like package.json or requirements.txt) from a repo
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @param filePath - path to the file (relative to repo root)
   * @param branch - branch name (default: 'main')
   * @returns Promise<string> - file content in plain text from each manifest file grouped by ecosystem
   */
  async getAllManifestData(
    username: string,
    repo: string,
    branch = "main"
  ): Promise<ManifestFileContents> {
    try {
      //get file tree for the specified branch
      const response = await this.client.get(
        `/repos/${username}/${repo}/git/trees/${branch}?recursive=1`
      );

      // this is an array of file objects in the repo
      const tree = response.data.tree;

      //find the manifest files in the tree
      const manifestFilesList: ManifestFile[] = tree.filter(
        (file: ManifestFile) =>
          file.type === "blob" &&
          Object.values(manifestFiles).includes(
            file.path.split("/").pop() || ""
          )
      );

      // console.log("Manifest files found:", manifestFilesList);

      if (manifestFilesList.length === 0) {
        throw new Error("No manifest files found in the repository");
      }

      //group files by their names into ecosystem categories
      const groupedManifestFiles: ManifestFiles = {};

      for (const file of manifestFilesList) {
        const ecosystem = Object.keys(manifestFiles).find(
          (ecosystem) => manifestFiles[ecosystem] === file.path.split("/").pop()
        );
        if (ecosystem) {
          if (!groupedManifestFiles[ecosystem]) {
            groupedManifestFiles[ecosystem] = [];
          }
          groupedManifestFiles[ecosystem].push(file);
        }
      }
      // console.log("Grouped manifest files:", groupedManifestFiles);

      //now get the content of each manifest file from github
      const manifestFilesContent = await this.getManifestFileContents(
        groupedManifestFiles,
        username,
        repo,
        branch
      );

      //return the content of the manifest files grouped by ecosystem
      return manifestFilesContent;
    } catch (error) {
      console.error("Error fetching file data:", error);
      throw new Error("Failed to fetch file data from GitHub");
    }
  }

  /**
   * Fetches contents of manifest files grouped by ecosystem
   * @param groupedManifestFiles - object containing manifest files grouped by ecosystem
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @param branch - branch name (default: 'main')
   * @returns Promise<ManifestFileContents> - object containing file contents grouped by ecosystem
   */
  async getManifestFileContents(
    groupedManifestFiles: ManifestFiles,
    username: string,
    repo: string,
    branch: string
  ): Promise<ManifestFileContents> {
    const manifestFilesContent: ManifestFileContents = {};

    await Promise.all(
      Object.entries(groupedManifestFiles).map(async ([ecosystem, files]) => {
        const contents = await Promise.all(
          files.map(async (file) => {
            try {
              const response = await this.client.get(
                `/repos/${username}/${repo}/contents/${file.path}?ref=${branch}`
              );
              const content = response.data.content;
              if (content) {
                return {
                  path: file.path,
                  content: Buffer.from(content, "base64").toString("utf8"),
                };
              } else {
                throw new Error(`File ${file.path} has no content`);
              }
            } catch (error) {
              console.error(`Error fetching file ${file.path}:`, error);
              return null;
            }
          })
        );
        manifestFilesContent[ecosystem] = contents.filter(
          (c): c is { path: string; content: string } => c !== null
        );
      })
    );

    return manifestFilesContent;
  }

  async getParsedManifestFileContents(
    username: string,
    repo: string,
    branch: string,
    fileContents?: ManifestFileContents
  ): Promise<{ dependencies: DependencyGroups }> {
    const parsedDependencies: DependencyGroups = {};
    const seenDeps = new Set<string>();

    const manifestFiles = fileContents
      ? fileContents
      : await this.getAllManifestData(username, repo, branch);

    // console.log("Manifest files:", manifestFiles);

    // NPM package.json
    manifestFiles["npm"]?.forEach((fileContent) => {
      try {
        const packageJson = JSON.parse(fileContent.content);

        const processDeps = async (deps: Record<string, string>) => {
          for (const [name, version] of Object.entries(deps)) {
            let finalVersion = version;
            if (version === "*" || version === "latest" || !version) {
              finalVersion = await this.fetchLatestVersionFromNpm(name);
            }
            // console.log("Processing NPM Dep:", name, finalVersion);
            const ver = this.cleanVersion(finalVersion);
            const depKey = `${name}@${ver}@npm`;
            if (!seenDeps.has(depKey)) {
              seenDeps.add(depKey);
              if (!parsedDependencies[fileContent.path]) {
                parsedDependencies[fileContent.path] = [];
              }
              parsedDependencies[fileContent.path].push({
                name,
                version: this.formattedVersion(ver),
                ecosystem: Ecosystem.NPM,
              });
            }
          }
        };

        if (packageJson.dependencies) processDeps(packageJson.dependencies);
        if (packageJson.devDependencies)
          processDeps(packageJson.devDependencies);
      } catch (error) {
        console.error("Error parsing package.json:", error);
        throw new Error("Failed to parse package.json file");
      }
    });

    // Composer PHP
    manifestFiles["php"]?.forEach((fileContent) => {
      try {
        const composerJson = JSON.parse(fileContent.content);

        const processDeps = (deps: Record<string, string>) => {
          for (const [name, version] of Object.entries(deps)) {
            const ver = this.cleanVersion(version);
            const depKey = `${name}@${ver}@composer`;
            if (!seenDeps.has(depKey)) {
              seenDeps.add(depKey);
              if (!parsedDependencies[fileContent.path]) {
                parsedDependencies[fileContent.path] = [];
              }
              parsedDependencies[fileContent.path].push({
                name,
                version: this.formattedVersion(ver),
                ecosystem: Ecosystem.COMPOSER,
              });
            }
          }
        };

        if (composerJson.require) processDeps(composerJson.require);
        if (composerJson["require-dev"])
          processDeps(composerJson["require-dev"]);
      } catch (error) {
        console.error("Error parsing composer.json:", error);
        throw new Error("Failed to parse composer.json file");
      }
    });

    // Python requirements.txt
    if (manifestFiles["PiPY"]) {
      for (const fileContent of manifestFiles["PiPY"]) {
        const lines = fileContent.content
          .split("\n")
          .filter((line) => line.trim() && !line.trim().startsWith("#"));

        for (const line of lines) {
          const [name, version] = line.split("==");
          let ver = "unknown";

          if (name && !version) {
            try {
              const response = await axios.get(
                `https://pypi.org/pypi/${name.trim()}/json`
              );
              ver = response.data.info.version;
            } catch (error) {
              console.error(
                `Error fetching latest version for ${name.trim()}:`,
                error
              );
            }
          } else if (name && version) {
            ver = this.cleanVersion(version);
          }

          const depKey = `${name.trim()}@${ver}@PyPI`;
          if (!seenDeps.has(depKey)) {
            seenDeps.add(depKey);
            if (!parsedDependencies[fileContent.path]) {
              parsedDependencies[fileContent.path] = [];
            }
            parsedDependencies[fileContent.path].push({
              name,
              version: ver,
              ecosystem: Ecosystem.PYPI,
            });
          }
        }
      }
    }

    // Dart pubspec.yaml
    if (manifestFiles["Pub"]) {
      for (const fileContent of manifestFiles["Pub"]) {
        try {
          const pubspecYaml = yaml.load(fileContent.content) as {
            dependencies?: Record<string, string>;
            dev_dependencies?: Record<string, string>;
          };

          const processDeps = (deps: Record<string, string>) => {
            for (const [name, version] of Object.entries(deps)) {
              const ver = this.cleanVersion(version);
              const depKey = `${name}@${ver}@Pub`;
              if (!seenDeps.has(depKey)) {
                seenDeps.add(depKey);
                if (!parsedDependencies[fileContent.path]) {
                  parsedDependencies[fileContent.path] = [];
                }
                parsedDependencies[fileContent.path].push({
                  name,
                  version: ver,
                  ecosystem: Ecosystem.PUB,
                });
              }
            }
          };

          if (pubspecYaml.dependencies) processDeps(pubspecYaml.dependencies);
          if (pubspecYaml.dev_dependencies)
            processDeps(pubspecYaml.dev_dependencies);
        } catch (error) {
          console.error("Error parsing pubspec.yaml:", error);
          throw new Error("Failed to parse pubspec.yaml file");
        }
      }
    }

    // Java Maven pom.xml
    if (manifestFiles["Maven"]) {
      for (const fileContent of manifestFiles["Maven"]) {
        try {
          const result = await parseStringPromise(fileContent);
          const propertiesArray = result?.project?.properties?.[0];
          const propertiesMap: Record<string, string> = {};

          if (propertiesArray) {
            for (const key in propertiesArray) {
              if (Object.prototype.hasOwnProperty.call(propertiesArray, key)) {
                propertiesMap[key] = propertiesArray[key]?.[0] || "";
              }
            }
          }

          const dependencies =
            result?.project?.dependencies?.[0]?.dependency || [];

          dependencies.forEach((dep: MavenDependency) => {
            let version = dep.version?.[0] || "unknown";
            if (version.startsWith("${") && version.endsWith("}")) {
              const propName = version.slice(2, -1);
              version = propertiesMap[propName] || "unknown";
            }
            const ver = this.cleanVersion(version);
            const depKey = `${dep.artifactId?.[0] || ""}@${ver}@Maven`;
            if (!seenDeps.has(depKey)) {
              seenDeps.add(depKey);
              if (!parsedDependencies[fileContent.path]) {
                parsedDependencies[fileContent.path] = [];
              }
              parsedDependencies[fileContent.path].push({
                name: dep.artifactId?.[0] || "",
                version: this.formattedVersion(ver),
                ecosystem: Ecosystem.MAVEN,
              });
            }
          });
        } catch (error) {
          console.error("Error parsing pom.xml:", error);
          throw new Error("Failed to parse pom.xml file");
        }
      }
    }

    // RubyGems Gemfile
    if (manifestFiles["RubyGems"]) {
      for (const fileContent of manifestFiles["RubyGems"]) {
        // Only parse lines starting with gem
        const lines = fileContent.content
          .split("\n")
          .filter((line) => line.trim().startsWith("gem "));
        for (const line of lines) {
          // Match: gem "name", "version" or gem 'name', '~> 1.0.0'
          const match = line.match(
            /gem ['"]([^'"]+)['"](, *['"]([^'"]+)['"])?/
          );
          if (match) {
            const name = match[1];
            const version = match[3] || "unknown";
            const depKey = `${name}@${version}@rubygems`;
            if (!seenDeps.has(depKey)) {
              seenDeps.add(depKey);
              if (!parsedDependencies[fileContent.path]) {
                parsedDependencies[fileContent.path] = [];
              }
              parsedDependencies[fileContent.path].push({
                name,
                version: this.formattedVersion(this.cleanVersion(version)),
                ecosystem: Ecosystem.RUBYGEMS,
              });
            }
          }
        }
      }
    }

    console.log("Parsed dependencies:", parsedDependencies);

    return { dependencies: parsedDependencies };
  }

  /**
   * Analyzes dependencies in a repository and returns vulnerabilities
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @param branch - branch name (default: 'main')
   * @returns Promise<DependencyApiResponse> - object containing parsed dependencies and vulnerabilities
   */
  async analyseDependencies(
    username: string,
    repo: string,
    branch: string,
    fileContents?: ManifestFileContents
  ): Promise<DependencyApiResponse> {
    const dependenciesResponse = await this.getParsedManifestFileContents(
      username,
      repo,
      branch,
      fileContents
    );
    const dependencies = dependenciesResponse.dependencies;

    // console.log("Dependencies found:", dependencies);

    if (!dependencies || Object.keys(dependencies).length === 0) {
      return {
        dependencies: {},
        error: "No dependencies found in the repository",
      };
    }

    const dependenciesWithChildren =
      await this.getTransitiveDependencies(dependencies);
    console.log(
      "Dependencies with transitive dependencies:",
      dependenciesWithChildren
    );

    const analysedDependencies: DependencyGroups =
      await this.getAnalyzedDependencies(dependenciesWithChildren);

    return {
      dependencies: analysedDependencies,
      error: "",
    };
  }

  /**
   * Filters transitive dependencies to only keep nodes and edges with vulnerabilities
   * @param dependencies - DependencyGroups after vulnerability enrichment
   * @returns DependencyGroups with only vulnerable transitive nodes/edges
   */
  filterVulnerableTransitives(
    dependencies: DependencyGroups
  ): DependencyGroups {
    Object.values(dependencies)
      .flat()
      .forEach((dep) => {
        if (dep.transitiveDependencies && dep.transitiveDependencies.nodes) {
          // Keep only nodes with vulnerabilities OR nodes of type SELF
          const vulnerableNodes = dep.transitiveDependencies.nodes.filter(
            (node) =>
              (node.vulnerabilities && node.vulnerabilities.length > 0) ||
              node.dependencyType === "SELF"
          );
          // Build mapping from old index to new index
          const oldToNewIndex: Record<number, number> = {};
          dep.transitiveDependencies.nodes.forEach((node, oldIdx) => {
            const newIdx = vulnerableNodes.findIndex(
              (n) =>
                n.name === node.name &&
                n.version === node.version &&
                n.ecosystem === node.ecosystem
            );
            if (newIdx !== -1) {
              oldToNewIndex[oldIdx] = newIdx;
            }
          });
          // Remap edges to new indices and filter out edges where either node is missing
          const madeEdges = new Set<string>();
          const vulnerableEdges = (dep.transitiveDependencies.edges || [])
            .map((edge) => {
              let newSource = oldToNewIndex[edge.source];
              let newTarget = oldToNewIndex[edge.target];
              // If missing, attach to main parent node (index 0)
              if (newSource === undefined) newSource = 0;
              if (newTarget === undefined) newTarget = 0;
              // Avoid 0 to 0 self-loop
              if (newSource === 0 && newTarget === 0) return null;
              if (madeEdges.has(`${newSource}-${newTarget}`)) return null;
              madeEdges.add(`${newSource}-${newTarget}`);
              return {
                source: newSource,
                target: newTarget,
                requirement: edge.requirement,
              };
            })
            .filter((e) => e !== null) as {
            source: number;
            target: number;
            requirement: string;
          }[];
          dep.transitiveDependencies.nodes = vulnerableNodes;
          dep.transitiveDependencies.edges = vulnerableEdges;
        }
      });
    return dependencies;
  }

  /**
   * Filters main dependencies to only keep those with vulnerabilities or with vulnerable transitives
   * @param dependencies - DependencyGroups after vulnerable transitives filtering
   * @returns DependencyGroups with only relevant main dependencies
   */
  filterMainDependencies(dependencies: DependencyGroups): DependencyGroups {
    const filtered: DependencyGroups = {};
    Object.entries(dependencies).forEach(([group, deps]) => {
      const relevantDeps = deps.filter((dep) => {
        const hasVulns = dep.vulnerabilities && dep.vulnerabilities.length > 0;
        const transitiveHasVulns =
          dep.transitiveDependencies &&
          dep.transitiveDependencies.nodes &&
          dep.transitiveDependencies.nodes.some(
            (node) => node.vulnerabilities && node.vulnerabilities.length > 0
          );
        return hasVulns || transitiveHasVulns;
      });
      if (relevantDeps.length > 0) {
        filtered[group] = relevantDeps;
      }
    });
    console.log("Filtered main dependencies:");
    console.dir(filtered, { depth: null });
    return filtered;
  }

  async getAnalyzedDependencies(
    dependencies: DependencyGroups
  ): Promise<DependencyGroups> {
    const osvApiBatchUrl = "https://api.osv.dev/v1/querybatch";
    const osvApiVulnUrl = "https://api.osv.dev/v1/vulns/";
    const batchSize = 1000;
    const vulnsIDs = new Set<string>();

    // Flatten all dependencies for batch processing
    const allDeps: Dependency[] = Object.values(dependencies).flat();
    // Collect all transitive nodes for batch vulnerability lookup
    const allTransitiveNodes: Dependency[] = [];
    allDeps.forEach((dep) => {
      if (dep.transitiveDependencies && dep.transitiveDependencies.nodes) {
        allTransitiveNodes.push(...dep.transitiveDependencies.nodes);
      }
    });
    // Combine main and transitive dependencies
    const allForVuln: Dependency[] = [...allDeps, ...allTransitiveNodes];
    const depMap = new Map<string, Dependency>();
    allForVuln.forEach((dep) => {
      const key = `${dep.ecosystem}:${dep.name}:${dep.version}`;
      dep.vulnerabilities = [];
      depMap.set(key, dep);
    });

    try {
      for (let i = 0; i < allForVuln.length; i += batchSize) {
        const batch = allForVuln.slice(i, i + batchSize);
        const queries: OSVQuery[] = batch.map((dep) => ({
          package: { name: dep.name, ecosystem: dep.ecosystem },
          version: dep.version,
        }));

        let paginatedQueries: {
          query: OSVQuery;
          depKey: string;
          pageToken: string;
        }[] = [];

        const response = await axios.post<OSVBatchResponse>(osvApiBatchUrl, {
          queries,
        });

        response.data.results.forEach((result, idx) => {
          const dep = batch[idx];
          const depKey = `${dep.ecosystem}:${dep.name}:${dep.version}`;
          if (result.vulns) {
            result.vulns.forEach((vuln) => {
              dep.vulnerabilities?.push({ id: vuln.id });
              vulnsIDs.add(vuln.id);
            });
          }
          if (result.next_page_token) {
            paginatedQueries.push({
              query: queries[idx],
              depKey,
              pageToken: result.next_page_token,
            });
          }
        });

        // Pagination loop
        while (paginatedQueries.length > 0) {
          const nextQueries = paginatedQueries.map((pq) => ({
            ...pq.query,
            page_token: pq.pageToken,
          }));
          const depKeys = paginatedQueries.map((pq) => pq.depKey);
          paginatedQueries = [];

          const nextResponse = await axios.post<OSVBatchResponse>(
            osvApiBatchUrl,
            { queries: nextQueries }
          );

          nextResponse.data.results.forEach((result, idx) => {
            const dep = depMap.get(depKeys[idx]);
            if (dep && result.vulns) {
              result.vulns.forEach((vuln) => {
                dep.vulnerabilities?.push({ id: vuln.id });
                vulnsIDs.add(vuln.id);
              });
            }
            if (result.next_page_token) {
              paginatedQueries.push({
                query: nextQueries[idx],
                depKey: depKeys[idx],
                pageToken: result.next_page_token,
              });
            }
          });
        }
      }

      // Fetch vuln details for all unique vuln IDs
      const vulnDetails = await Promise.all(
        Array.from(vulnsIDs).map(
          async (vulnId) =>
            (await axios.get<Vulnerability>(`${osvApiVulnUrl}${vulnId}`)).data
        )
      );

      // Attach full vuln details to dependencies and transitive nodes
      vulnDetails.forEach((vuln) => {
        const matchingDeps = allForVuln.filter((d) =>
          d.vulnerabilities?.some((v) => v.id === vuln.id)
        );
        matchingDeps.forEach((dep) => {
          dep.vulnerabilities = dep.vulnerabilities || [];
          const existingIndex = dep.vulnerabilities.findIndex(
            (v) => v.id === vuln.id
          );
          const fixAvailable =
            vuln?.affected?.[0]?.ranges?.[0]?.events?.filter((e) => e.fixed)[0]
              ?.fixed || "";
          const fullVuln: Vulnerability = {
            id: vuln.id,
            summary: vuln.summary,
            details: vuln.details,
            severityScore: this.getCVSSSeverity(vuln.severity!),
            references: vuln.references || [],
            affected: vuln.affected || [],
            aliases: vuln.aliases || [],
            fixAvailable: fixAvailable,
          };
          if (existingIndex !== -1) {
            dep.vulnerabilities[existingIndex] = fullVuln;
          } else {
            dep.vulnerabilities.push(fullVuln);
          }
        });
      });
    } catch (err) {
      console.error("Error fetching vulnerabilities:", err);
      throw new Error("Failed to fetch vulnerabilities from osv.dev");
    }
    // Filter transitive dependencies to only keep vulnerable nodes/edges
    const vulnerableDeps = this.filterVulnerableTransitives(dependencies);
    // Filter main dependencies to only keep those with vulnerabilities or vulnerable transitives
    return this.filterMainDependencies(vulnerableDeps);
    // return dependencies;
  }

  async analyseFile(fileDetails: FileDetails): Promise<DependencyApiResponse> {
    const { filename, content } = fileDetails;
    const parsedFileName =
      filename.split("_")[0] + "." + filename.split(".")[1];
    const ecosystem = Object.keys(manifestFiles).find(
      (ecosystem) => manifestFiles[ecosystem] === parsedFileName
    );

    // console.log("Parsed file name:", parsedFileName, ecosystem);

    if (!ecosystem) {
      return {
        dependencies: {},
        error: "Unsupported file type",
      };
    }

    const groupedFileContent = {
      [ecosystem]: [{ path: parsedFileName, content }],
    };

    const analysedDependencies = await this.analyseDependencies(
      "",
      "",
      "",
      groupedFileContent
    );

    // console.log("File Analyzed dependencies:", analysedDependencies);

    return analysedDependencies;
  }

  /**
   * Gets transitive dependencies for a list of dependencies from deps.dev
   * @param dependencies - list of dependencies to get transitive dependencies for
   * @returns Dependency[] - list of dependencies with transitive dependencies attached to them
   */
  async getTransitiveDependencies(
    dependencies: DependencyGroups
  ): Promise<DependencyGroups> {
    const depsDevErr: {
      name: string;
      version: string;
      ecosystem: Ecosystem;
    }[] = [];
    const depsDevBaseUrl = "https://api.deps.dev/v3/systems";

    //iterate over each dep and attach the transitive dependencies to the object
    await Promise.all(
      Object.values(dependencies)
        .flat()
        .map(async (dep) => {
          const transitiveDependencies: TransitiveDependency = {
            nodes: [],
            edges: [],
          };

          // console.log("Fetching transitive dependencies for:", dep.name, dep.version, dep.ecosystem);
          if (dep.version === "unknown") {
            return;
          }
          try {
            const transitiveUrl = `${depsDevBaseUrl}/${dep.ecosystem}/packages/${encodeURIComponent(dep.name)}/versions/${encodeURIComponent(this.formattedVersion(dep.version))}:dependencies`;
            const transitiveDeps = (
              await axios.get<DepsDevDependency>(transitiveUrl)
            ).data;
            //map the data from deps.dev to our Dependency type
            if (transitiveDeps) {
              transitiveDeps.nodes.map((node) => {
                // console.log("NODE:", node.versionKey.system, this.mapEcosystem(node.versionKey.system));
                // if (index > 0) {
                transitiveDependencies.nodes?.push({
                  name: node.versionKey.name,
                  version: node.versionKey.version,
                  ecosystem: this.mapEcosystem(node.versionKey.system),
                  vulnerabilities: [],
                  dependencyType: node.relation,
                });
                // }
              });
              //add the edges from the deps.dev response to the transitive dependencies
              transitiveDependencies.edges = [
                ...transitiveDeps.edges.map((edge) => {
                  return {
                    source: edge.fromNode,
                    target: edge.toNode,
                    requirement: edge.requirement,
                  };
                }),
              ];
            }

            dep.transitiveDependencies = transitiveDependencies;
            console.log(dep.name);
            console.dir(transitiveDependencies, { depth: null });
          } catch {
            depsDevErr.push({
              name: dep.name,
              version: dep.version,
              ecosystem: dep.ecosystem,
            });
          }
        })
    );
    console.log("error fetching transitive dependencies for:", depsDevErr);
    return dependencies;
  }

  /**
   * Cleans and normalizes a dependency version string.
   */
  cleanVersion(version: string | undefined | null): string {
    if (!version || typeof version !== "string") return "unknown";
    const cleaned = version.replace(/^[^\d]*/, "");
    return cleaned || "unknown";
  }

  /**
   * Fetches the latest version of an npm package.
   */
  async fetchLatestVersionFromNpm(packageName: string): Promise<string> {
    try {
      const response = await axios.get(
        `https://registry.npmjs.org/${packageName}`
      );
      return response.data["dist-tags"]?.latest || "unknown";
    } catch (error) {
      console.error(
        `Failed to fetch latest version for ${packageName}:`,
        error
      );
      return "unknown";
    }
  }

  getCVSSSeverity(severity: { type: string; score: string }[]): {
    cvss_v3: string;
    cvss_v4: string;
  } {
    if (!severity || severity.length == 0)
      return { cvss_v3: "unknown", cvss_v4: "unknown" };

    const cvss3 = new Cvss3P0();
    const cvss4 = new Cvss4P0();

    try {
      severity.forEach((s) => {
        if (s.type.toLowerCase() === "cvss_v3") {
          cvss3.applyVector(s.score);
        }
        if (s.type.toLowerCase() === "cvss_v4") {
          cvss4.applyVector(s.score);
        }
      });

      return {
        cvss_v3: cvss3.calculateScores().overall.toString(),
        cvss_v4: cvss4.calculateScores().overall.toString(),
      };
    } catch (error) {
      console.error("Error parsing CVSS vector:", error);
      return { cvss_v3: "unknown", cvss_v4: "unknown" };
    }
  }

  mapEcosystem(system: string): Ecosystem {
    switch (system.toUpperCase()) {
      case "NPM":
        return Ecosystem.NPM;
      case "PHP":
        return Ecosystem.COMPOSER;
      case "PYPI":
        return Ecosystem.PYPI;
      case "PUB":
        return Ecosystem.PUB;
      case "MAVEN":
        return Ecosystem.MAVEN;
      case "RUBYGEMS":
        return Ecosystem.RUBYGEMS;
      default:
        return Ecosystem.NULL;
    }
  }

  formattedVersion(version: string): string {
    if (!version || typeof version !== "string") return "unknown";
    // Remove leading non-numeric characters
    const cleaned = version.trim().replace(/^[^\d]*/, "");
    // Split at first '-' or '+' (not at a dot)
    const [core, ...extraParts] = cleaned.split(/(?=[-+])/);
    const extra = extraParts.length ? extraParts.join("") : "";
    // Split core into segments
    const segments = core.split(".");
    const major =
      segments[0] && segments[0] !== "x" && segments[0] !== "*"
        ? segments[0]
        : "0";
    const minor =
      segments[1] && segments[1] !== "x" && segments[1] !== "*"
        ? segments[1]
        : "0";
    const patch =
      segments[2] && segments[2] !== "x" && segments[2] !== "*"
        ? segments[2]
        : "0";
    return `${major}.${minor}.${patch}${extra}`;
  }
}

export default AnalysisService;
