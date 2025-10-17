export const GITHUB_API_BASE_URL = 'https://api.github.com';
export const DEFAULT_CONCURRENCY = 8;
export const DEFAULT_BATCH_SIZE = 100;
export const DEFAULT_VULN_CONCURRENCY = 10;
export const DEFAULT_VULN_BATCH_SIZE = 25;
export const DEFAULT_TRANSITIVE_CONCURRENCY = 6;
export const DEFAULT_TRANSITIVE_BATCH_SIZE = 15;

export const OSV_DEV_VULN_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
export const OSV_DEV_VULN_DET_URL = 'https://api.osv.dev/v1/vulns/';

export const DEPS_DEV_BASE_URL = 'https://api.deps.dev/v3/systems';

export const PROGRESS_STEPS = [
  'PARSING_MANIFESTS',
  'PARSING_DEPENDENCIES',
  'FETCHING_TRANSITIVE_DEPENDENCIES',
  'FETCHING_VULNERABILTIES_ID',
  'FETCHING_VULNERABILTIES_DETAILS',
  'FINALISING_RESULTS',
];
