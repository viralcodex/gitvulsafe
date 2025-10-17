export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface ManifestFile {
  path: string;
  mode: string;
  type: string;
  sha: string;
  url: number;
}

export interface ManifestFiles {
  [ecosystem: string]: ManifestFile[];
}

export interface ManifestFileContents {
  [ecosystem: string]: { path: string; content: string }[];
}

export enum Ecosystem {
  NPM = 'npm',
  PYPI = 'PyPI',
  MAVEN = 'Maven',
  GRADLE = 'Gradle',
  GO = 'Go',
  CARGO = 'Cargo',
  RUBYGEMS = 'Rubygems',
  COMPOSER = 'Composer',
  PUB = 'Pub',
  NULL = 'null',
}

export interface TransitiveDependency {
  nodes?: Dependency[];
  edges?: {
    source: number;
    target: number;
    requirement: string;
  }[];
}

export interface Dependency {
  name: string;
  version: string;
  vulnerabilities?: Vulnerability[];
  dependencyType?: 'DIRECT' | 'INDIRECT' | 'SELF';
  transitiveDependencies?: TransitiveDependency;
  ecosystem: Ecosystem;
}

export interface DepsDevDependency {
  nodes: DepsDevNode[];
  edges: DepsDevEdge[];
  error: string;
}

export interface DepsDevNode {
  versionKey: {
    system: string;
    name: string;
    version: string;
  };
  bundled: false;
  relation: 'DIRECT' | 'INDIRECT' | 'SELF';
  errors: [];
}

export interface DepsDevEdge {
  fromNode: number;
  toNode: number;
  requirement: string;
}

export interface Vulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: { type: string; score: string }[];
  severityScore?: { cvss_v3?: string; cvss_v4?: string };
  references?: Reference[];
  exploitAvailable?: boolean;
  fixAvailable?: string;
  affected?: OSVAffected[];
  aliases?: string[];
}

export interface Reference {
  type: string;
  url: string;
}

export type DependencyGroups = Record<string, Dependency[]>;

export interface DependencyApiResponse {
  dependencies: DependencyGroups;
  error?: string[];
}

export interface TransitiveDependencyResult {
  dependency: Dependency;
  transitiveDependencies: TransitiveDependency;
  success: boolean;
}

export interface MavenDependency {
  groupId?: string[];
  artifactId?: string[];
  version?: string[];
  [key: string]: unknown;
}

export interface OSVQuery {
  package: { name: string; ecosystem: Ecosystem };
  version: string;
}

export interface OSVAffected {
  package: {
    ecosystem: string;
    name: string;
    version?: string;
  };
  ranges?: {
    type: string;
    events: { introduced?: string; fixed?: string }[];
  }[];
  versions?: string[];
}

export interface OSVResult {
  vulns?: Vulnerability[];
  next_page_token?: string;
}

export interface OSVBatchResponse {
  results: OSVResult[];
}

export interface GithubFileContent {
  path: string;
  content: string;
}

export interface FileDetails {
  filename: string;
  content: string;
}

export const manifestFiles: { [ecosystem: string]: string } = {
  npm: 'package.json',
  PiPY: 'requirements.txt',
  RubyGems: 'Gemfile',
  Maven: 'pom.xml',
  gradle: 'build.gradle',
  rust: 'Cargo.toml',
  php: 'composer.json',
  Pub: 'pubspec.yaml',
  elixir: 'mix.exs',
};

// Define types for AI response parts
interface FunctionCall {
  name?: string;
  arguments?: Record<string, unknown>;
}

interface ExecutableCode {
  language?: string;
  code?: string;
}

interface FunctionResponse {
  name?: string;
  content?: unknown;
}

export interface AiResponsePart {
  text?: string;
  functionCall?: FunctionCall;
  executableCode?: ExecutableCode;
  functionResponse?: FunctionResponse;
}

// Extend Request interface to include multer file
export interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
