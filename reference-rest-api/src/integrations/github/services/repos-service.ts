/**
 * DevANT GitHub Repos Service
 *
 * Wraps GitHub REST API endpoints for repository, commit, branch,
 * contributor, stats, and traffic intelligence.
 *
 * All operationIds, paths, and params match the OpenAPI spec exactly.
 * Source: descriptions/api.github.com/api.github.com.json
 */

import { GitHubClient } from '../client/github-client';
import { fetchAllPages, fetchSince } from '../pagination/paginator';
import { ETagCache, CACHE_TTL } from '../cache/etag-cache';
import {
  GitHubRepository, GitHubCommit, GitHubCommitComparison,
  GitHubContributor, GitHubContributorStats, GitHubCommitActivity,
  GitHubCodeFrequency, GitHubParticipation, GitHubTrafficViews,
  GitHubTrafficClones, GitHubDeployment, GitHubDeploymentStatus,
  GitHubRelease, GitHubWorkflowRun,
} from '../types/github-schemas';

export class GitHubReposService {
  constructor(
    private readonly client: GitHubClient,
    private readonly cache: ETagCache,
  ) {}

  // ─── operationId: repos/get ─────────────────────────────────────────────────
  // GET /repos/{owner}/{repo}
  // Response: full-repository schema (105 properties)
  // Status codes: 200, 301, 403, 404

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const cacheKey = ETagCache.buildKey('repos/get', { owner, repo });
    const cached = this.cache.get(cacheKey);

    const response = await this.client.request<GitHubRepository>({
      method: 'GET',
      path: `/repos/${owner}/${repo}`,
      etag: cached?.etag,
    });

