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

export type BranchesApiResponse = {
  branches?: string[];
  defaultBranch?: string;
  error?: string;
  hasMore?: boolean;
  total?: number;
};

export type DependencyGroups = Record<string, Dependency[]>;

export interface ManifestFileContentsApiResponse {
  dependencies: DependencyGroups;
  error?: string[];
}

export enum Relation {
  PRIMARY = "PRIMARY",
  TRANSITIVE = "TRANSITIVE",
  CENTER = "CENTER",
  SELF = "SELF",
}

export interface Dependency {
  name: string;
  version: string;
  ecosystem: string;
  filePath: string;
  description?: string;
  homepage?: string;
  repository_url?: string;
  license?: string;
  transitiveDependencies?: TransitiveDependency;
  vulnerabilities?: Vulnerability[];
  dependencyType: Relation;
}

export interface TransitiveDependency {
  nodes?: Dependency[];
  edges?: {
    source: number;
    target: number;
    requirement: string;
  }[];
}

export interface GroupedDependencies {
  [ecosystem: string]: Dependency[];
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

export interface GraphNode {
  id: string;
  type: Relation;
  label: string;
  icon?: string; // Optional icon for the node
  version?: string;
  ecosystem?: string;
  severity?: number; // CVSS score, 0-10
  fixAvailable?: boolean; // true if fix is available
  vulnCount?: number; // number of vulnerabilities
  x?: number;
  y?: number;
  level?: number; // for hierarchical layout
  fx?: number | null; // fixed x position
  fy?: number | null; // fixed y position
  vx?: number; // velocity x
  vy?: number; // velocity y
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: Relation; // type of relation
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type EcosystemGraphMap = Record<string, GraphData>;

export interface ShowMoreRefsProps {
  [type: string]: boolean;
}

export interface ShowMoreDescProps {
  [key: string]: boolean;
}

export interface FixPlanSSEMessage {
  dependencyName?: string;
  dependencyVersion?: string;
  fixPlan?: Record<string, unknown>;
  progress?: string;
}

export interface GlobalFixPlanSSEMessage {
  globalFixPlan?: string;
  progress?: string;
}

export interface FixOptimisationPlanSSEMessage {
  optimisedPlan?: string;
  progress?: string;
}

export interface ConflictResolutionPlanSSEMessage {
  conflictResolutionPlan?: string;
  progress?: string;
}

export interface StrategyRecommendationSSEMessage {
  finalStrategy?: string;
  progress?: string;
}

// Global Fix Plan Data Structures
export interface GlobalAnalysisData {
  analysis?: {
    summary?: string;
    dependency_relationships?: string[];
    shared_vulnerabilities?: string[];
    critical_path_analysis?: { path: string; description: string }[];
  };
  prioritization?: {
    strategy?: string;
    execution_phases?: string[];
  };
  execution_plan?: {
    batch_operations?: string[];
    sequential_requirements?: string;
    global_commands?: string[];
  };
  risk_management?: {
    assessment?: string;
    breaking_change_analysis?: string;
    testing_strategy?: {
      unit_tests?: string;
      integration_tests?: string;
    };
    rollback_plan?: string;
  };
}

export interface OptimisationData {
  optimization_analysis?: {
    summary?: string;
    redundancies_found?: Array<{ type: string; description: string }>;
    batch_opportunities?: Array<{ name: string; description: string }>;
  };
  execution_optimization?: {
    strategy?: string;
    consolidated_commands?: Array<{ command: string; description: string }>;
  };
}

export interface ConflictResolutionData {
  analysis?: {
    conflicts_summary?: string;
    critical_conflicts?: Array<{ dependency: string; description: string }>;
    version_conflicts?: Array<{ package: string; description: string }>;
    breaking_changes?: string;
  };
  resolution?: {
    approach?: string;
    primary_strategy?: string;
    backup_strategies?: Array<{ name: string; description: string }>;
  };
}

export interface VulnerabilityFix {
  dependency: {
    name: string;
    version: string;
    ecosystem: string;
  };
  vulnerabilities: Array<{
    id: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description?: string;
  }>;
  fixes: Array<{
    vulnerability_id: string;
    fix_type: "upgrade" | "patch" | "replace" | "configuration" | "remove";
    recommended_version?: string;
    alternative_packages?: string[];
    fix_command?: string;
    risk_score?: number;
    breaking_changes?: boolean;
    explanation: string;
  }>;
  summary: {
    critical_count?: number;
    high_count?: number;
    medium_count?: number;
    low_count?: number;
    overall_risk: number;
    recommended_action: string;
    urgency: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW";
  };
  transitive_dependencies?: Array<{
    name: string;
    version: string;
    vulnerability_count: number;
    affects_parent?: boolean;
    fix_available?: boolean;
  }>;
}

export interface ProgressSSE {
    step: string;
    progress: number;
    progressNumber?: number;
    message?: string;
    type: string;
}
