import { Cvss3P0, Cvss4P0 } from 'ae-cvss-calculator';
import axios from 'axios';
import yaml from 'js-yaml';
import { parseStringPromise } from 'xml2js';

import {
  DEPS_DEV_BASE_URL,
  OSV_DEV_VULN_BATCH_URL,
  OSV_DEV_VULN_DET_URL,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  DEFAULT_TRANSITIVE_BATCH_SIZE,
  DEFAULT_TRANSITIVE_CONCURRENCY,
  DEFAULT_VULN_BATCH_SIZE,
  DEFAULT_VULN_CONCURRENCY,
  PROGRESS_STEPS,
} from '../constants/constants';
import {
  Dependency,
  ManifestFileContents,
  ManifestFile,
  manifestFiles,
  ManifestFiles,
  DependencyGroups,
  Ecosystem,
  GithubFileContent,
  MavenDependency,
  OSVBatchResponse,
  Vulnerability,
  TransitiveDependencyResult,
  DepsDevDependency,
  TransitiveDependency,
  DependencyApiResponse,
  FileDetails,
  OSVQuery,
} from '../constants/model';

import GithubService from './github_service';
import ProgressService from './progress_service';

class AnalysisService {
  private globalDependencyMap;
  private dependencyFileMapping;
  private stepErrors;
  private progressService: ProgressService;
  private performanceConfig = {
    concurrency: DEFAULT_CONCURRENCY,
    batchSize: DEFAULT_BATCH_SIZE,
    vulnConcurrency: DEFAULT_VULN_CONCURRENCY,
    vulnBatchSize: DEFAULT_VULN_BATCH_SIZE,
    transitiveConcurrency: DEFAULT_TRANSITIVE_CONCURRENCY,
    transitiveBatchSize: DEFAULT_TRANSITIVE_BATCH_SIZE,
  };
  private githubService: GithubService;

  constructor(
    githubPAT: string = '',
    progressService: ProgressService | null = null,
  ) {
    this.stepErrors = new Map<string, string[]>();
    this.globalDependencyMap = new Map<string, Dependency>();
    this.dependencyFileMapping = new Map<string, string[]>();
    this.configurePerformance({
      concurrency: 10,
      batchSize: 100,
      vulnConcurrency: 50,
      vulnBatchSize: 50,
      transitiveConcurrency: 8,
      transitiveBatchSize: 15,
    });
    this.progressService = progressService ?? new ProgressService();
    this.githubService = new GithubService(githubPAT ?? '');
  }

  /**
   * Configure performance settings for API calls
   * @param config - Performance configuration options
   */
  configurePerformance(config: {
    concurrency?: number;
    batchSize?: number;
    vulnConcurrency?: number;
    vulnBatchSize?: number;
    transitiveConcurrency?: number;
    transitiveBatchSize?: number;
  }) {
    this.performanceConfig = {
      ...this.performanceConfig,
      ...config,
    };
  }

