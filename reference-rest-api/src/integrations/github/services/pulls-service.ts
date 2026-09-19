/**
 * DevANT GitHub Pull Requests Service
 *
 * Wraps GitHub REST API pull request endpoints.
 * All operationIds, paths, and params match the OpenAPI spec exactly.
 * Source: descriptions/api.github.com/api.github.com.json
 */

import { GitHubClient } from '../client/github-client';
import { fetchAllPages } from '../pagination/paginator';
import { ETagCache, CACHE_TTL } from '../cache/etag-cache';
import {
  GitHubPullRequest, GitHubPullRequestReview, GitHubCommit, GitHubDiffEntry,
} from '../types/github-schemas';

export class GitHubPullsService {
  constructor(
    private readonly client: GitHubClient,
    private readonly cache: ETagCache,
  ) {}

  // ─── operationId: pulls/list ─────────────────────────────────────────────────
  // GET /repos/{owner}/{repo}/pulls
  // Params:
  //   state: "open" | "closed" | "all" (default: "open")
  //   head: string (filter by head user/branch)
  //   base: string (filter by base branch)
  //   sort: "created" | "updated" | "popularity" | "long-running" (default: "created")
  //   direction: "asc" | "desc"
  //   per_page, page
  // Response: array of pull-request-simple schema (36 properties)
  // Status codes: 200 (Link header), 304, 422

  async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      direction?: 'asc' | 'desc';
    } = {},
  ): Promise<GitHubPullRequest[]> {
    return fetchAllPages<GitHubPullRequest>(
      this.client,
      `/repos/${owner}/${repo}/pulls`,
      {
        state: options.state ?? 'open',
        head: options.head,
        base: options.base,
        sort: options.sort ?? 'updated',
        direction: options.direction ?? 'desc',
      },
    );
  }

  // ─── operationId: pulls/get ──────────────────────────────────────────────────
  // GET /repos/{owner}/{repo}/pulls/{pull_number}
  // Response: pull-request schema (48 properties — includes additions/deletions/changed_files)
  // Status codes: 200, 304, 404, 406, 500, 503

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequest> {
    const cacheKey = ETagCache.buildKey('pulls/get', { owner, repo, pull_number: String(pullNumber) });
    const cached = this.cache.get(cacheKey);

    const response = await this.client.request<GitHubPullRequest>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/pulls/${pullNumber}`,
      etag: cached?.etag,
    });

    if (response.notModified && cached) return cached.data as GitHubPullRequest;
    if (response.etag) this.cache.set(cacheKey, response.etag, response.data, CACHE_TTL.PULL_REQUEST);
    return response.data;
  }

  // ─── operationId: pulls/list-reviews ────────────────────────────────────────
  // GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews
  // Params: per_page, page
  // Response: array of pull-request-review schema (13 properties)
  // Status codes: 200 (Link header)

  async listReviews(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<GitHubPullRequestReview[]> {
    return fetchAllPages<GitHubPullRequestReview>(
      this.client,
      `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      {},
    );
  }

  // ─── operationId: pulls/list-commits ────────────────────────────────────────
  // GET /repos/{owner}/{repo}/pulls/{pull_number}/commits
  // Params: per_page, page
  // Response: array of commit schema
  // Status codes: 200 (Link header)

  async listCommits(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<GitHubCommit[]> {
    return fetchAllPages<GitHubCommit>(
      this.client,
      `/repos/${owner}/${repo}/pulls/${pullNumber}/commits`,
      {},
    );
  }

  // ─── operationId: pulls/list-files ──────────────────────────────────────────
  // GET /repos/{owner}/{repo}/pulls/{pull_number}/files
  // Params: per_page, page
  // Response: array of diff-entry schema (11 properties)
  // Status codes: 200 (Link header), 422, 500, 503

  async listFiles(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<GitHubDiffEntry[]> {
    return fetchAllPages<GitHubDiffEntry>(
      this.client,
      `/repos/${owner}/${repo}/pulls/${pullNumber}/files`,
      {},
    );
  }

  // ─── operationId: pulls/list-requested-reviewers ────────────────────────────
  // GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers
  // Response: { users: SimpleUser[], teams: Team[] }
  // Status codes: 200

  async listRequestedReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<{ users: Array<{ login: string; id: number }>; teams: Array<{ id: number; name: string; slug: string }> }> {
    const response = await this.client.request<{ users: Array<{ login: string; id: number }>; teams: Array<{ id: number; name: string; slug: string }> }>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    });
    return response.data;
  }

  // ─── operationId: repos/list-pull-requests-associated-with-commit ────────────
  // GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls
  // Params: per_page, page
  // Response: array of pull-request-simple schema
  // Status codes: 200 (Link header)
  // Use case: link commit SHA to PR for DORA lead time calculation

  async listPullRequestsForCommit(
    owner: string,
    repo: string,
    commitSha: string,
  ): Promise<GitHubPullRequest[]> {
    return fetchAllPages<GitHubPullRequest>(
      this.client,
      `/repos/${owner}/${repo}/commits/${commitSha}/pulls`,
      {},
    );
  }
}