    if (response.notModified && cached) return cached.data as GitHubRepository;
    if (response.etag) this.cache.set(cacheKey, response.etag, response.data, CACHE_TTL.REPOSITORY);
    return response.data;
  }

  // ─── operationId: repos/list-commits ────────────────────────────────────────
  // GET /repos/{owner}/{repo}/commits
  // Params: sha, path, author, committer, since (ISO 8601), until (ISO 8601), per_page, page
  // Response: array of commit schema
  // Status codes: 200 (Link header), 400, 404, 409, 500

  async listCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string;
      path?: string;
      author?: string;
      committer?: string;
      since?: Date;
      until?: Date;
      perPage?: number;
    } = {},
  ): Promise<GitHubCommit[]> {
    return fetchAllPages<GitHubCommit>(
      this.client,
      `/repos/${owner}/${repo}/commits`,
      {
        sha: options.sha,
        path: options.path,
        author: options.author,
        committer: options.committer,
        since: options.since?.toISOString(),
        until: options.until?.toISOString(),
      },
      { perPage: options.perPage ?? 100 },
    );
  }

  // ─── operationId: repos/get-commit ──────────────────────────────────────────
  // GET /repos/{owner}/{repo}/commits/{ref}
  // Params: ref (path), per_page, page (for files pagination)
  // Response: commit schema (includes stats and files)
  // Status codes: 200, 404, 409, 422, 500, 503

  async getCommit(owner: string, repo: string, ref: string): Promise<GitHubCommit> {
    const cacheKey = ETagCache.buildKey('repos/get-commit', { owner, repo, ref });
    const cached = this.cache.get(cacheKey);

    const response = await this.client.request<GitHubCommit>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/commits/${ref}`,
      etag: cached?.etag,
    });

    if (response.notModified && cached) return cached.data as GitHubCommit;
    if (response.etag) this.cache.set(cacheKey, response.etag, response.data, CACHE_TTL.COMMIT);
    return response.data;
  }

  // ─── operationId: repos/compare-commits ─────────────────────────────────────
  // GET /repos/{owner}/{repo}/compare/{basehead}
  // Params: basehead = "base...head" (x-multi-segment: true)
  // Response: commit-comparison schema (13 properties)
  // Status codes: 200 (Link header), 404, 500

  async compareCommits(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitHubCommitComparison> {
    const basehead = `${base}...${head}`;
    const response = await this.client.request<GitHubCommitComparison>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/compare/${basehead}`,
    });
    return response.data;
  }

  // ─── operationId: repos/list-branches ───────────────────────────────────────
  // GET /repos/{owner}/{repo}/branches
  // Params: protected (boolean), per_page, page
  // Response: array of short-branch schema (5 properties)
  // Status codes: 200 (Link header), 404

  async listBranches(
    owner: string,
    repo: string,
    options: { protected?: boolean } = {},
  ): Promise<Array<{ name: string; commit: { sha: string; url: string }; protected: boolean }>> {
    return fetchAllPages(
      this.client,
      `/repos/${owner}/${repo}/branches`,
      { protected: options.protected },
    );
  }

  // ─── operationId: repos/list-contributors ───────────────────────────────────
  // GET /repos/{owner}/{repo}/contributors
  // Params: anon (string), per_page, page
  // Response: array of contributor schema (22 properties)
  // Status codes: 200 (Link header), 204, 403, 404

  async listContributors(
    owner: string,
    repo: string,
    includeAnonymous = false,
  ): Promise<GitHubContributor[]> {
    return fetchAllPages<GitHubContributor>(
      this.client,
      `/repos/${owner}/${repo}/contributors`,
      { anon: includeAnonymous ? '1' : undefined },
    );
  }

  // ─── operationId: repos/list-languages ──────────────────────────────────────
  // GET /repos/{owner}/{repo}/languages
  // Response: object { [language]: bytes }
  // Status codes: 200

  async listLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const response = await this.client.request<Record<string, number>>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/languages`,
    });
    return response.data;
  }

  // ─── operationId: repos/list-tags ───────────────────────────────────────────
  // GET /repos/{owner}/{repo}/tags
  // Params: per_page, page
  // Response: array of tag schema (5 properties)
  // Status codes: 200 (Link header)

  async listTags(owner: string, repo: string): Promise<Array<{ name: string; commit: { sha: string; url: string }; zipball_url: string; tarball_url: string; node_id: string }>> {
    return fetchAllPages(this.client, `/repos/${owner}/${repo}/tags`, {});
  }

  // ─── Stats endpoints (202 Accepted = computing, retry after 5s) ─────────────

  // operationId: repos/get-contributors-stats
  // GET /repos/{owner}/{repo}/stats/contributors
  // Response: array of contributor-stats (author + weekly data)
  // Status codes: 200, 202 (computing)

  async getContributorsStats(owner: string, repo: string): Promise<GitHubContributorStats[]> {
    const response = await this.client.request<GitHubContributorStats[]>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/stats/contributors`,
    });
    return response.data;
  }

  // operationId: repos/get-commit-activity-stats
  // GET /repos/{owner}/{repo}/stats/commit_activity
  // Response: array of commit-activity (52 weeks)
  // Status codes: 200, 202 (computing)

  async getCommitActivityStats(owner: string, repo: string): Promise<GitHubCommitActivity[]> {
    const response = await this.client.request<GitHubCommitActivity[]>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/stats/commit_activity`,
    });
    return response.data;
  }

  // operationId: repos/get-code-frequency-stats
  // GET /repos/{owner}/{repo}/stats/code_frequency
  // Response: array of [timestamp, additions, deletions]
  // Status codes: 200, 202 (computing)

  async getCodeFrequencyStats(owner: string, repo: string): Promise<GitHubCodeFrequency[]> {
    const response = await this.client.request<GitHubCodeFrequency[]>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/stats/code_frequency`,
    });
    return response.data;
  }

  // operationId: repos/get-participation-stats
  // GET /repos/{owner}/{repo}/stats/participation
  // Response: { all: number[52], owner: number[52] }
  // Status codes: 200, 202 (computing), 404

  async getParticipationStats(owner: string, repo: string): Promise<GitHubParticipation> {
    const response = await this.client.request<GitHubParticipation>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/stats/participation`,
    });
    return response.data;
  }

  // ─── Traffic (requires push access, not available via GitHub Apps) ───────────

  // operationId: repos/get-views
  // GET /repos/{owner}/{repo}/traffic/views
  // Params: per (string: "day" | "week")
  // Response: view-traffic schema (3 properties)
  // Status codes: 200, 403

  async getTrafficViews(owner: string, repo: string, per: 'day' | 'week' = 'day'): Promise<GitHubTrafficViews> {
    const response = await this.client.request<GitHubTrafficViews>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/traffic/views`,
      params: { per },
    });
    return response.data;
  }

  // operationId: repos/get-clones
  // GET /repos/{owner}/{repo}/traffic/clones
  // Params: per (string: "day" | "week")
  // Response: clone-traffic schema (3 properties)
  // Status codes: 200, 403

  async getTrafficClones(owner: string, repo: string, per: 'day' | 'week' = 'day'): Promise<GitHubTrafficClones> {
    const response = await this.client.request<GitHubTrafficClones>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/traffic/clones`,
      params: { per },
    });
    return response.data;
  }

  // ─── Deployments ─────────────────────────────────────────────────────────────

  // operationId: repos/list-deployments
  // GET /repos/{owner}/{repo}/deployments
  // Params: sha, ref, task, environment, per_page, page
  // Response: array of deployment schema (18 properties)
  // Status codes: 200 (Link header)

  async listDeployments(
    owner: string,
    repo: string,
    options: { sha?: string; ref?: string; task?: string; environment?: string } = {},
  ): Promise<GitHubDeployment[]> {
    return fetchAllPages<GitHubDeployment>(
      this.client,
      `/repos/${owner}/${repo}/deployments`,
      options,
    );
  }

  // operationId: repos/list-deployment-statuses
  // GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses
  // Params: per_page, page
  // Response: array of deployment-status schema (15 properties)
  // Status codes: 200 (Link header), 404

  async listDeploymentStatuses(
    owner: string,
    repo: string,
    deploymentId: number,
  ): Promise<GitHubDeploymentStatus[]> {
    return fetchAllPages<GitHubDeploymentStatus>(
      this.client,
      `/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`,
      {},
    );
  }

  // ─── Releases ────────────────────────────────────────────────────────────────

  // operationId: repos/list-releases
  // GET /repos/{owner}/{repo}/releases
  // Params: per_page, page
  // Response: array of release schema (25 properties)
  // Status codes: 200 (Link header), 404

  async listReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
    return fetchAllPages<GitHubRelease>(
      this.client,
      `/repos/${owner}/${repo}/releases`,
      {},
    );
  }

  // operationId: repos/get-latest-release
  // GET /repos/{owner}/{repo}/releases/latest
  // Response: release schema
  // Status codes: 200, 404

  async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
    const cacheKey = ETagCache.buildKey('repos/get-latest-release', { owner, repo });
    const cached = this.cache.get(cacheKey);

    const response = await this.client.request<GitHubRelease>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/releases/latest`,
      etag: cached?.etag,
    });

    if (response.notModified && cached) return cached.data as GitHubRelease;
    if (response.etag) this.cache.set(cacheKey, response.etag, response.data, CACHE_TTL.RELEASE);
    return response.data;
  }
}