  /**
   * Process items in parallel batches with concurrency control
   * @param items - Array of items to process
   * @param batchSize - Size of each batch
   * @param concurrency - Number of concurrent batches
   * @param processor - Function to process each item
   * @param description - Description for logging
   * @returns Promise resolving to array of results
   */
  private async processBatchesInParallel<T, R>(
    items: T[],
    batchSize: number,
    concurrency: number,
    processor: (item: T) => Promise<R>,
    description: string,
    progressNumber: number,
  ): Promise<R[]> {
    const results: R[] = [];

    // Create batches
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    console.log(
      `${description}: Processing ${items.length} items in ${batches.length} batches with concurrency ${concurrency}`,
    );

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += concurrency) {
      const concurrentBatches = batches.slice(i, i + concurrency);

      const batchPromises = concurrentBatches.map(async (batch) => {
        const batchResults = await Promise.all(
          batch.map((item) => processor(item)),
        );
        return batchResults;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // Progress logging with intermediate progress tracking
      const processed = Math.min(i + concurrency, batches.length);
      const progressPercentage = (processed / batches.length) * 100;
      console.log(
        `${description}: Processed ${processed}/${batches.length} batches (${progressPercentage.toFixed(1)}%)`,
      );

      // Send progress update with the current step and percentage (not decimal sequence numbers)
      this.progressService.progressUpdater(
        description,
        progressPercentage,
        progressNumber, // Use the base progress number, not decimal adjustments
      );
    }

    return results;
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
    branch = 'main',
  ): Promise<ManifestFileContents> {
    try {
      //get file tree for the specified branch
      const response = await this.githubService.getGithubApiResponse(
        `/repos/${username}/${repo}/git/trees/${branch}?recursive=1`,
      );

      // this is an array of file objects in the repo
      const tree = response.data.tree;

      //find the manifest files in the tree
      const manifestFilesList: ManifestFile[] = tree.filter(
        (file: ManifestFile) =>
          file.type === 'blob' &&
          Object.values(manifestFiles).includes(
            file.path.split('/').pop() ?? '',
          ),
      );

      // console.log("Manifest files found:", manifestFilesList);

      if (manifestFilesList.length === 0) {
        throw new Error('No manifest files found in the repository');
      }

      //group files by their names into ecosystem categories
      const groupedManifestFiles: ManifestFiles = {};

      for (const file of manifestFilesList) {
        const ecosystem = Object.keys(manifestFiles).find(
          (ecosystem) =>
            manifestFiles[ecosystem] === file.path.split('/').pop(),
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
        branch,
      );

      //return the content of the manifest files grouped by ecosystem
      return manifestFilesContent;
    } catch (error) {
      console.error('Error fetching file data:', error);
      throw new Error('Failed to fetch file data from GitHub');
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
    branch: string,
  ): Promise<ManifestFileContents> {
    const manifestFilesContent: ManifestFileContents = {};

    await Promise.all(
      Object.entries(groupedManifestFiles).map(async ([ecosystem, files]) => {
        const contents = await Promise.all(
          files.map(async (file) => {
            try {
              const response = await this.githubService.getGithubApiResponse(
                `/repos/${username}/${repo}/contents/${file.path}?ref=${branch}`,
              );
              const content = response.data.content;
              if (content) {
                return {
                  path: file.path,
                  content: Buffer.from(content, 'base64').toString('utf8'),
                };
              } else {
                throw new Error(`File ${file.path} has no content`);
              }
            } catch (error) {
              console.error(`Error fetching file ${file.path}:`, error);
              this.addStepError('File Content Retrieval', error);
              return null;
            }
          }),
        );
        manifestFilesContent[ecosystem] = contents.filter((c) => c !== null);
      }),
    );

    return manifestFilesContent;
  }

  /**
   * Helper method to collect errors by step for consolidated reporting
   * @param step - The analysis step (e.g., 'File Parsing', 'Vulnerability Scanning')
   * @param error - The error object or message
   */
  private addStepError(step: string, error: any): void {
    if (!this.stepErrors.has(step)) {
      this.stepErrors.set(step, []);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.stepErrors.get(step)?.push(errorMessage);
  }

  /**
   * Consolidates step errors into summary messages
   */
  private consolidateStepErrors(): string[] {
    const consolidatedErrors: string[] = [];

    this.stepErrors.forEach((errors, step) => {
      if (errors.length > 0) {
        if (errors.length === 1) {
          consolidatedErrors.push(`${step}: ${errors[0]}`);
        } else {
          consolidatedErrors.push(
            `${step}: ${errors.length} issues encountered (${errors[0]})`,
          );
        }
      }
    });

    return consolidatedErrors;
  }

  /**
   * Adds a dependency to the global deduplication system
   * @param dependency - The dependency to add
   * @param filePath - The file path where this dependency was found
   */
  private addDependencyToGlobalMap(
    dependency: Dependency,
    filePath: string,
  ): void {
    const depKey = `${dependency.name}@${dependency.version}@${dependency.ecosystem}`;

    // Add to global dependency map if not already present
    if (!this.globalDependencyMap.has(depKey)) {
      this.globalDependencyMap.set(depKey, dependency);
    }

    // Track which files need this dependency
    if (!this.dependencyFileMapping.has(depKey)) {
      this.dependencyFileMapping.set(depKey, []);
    }
    const files = this.dependencyFileMapping.get(depKey);
    if (files && !files.includes(filePath)) {
      files.push(filePath);
    }
  }

  /**
   * Maps processed dependencies back to their respective files
   * @param processedDependencies - Dependencies with their analysis results
   * @returns DependencyGroups organized by file path
   */
  private mapDependenciesToFiles(
    processedDependencies: Map<string, Dependency>,
  ): DependencyGroups {
    const result: DependencyGroups = {};

    processedDependencies.forEach((dependency, depKey) => {
      const files = this.dependencyFileMapping.get(depKey) ?? [];
      files.forEach((filePath) => {
        if (!result[filePath]) {
          result[filePath] = [];
        }
        // Create a copy of the dependency for each file to avoid reference issues
        result[filePath].push({ ...dependency });
      });
    });

    return result;
  }

  /**
   * Resets the global deduplication state (useful for new analysis runs)
   */
  private resetGlobalState(): void {
    this.globalDependencyMap.clear();
    this.dependencyFileMapping.clear();
    this.stepErrors.clear(); // Reset step errors for new analysis
  }

  /**
   * Retry API calls with exponential backoff, skipping non-retryable errors
   * @param apiCall - Function that returns a Promise to retry
   * @param maxRetries - Maximum number of retry attempts
   * @param baseDelay - Base delay in milliseconds
   * @param operation - Description of the operation for logging
   * @returns Promise with the result of the API call
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 500,
    operation: string = 'API call',
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        const isNonRetryable = this.isNonRetryableError(error);
        if (isNonRetryable || attempt === maxRetries) {
          if (isNonRetryable) {
            console.warn(
              `${operation} failed with non-retryable error:`,
              error instanceof Error ? error.message : error,
            );
          } else {
            console.error(
              `${operation} failed after ${maxRetries} attempts:`,
              error instanceof Error ? error.message : error,
            );
          }
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 200;
        const totalDelay = delay + jitter;

        console.warn(
          `${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(totalDelay)}ms...`,
          error instanceof Error ? error.message : error,
        );

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Determines if an error is non-retryable (e.g., 404, 401, 403, 400)
   * @param error - The error to check
   * @returns true if the error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    // Handle axios errors
    if (error?.response?.status) {
      const status = error.response.status;
      // Don't retry client errors (4xx) except for rate limiting (429)
      return status >= 400 && status < 500 && status !== 429;
    }

    // Handle specific error messages that indicate non-retryable conditions
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('not found') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('bad request') ||
        message.includes('invalid') ||
        message.includes('malformed')
      );
    }

    return false;
  }

  /**
   *
   * @param username username of the github repo owner
   * @param repo repository name
   * @param branch branch of that repository
   * @param fileContents file contents to parse from that repository
   * @returns Grouped dependencies by file paths
   */
  async getParsedManifestFileContents(
    username: string,
    repo: string,
    branch: string,
    fileContents?: ManifestFileContents,
  ): Promise<{ dependencies: DependencyGroups }> {
    this.resetGlobalState();

    this.progressService.progressUpdater(PROGRESS_STEPS[0], 0, 1); // Progress #1

    const manifestFiles =
      fileContents ?? (await this.getAllManifestData(username, repo, branch));

    this.progressService.progressUpdater(PROGRESS_STEPS[0], 100, 2); // Progress #2

    this.progressService.progressUpdater(PROGRESS_STEPS[1], 0, 3); // Progress #3

    await Promise.all([
      this.processNpmFiles(manifestFiles['npm'] ?? []),
      Promise.resolve(this.processPhpFiles(manifestFiles['php'] ?? [])),
      this.processPythonFiles(manifestFiles['PiPY'] ?? []),
      Promise.resolve(this.processDartFiles(manifestFiles['Pub'] ?? [])),
      this.processMavenFiles(manifestFiles['Maven'] ?? []),
      Promise.resolve(this.processRubyFiles(manifestFiles['RubyGems'] ?? [])),
    ]);

    // Convert global dependency map to processed dependencies
    const processedDependencies = new Map(this.globalDependencyMap);

    // Map dependencies back to their respective files
    const result = this.mapDependenciesToFiles(processedDependencies);

    this.progressService.progressUpdater(PROGRESS_STEPS[1], 100, 4); // Progress #4

    // console.log('Parsed dependencies:', result);
    return { dependencies: result };
  }

  /**
   * Process NPM package.json files
   */
  private async processNpmFiles(
    files: Array<{ path: string; content: string }>,
  ): Promise<void> {
    await Promise.all(
      files.map(async (fileContent) => {
        try {
          const packageJson = JSON.parse(fileContent.content);

          const processDeps = async (deps: Record<string, string>) => {
            for (const [name, version] of Object.entries(deps)) {
              let finalVersion = version;
              if (version === '*' || version === 'latest' || !version) {
                finalVersion = await this.fetchLatestVersionFromNpm(name);
              }
              const dependency: Dependency = {
                name,
                version: this.normalizeVersion(finalVersion),
                ecosystem: Ecosystem.NPM,
              };
              this.addDependencyToGlobalMap(dependency, fileContent.path);
            }
          };

          if (packageJson.dependencies)
            await processDeps(packageJson.dependencies);
          if (packageJson.devDependencies)
            await processDeps(packageJson.devDependencies);
        } catch (error) {
          console.error('Error parsing package.json:', error);
          this.addStepError('File Parsing', error);
          throw new Error('Failed to parse package.json file');
        }
      }),
    );
  }

  /**
   * Process PHP composer.json files
   */
  private processPhpFiles(
    files: Array<{ path: string; content: string }>,
  ): void {
    files.forEach((fileContent) => {
      try {
        const composerJson = JSON.parse(fileContent.content);

        const processDeps = (deps: Record<string, string>) => {
          for (const [name, version] of Object.entries(deps)) {
            const dependency: Dependency = {
              name,
              version: this.normalizeVersion(version),
              ecosystem: Ecosystem.COMPOSER,
            };
            this.addDependencyToGlobalMap(dependency, fileContent.path);
          }
        };

        if (composerJson.require) processDeps(composerJson.require);
        if (composerJson['require-dev'])
          processDeps(composerJson['require-dev']);
      } catch (error) {
        console.error('Error parsing composer.json:', error);
        this.addStepError('File Parsing', error);
        throw new Error('Failed to parse composer.json file');
      }
    });
  }

  /**
   * Process Python requirements.txt files
   */
  private async processPythonFiles(
    files: Array<GithubFileContent>,
  ): Promise<void> {
    for (const fileContent of files) {
      const lines = fileContent.content
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#'));

      for (const line of lines) {
        const [name, version] = line.split('==');
        let ver = 'unknown';

        if (name && !version) {
          try {
            const response = await this.retryApiCall(
              () => axios.get(`https://pypi.org/pypi/${name.trim()}/json`),
              2,
              1000,
              `PyPI version lookup for ${name.trim()}`,
            );
            ver = response.data.info.version;
          } catch (error) {
            console.error(
              `Error fetching latest version for ${name.trim()}:`,
              error,
            );
            this.addStepError('Version Lookup', error);
          }
        } else if (name && version) {
          ver = this.normalizeVersion(version);
        }

        const dependency: Dependency = {
          name: name.trim(),
          version: ver,
          ecosystem: Ecosystem.PYPI,
        };
        this.addDependencyToGlobalMap(dependency, fileContent.path);
      }
    }
  }

  /**
   * Process Dart pubspec.yaml files
   */
  private processDartFiles(
    files: Array<{ path: string; content: string }>,
  ): void {
    files.forEach((fileContent) => {
      try {
        const pubspecYaml = yaml.load(fileContent.content) as {
          dependencies?: Record<string, string>;
          dev_dependencies?: Record<string, string>;
        };

        const processDeps = (deps: Record<string, string>) => {
          for (const [name, version] of Object.entries(deps)) {
            const dependency: Dependency = {
              name,
              version: this.normalizeVersion(version),
              ecosystem: Ecosystem.PUB,
            };
            this.addDependencyToGlobalMap(dependency, fileContent.path);
          }
        };

        if (pubspecYaml.dependencies) processDeps(pubspecYaml.dependencies);
        if (pubspecYaml.dev_dependencies)
          processDeps(pubspecYaml.dev_dependencies);
      } catch (error) {
        console.error('Error parsing pubspec.yaml:', error);
        this.addStepError('File Parsing', error);
        throw new Error('Failed to parse pubspec.yaml file');
      }
    });
  }

  /**
   * Process Java Maven pom.xml files
   */
  private async processMavenFiles(
    files: Array<{ path: string; content: string }>,
  ): Promise<void> {
    for (const fileContent of files) {
      try {
        const result = await parseStringPromise(fileContent.content);
        const propertiesArray = result?.project?.properties?.[0];
        const propertiesMap: Record<string, string> = {};

        if (propertiesArray) {
          for (const key in propertiesArray) {
            if (Object.prototype.hasOwnProperty.call(propertiesArray, key)) {
              propertiesMap[key] = propertiesArray[key]?.[0] ?? '';
            }
          }
        }

        const dependencies =
          result?.project?.dependencies?.[0]?.dependency ?? [];

        dependencies.forEach((dep: MavenDependency) => {
          let version = dep.version?.[0] ?? 'unknown';
          if (version.startsWith('${') && version.endsWith('}')) {
            const propName = version.slice(2, -1);
            version = propertiesMap[propName] ?? 'unknown';
          }
          const dependency: Dependency = {
            name: dep.artifactId?.[0] ?? '',
            version: this.normalizeVersion(version),
            ecosystem: Ecosystem.MAVEN,
          };
          this.addDependencyToGlobalMap(dependency, fileContent.path);
        });
      } catch (error) {
        console.error('Error parsing pom.xml:', error);
        this.addStepError('File Parsing', error);
        throw new Error('Failed to parse pom.xml file');
      }
    }
  }

  /**
   * Process Ruby Gemfiles
   */
  private processRubyFiles(
    files: Array<{ path: string; content: string }>,
  ): void {
    files.forEach((fileContent) => {
      const lines = fileContent.content
        .split('\n')
        .filter((line) => line.trim().startsWith('gem '));

      lines.forEach((line) => {
        const match = line.match(/gem ['"]([^'"]+)['"](, *['"]([^'"]+)['"])?/);
        if (match) {
          const name = match[1];
          const version = match[3] ?? 'unknown';
          const dependency: Dependency = {
            name,
            version: this.normalizeVersion(version),
            ecosystem: Ecosystem.RUBYGEMS,
          };
          this.addDependencyToGlobalMap(dependency, fileContent.path);
        }
      });
    });
  }

  /**
   * Filters transitive dependencies to only keep nodes and edges with vulnerabilities
   * @param dependencies - DependencyGroups after vulnerability enrichment
   * @returns DependencyGroups with only vulnerable transitive nodes/edges
   */
  filterVulnerableTransitives(
    dependencies: DependencyGroups,
  ): DependencyGroups {
    Object.values(dependencies)
      .flat()
      .forEach((dep) => {
        if (dep.transitiveDependencies?.nodes) {
          // Keep only nodes with vulnerabilities OR nodes of type SELF
          const vulnerableNodes = dep.transitiveDependencies.nodes.filter(
            (node) =>
              (node.vulnerabilities && node.vulnerabilities.length > 0) ||
              node.dependencyType === 'SELF',
          );
          // Build mapping from old index to new index
          const oldToNewIndex: Record<number, number> = {};
          dep.transitiveDependencies.nodes.forEach((node, oldIdx) => {
            const newIdx = vulnerableNodes.findIndex(
              (n) =>
                n.name === node.name &&
                n.version === node.version &&
                n.ecosystem === node.ecosystem,
            );
            if (newIdx !== -1) {
              oldToNewIndex[oldIdx] = newIdx;
            }
          });
          // Remap edges to new indices and filter out edges where either node is missing
          const madeEdges = new Set<string>();
          const vulnerableEdges = (dep.transitiveDependencies.edges ?? [])
            .map((edge) => {
              let newSource = oldToNewIndex[edge.source];
              let newTarget = oldToNewIndex[edge.target];
              // If missing, attach to main parent node (index 0)
              newSource ??= 0;
              newTarget ??= 0;
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
        const transitiveHasVulns = dep.transitiveDependencies?.nodes?.some(
          (node) => node.vulnerabilities && node.vulnerabilities.length > 0,
        );
        return hasVulns || transitiveHasVulns;
      });
      if (relevantDeps.length > 0) {
        filtered[group] = relevantDeps;
      }
    });
    // console.log('Filtered main dependencies:');
    // console.dir(filtered, { depth: null });
    return filtered;
  }

  /**
   * Gets transitive dependencies for a list of dependencies from deps.dev
   * @param dependencies - list of dependencies to get transitive dependencies for
   * @returns Dependency[] - list of dependencies with transitive dependencies attached to them
   */
  async getTransitiveDependencies(
    dependencies: DependencyGroups,
  ): Promise<DependencyGroups> {
    // Flatten all dependencies for batch processing
    const allDeps: Dependency[] = Object.values(dependencies).flat();
    const validDeps = allDeps.filter((dep) => dep.version !== 'unknown');

    console.log(
      `Fetching transitive dependencies for ${validDeps.length} dependencies...`,
    );
    this.progressService.progressUpdater(PROGRESS_STEPS[2], 0, 5); // Progress #5

    // Process transitive dependencies in parallel batches
    const transitiveDepsResults = await this.processBatchesInParallel(
      validDeps,
      this.performanceConfig.transitiveBatchSize,
      this.performanceConfig.transitiveConcurrency,
      async (dep: Dependency): Promise<TransitiveDependencyResult> => {
        try {
          if (dep.version === 'unknown') {
            throw new Error('Unknown version, skipping');
          }
          const transitiveUrl = `${DEPS_DEV_BASE_URL}/${dep.ecosystem}/packages/${encodeURIComponent(dep.name)}/versions/${encodeURIComponent(this.normalizeVersion(dep.version))}:dependencies`;

          const response = await this.retryApiCall(
            () => axios.get<DepsDevDependency>(transitiveUrl),
            4,
            800,
            `Transitive dependencies for ${dep.name}@${dep.version}`,
          );

          const transitiveDeps = response.data;
          if (transitiveDeps) {
            const transitiveDependencies: TransitiveDependency = {
              nodes: [],
              edges: [],
            };

            // Map the data from deps.dev to our Dependency type
            transitiveDeps.nodes.forEach((node) => {
              transitiveDependencies.nodes?.push({
                name: node.versionKey.name,
                version: node.versionKey.version,
                ecosystem: this.mapEcosystem(node.versionKey.system),
                vulnerabilities: [],
                dependencyType: node.relation,
              });
            });

            // Add the edges from the deps.dev response
            transitiveDependencies.edges = transitiveDeps.edges.map((edge) => ({
              source: edge.fromNode,
              target: edge.toNode,
              requirement: edge.requirement,
            }));

            return {
              dependency: dep,
              transitiveDependencies,
              success: true,
            };
          }
        } catch (error) {
          console.warn(
            `Failed to fetch transitive dependencies for ${dep.name}@${dep.version}:`,
            error instanceof Error ? error.message : error,
          );
          this.addStepError('Transitive Dependencies Fetch', error);
        }

        return {
          dependency: dep,
          transitiveDependencies: { nodes: [], edges: [] },
          success: false,
        };
      },
      PROGRESS_STEPS[2],
      6, // Progress #6 for intermediate tracking
    );

    this.progressService.progressUpdater(PROGRESS_STEPS[2], 100, 7); // Progress #7

    // Apply results back to the original dependencies
    const erroredDeps: Dependency[] = [];

    transitiveDepsResults.forEach((result) => {
      if (result.success) {
        result.dependency.transitiveDependencies =
          result.transitiveDependencies;
      } else {
        erroredDeps.push({
          name: result.dependency.name,
          version: result.dependency.version,
          ecosystem: result.dependency.ecosystem,
        });
      }
    });

    if (erroredDeps.length > 0) {
      console.log(
        `Failed to fetch transitive dependencies for ${erroredDeps.length} packages:`,
        erroredDeps.map((d) => `${d.name}@${d.version}`).join(', '),
      );
      this.addStepError(
        'Transitive Dependencies Fetch',
        `Failed to fetch transitive dependencies for ${erroredDeps.length} packages:`,
      );
    }

    this.progressService.progressUpdater(PROGRESS_STEPS[2], 100, 7); // Progress #7
    return dependencies;
  }

  /**
   *
   * @param dependencies - DependencyGroups with main dependencies
   * @returns Promise<DependencyGroups> - DependencyGroups with vulnerabilities enriched
   */
  async enrichDependenciesWithVulnerabilities(
    dependencies: DependencyGroups,
  ): Promise<DependencyGroups> {
    const vulnsIDs = new Set<string>();

    // Flatten all dependencies for batch processing
    const allDeps: Dependency[] = Object.values(dependencies).flat();
    // Collect all transitive nodes for batch vulnerability lookup
    const allTransitiveNodes: Dependency[] = [];
    allDeps.forEach((dep) => {
      if (dep.transitiveDependencies?.nodes) {
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
      console.log(
        `Processing ${allForVuln.length} dependencies in parallel batches...`,
      );
      this.progressService.progressUpdater(PROGRESS_STEPS[3], 0, 8); // Progress #8

      // Process vulnerabilities for dependencies using parallel batches
      const batches: Dependency[][] = [];
      for (
        let i = 0;
        i < allForVuln.length;
        i += this.performanceConfig.vulnBatchSize
      ) {
        batches.push(
          allForVuln.slice(i, i + this.performanceConfig.vulnBatchSize),
        );
      }

      // Process batches sequentially with controlled concurrency
      const globalPaginatedQueries: {
        query: OSVQuery;
        depKey: string;
        pageToken: string;
      }[] = [];

      for (
        let i = 0;
        i < batches.length;
        i += this.performanceConfig.vulnConcurrency
      ) {
        const concurrentBatches = batches.slice(
          i,
          i + this.performanceConfig.vulnConcurrency,
        );

        const batchPromises = concurrentBatches.map(async (batch) => {
          const queries = batch.map((dep) => ({
            package: { name: dep.name, ecosystem: dep.ecosystem },
            version: dep.version,
          }));

          try {
            const response = await this.retryApiCall(
              () =>
                axios.post<OSVBatchResponse>(OSV_DEV_VULN_BATCH_URL, {
                  queries,
                }),
              3,
              1000,
            );

            response.data?.results?.forEach((result, idx) => {
              const dep = batch[idx];
              const depKey = `${dep.ecosystem}:${dep.name}:${dep.version}`;
              if (result.vulns) {
                result.vulns.forEach((vuln) => {
                  dep.vulnerabilities?.push({ id: vuln.id } as Vulnerability);
                  vulnsIDs.add(vuln.id);
                });
              }
              if (result.next_page_token) {
                globalPaginatedQueries.push({
                  query: queries[idx],
                  depKey,
                  pageToken: result.next_page_token,
                });
              }
            });
            return null;
          } catch (error) {
            console.error(`Error processing batch:`, error);
            this.addStepError('Vulnerability Scanning', error);
            return null;
          }
        });

        await Promise.all(batchPromises);

        // Progress logging
        const processedBatches = Math.min(
          i + this.performanceConfig.vulnConcurrency,
          batches.length,
        );
        const progressPercentage = (processedBatches / batches.length) * 100;
        console.log(
          `OSV vulnerability scanning: Processed ${processedBatches}/${batches.length} batches`,
        );
        this.progressService.progressUpdater(
          PROGRESS_STEPS[3],
          progressPercentage,
          9, // Progress #9 for intermediate tracking
        );
      }

      this.progressService.progressUpdater(PROGRESS_STEPS[3], 100, 10); // Progress #10

      // Handle pagination for all collected paginated queries
      while (globalPaginatedQueries.length > 0) {
        console.log(
          `Processing ${globalPaginatedQueries.length} paginated queries...`,
        );

        const nextQueries = globalPaginatedQueries.map((pq) => ({
          ...pq.query,
          page_token: pq.pageToken,
        }));
        const depKeys = globalPaginatedQueries.map((pq) => pq.depKey);
        globalPaginatedQueries.length = 0; // Clear the array

        const nextResponse = await this.retryApiCall(
          () =>
            axios.post<OSVBatchResponse>(OSV_DEV_VULN_BATCH_URL, {
              queries: nextQueries,
            }),
          3,
          1000,
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
            globalPaginatedQueries.push({
              query: nextQueries[idx],
              depKey: depKeys[idx],
              pageToken: result.next_page_token,
            });
          }
        });
      }

      // Fetch vulnerability details for all unique vulnerability IDs
      console.log(
        `Fetching details for ${vulnsIDs.size} unique vulnerabilities...`,
      );

      this.progressService.progressUpdater(PROGRESS_STEPS[4], 0, 11); // Progress #11

      const vulnDetailsResults = await this.processBatchesInParallel(
        Array.from(vulnsIDs),
        this.performanceConfig.vulnBatchSize,
        this.performanceConfig.vulnConcurrency,
        async (vulnId: string) => {
          try {
            const response = await this.retryApiCall(
              () =>
                axios.get<Vulnerability>(`${OSV_DEV_VULN_DET_URL}${vulnId}`),
              4, // Reduced retries for vulnerability details
              800,
            );
            return response.data;
          } catch (error) {
            console.warn(
              `Failed to fetch vulnerability details for ${vulnId}:`,
              error,
            );
            this.addStepError('Vulnerability Details Fetch', error);
            return null;
          }
        },
        PROGRESS_STEPS[4],
        12, // Progress #12 for intermediate tracking
      );

      this.progressService.progressUpdater(PROGRESS_STEPS[4], 100, 13); // Progress #13

      // Filter out failed requests
      const validVulnDetails = vulnDetailsResults.filter(
        (vuln) => vuln !== null,
      );

      // Update vulnerability details in dependencies
      validVulnDetails.forEach((vuln) => {
        const matchingDeps = allForVuln.filter((d) =>
          d.vulnerabilities?.some((v) => v.id === vuln.id),
        );
        matchingDeps.forEach((dep) => {
          dep.vulnerabilities = dep.vulnerabilities ?? [];
          const existingIndex = dep.vulnerabilities.findIndex(
            (v) => v.id === vuln.id,
          );
          const fixAvailable =
            vuln?.affected?.[0]?.ranges?.[0]?.events?.filter(
              (e: { fixed?: string }) => e.fixed,
            )[0]?.fixed ?? '';
          const fullVuln: Vulnerability = {
            id: vuln.id,
            summary: vuln.summary,
            details: vuln.details,
            severityScore: this.getCVSSSeverity(vuln.severity ?? []),
            references: vuln.references ?? [],
            affected: vuln.affected ?? [],
            aliases: vuln.aliases ?? [],
            fixAvailable: fixAvailable,
          };
          if (existingIndex !== -1) {
            dep.vulnerabilities[existingIndex] = fullVuln;
          } else {
            dep.vulnerabilities.push(fullVuln);
          }
        });
      });
      this.progressService.progressUpdater(PROGRESS_STEPS[4], 100, 14); // Progress #14
    } catch (err) {
      console.error('Error fetching vulnerabilities:', err);
      this.addStepError('Vulnerability Enrichment', err);
      throw new Error('Failed to fetch vulnerabilities from osv.dev');
    }
    // Filter transitive dependencies to only keep vulnerable nodes/edges
    const vulnerableDeps = this.filterVulnerableTransitives(dependencies);
    // Filter main dependencies to only keep those with vulnerabilities or vulnerable transitives
    return this.filterMainDependencies(vulnerableDeps);
  }

  /**
   * Analyzes dependencies in a repository and returns vulnerabilities
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @param branch - branch name (default: 'main'/'master')
   * @returns Promise<DependencyApiResponse> - object containing parsed dependencies and transitive dependencies with enriched vulnerabilities
   */
  async analyseDependencies(
    username: string,
    repo: string,
    branch: string,
    fileContents?: ManifestFileContents,
  ): Promise<DependencyApiResponse> {
    try {
      const dependenciesResponse = await this.getParsedManifestFileContents(
        username,
        repo,
        branch,
        fileContents,
      );
      const dependencies = dependenciesResponse.dependencies;

      // console.log("Dependencies found:", dependencies);

      if (!dependencies || Object.keys(dependencies).length === 0) {
        return {
          dependencies: {},
          error: [
            ...this.consolidateStepErrors(),
            'No dependencies found in the repository',
          ],
        };
      }

      let dependenciesWithChildren = dependencies;
      try {
        dependenciesWithChildren =
          await this.getTransitiveDependencies(dependencies);

        // console.log(
        //   'Dependencies with transitive dependencies:',
        //   dependenciesWithChildren,
        // );
      } catch (error) {
        console.warn(
          'Failed to get transitive dependencies, proceeding with main dependencies only:',
          error,
        );
        this.addStepError('Transitive Dependencies Analysis', error);
      }

      let analysedDependencies: DependencyGroups = dependenciesWithChildren;
      try {
        analysedDependencies = await this.enrichDependenciesWithVulnerabilities(
          dependenciesWithChildren,
        );
      } catch (error) {
        console.warn(
          'Failed to enrich vulnerabilities, returning dependencies without vulnerability data:',
          error,
        );
        this.addStepError('Vulnerability Analysis', error);
      }

      const consolidatedErrors = this.consolidateStepErrors();
      this.progressService.progressUpdater(PROGRESS_STEPS[5], 100, 15); // Progress #15

      // Final completion step
      this.progressService.progressUpdater(PROGRESS_STEPS[5], 100, 16); // Progress #16 - Complete

      return {
        dependencies: analysedDependencies,
        error: consolidatedErrors.length > 0 ? consolidatedErrors : undefined,
      };
    } catch (error) {
      this.addStepError('Overall Analysis', error);

      // Complete progress even on error
      this.progressService.progressUpdater(PROGRESS_STEPS[5], 100, 16); // Progress #16 - Complete with error

      return {
        dependencies: {},
        error: this.consolidateStepErrors(),
      };
    }
  }

  /**
   * Analyzes a single manifest file's content and returns dependencies with vulnerabilities
   * @param fileDetails - Object containing filename and content of the manifest file
   * @returns Promise<DependencyApiResponse> - object containing parsed dependencies and transitive dependencies with enriched vulnerabilities
   */
  async analyseFile(fileDetails: FileDetails): Promise<DependencyApiResponse> {
    // Start the progress from step 1 for file analysis
    this.resetGlobalState();

    const { filename, content } = fileDetails;
    const parsedFileName =
      filename.split('_')[0] + '.' + filename.split('.')[1];
    const ecosystem = Object.keys(manifestFiles).find(
      (ecosystem) => manifestFiles[ecosystem] === parsedFileName,
    );

    // console.log("Parsed file name:", parsedFileName, ecosystem);

    if (!ecosystem) {
      return {
        dependencies: {},
        error: ['Unsupported file type'],
      };
    }

    // Step 1: Start file parsing
    this.progressService.progressUpdater(PROGRESS_STEPS[0], 0, 1); // Progress #1

    const groupedFileContent = {
      [ecosystem]: [{ path: parsedFileName, content }],
    };

    const analysedDependencies = await this.analyseDependencies(
      '',
      '',
      '',
      groupedFileContent,
    );

    // console.log("File Analyzed dependencies:", analysedDependencies);

    return analysedDependencies;
  }

  /**
   * Cleans and formats a dependency version string into standard SemVer format.
   * Handles Git hashes, invalid formats, and normalizes to "major.minor.patch" format.
   */
  normalizeVersion(version: string | undefined | null): string {
    if (!version || typeof version !== 'string') return 'unknown';

    const trimmed = version.trim();

    // Handle special cases first
    if (trimmed === 'unknown' || trimmed === '') return 'unknown';

    // Check for Git commit hashes (40 character hex strings)
    if (/^[a-f0-9]{40}$/i.test(trimmed)) {
      return 'unknown';
    }

    // Check for Git hashes with dots (corrupted version format)
    if (/^[a-f0-9]{20,}\./i.test(trimmed)) {
      return 'unknown';
    }

    // Check for other Git-like hashes (7+ character hex strings without dots)
    if (/^[a-f0-9]{7,}$/i.test(trimmed)) {
      return 'unknown';
    }

    // Remove leading non-numeric characters
    const cleaned = trimmed.replace(/^[^\d]*/, '');
    if (!cleaned) return 'unknown';

    // Split at first '-' or '+' (not at a dot)
    const [core, ...extraParts] = cleaned.split(/(?=[-+])/);
    const extra = extraParts.length ? extraParts.join('') : '';

    // Split core into segments
    const segments = core.split('.');

    // Validate that we have reasonable version segments
    const major =
      segments[0] && segments[0] !== 'x' && segments[0] !== '*'
        ? segments[0]
        : '0';
    const minor =
      segments[1] && segments[1] !== 'x' && segments[1] !== '*'
        ? segments[1]
        : '0';
    const patch =
      segments[2] && segments[2] !== 'x' && segments[2] !== '*'
        ? segments[2]
        : '0';

    // Check if major version is suspiciously long (likely a hash)
    if (major.length > 10) {
      return 'unknown';
    }

    return `${major}.${minor}.${patch}${extra}`;
  }

  /**
   * Fetches the latest version of an npm package.
   */
  async fetchLatestVersionFromNpm(packageName: string): Promise<string> {
    try {
      const response = await this.retryApiCall(
        () => axios.get(`https://registry.npmjs.org/${packageName}`),
        2,
        1000,
        `NPM version lookup for ${packageName}`,
      );
      return response.data['dist-tags']?.latest ?? 'unknown';
    } catch (error) {
      console.error(
        `Failed to fetch latest version for ${packageName}:`,
        error,
      );
      this.addStepError('Version Lookup', error);
      return 'unknown';
    }
  }

  getCVSSSeverity(severity: { type: string; score: string }[]): {
    cvss_v3: string;
    cvss_v4: string;
  } {
    if (!severity || severity.length === 0)
      return { cvss_v3: 'unknown', cvss_v4: 'unknown' };

    const cvss3 = new Cvss3P0();
    const cvss4 = new Cvss4P0();

    try {
      severity.forEach((s) => {
        if (s.type.toLowerCase() === 'cvss_v3') {
          cvss3.applyVector(s.score);
        }
        if (s.type.toLowerCase() === 'cvss_v4') {
          cvss4.applyVector(s.score);
        }
      });

      return {
        cvss_v3: cvss3.calculateScores().overall.toString(),
        cvss_v4: cvss4.calculateScores().overall.toString(),
      };
    } catch (error) {
      console.error('Error parsing CVSS vector:', error);
      return { cvss_v3: 'unknown', cvss_v4: 'unknown' };
    }
  }

  mapEcosystem(system: string): Ecosystem {
    switch (system.toUpperCase()) {
      case 'NPM':
        return Ecosystem.NPM;
      case 'PHP':
        return Ecosystem.COMPOSER;
      case 'PYPI':
        return Ecosystem.PYPI;
      case 'PUB':
        return Ecosystem.PUB;
      case 'MAVEN':
        return Ecosystem.MAVEN;
      case 'RUBYGEMS':
        return Ecosystem.RUBYGEMS;
      default:
        return Ecosystem.NULL;
    }
  }
}

export default AnalysisService;
