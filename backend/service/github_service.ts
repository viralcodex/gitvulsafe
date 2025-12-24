import axios, { AxiosInstance } from 'axios';

import { GITHUB_API_BASE_URL } from '../constants/constants';
import { Branch } from '../constants/model';

class GithubService {
  private githubClient: AxiosInstance;

  constructor(githubPAT: string = '') {
    this.githubClient = axios.create({
      baseURL: GITHUB_API_BASE_URL,
      headers: githubPAT
        ? {
            Authorization: `Bearer ${githubPAT}`,
            Accept: 'application/vnd.github.v3+json',
          }
        : {
            Accept: 'application/vnd.github.v3+json',
          },
    });
  } /**
   * Fetches default branch for a given repo
   * @param username - GitHub username/organization
   * @param repo - Repository name
   * @returns Promise<string[]> - list of branch names
   */
  async getDefaultBranch(username: string, repo: string): Promise<string> {
    try {
      const response = await this.githubClient.get(
        `/repos/${username}/${repo}`,
      );
      return response.data.default_branch;
    } catch (error) {
      console.error('Error fetching default branch:', error);
      throw new Error('Failed to fetch default branch from GitHub');
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
    perPage: number = 100,
  ): Promise<{
    branches: string[];
    defaultBranch: string;
    hasMore: boolean;
    total: number;
  }> {
    try {
      // Fetch only the requested page from GitHub API
      const response = await this.githubClient.get(
        `/repos/${username}/${repo}/branches`,
        { params: { per_page: perPage, page } },
      );

      const branches = response.data.map((branch: Branch) => branch.name);

      const defaultBranch = await this.getDefaultBranch(username, repo);

      // Determine if there are more pages by checking Link header
      let hasMore = false;
      let totalPages = page;

      const linkHeader = response.headers['link'];
      if (linkHeader) {
        hasMore = linkHeader.includes('rel="next"');
        const lastMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
        if (lastMatch) {
          totalPages = parseInt(lastMatch[1], 10);
        }
      } else if (response.data.length === perPage) {
        hasMore = true;
      }

      // Approximate total count
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
      console.error('Error fetching branches:', error);
      throw new Error('Failed to fetch branches from GitHub');
    }
  }

  /**
   * Returns raw GitHub API response for a given github api endpoint
   * @param url - GitHub API endpoint URL
   * @returns Promise<any> - Raw response from GitHub API
   */
  async getGithubApiResponse(url: string) {
    const response = await this.githubClient.get(url);
    return response;
  }
}

export default GithubService;
