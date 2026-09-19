/**
 * DevANT GitHub Issues Service
 *
 * Wraps GitHub REST API issue and milestone endpoints.
 * All operationIds, paths, and params match the OpenAPI spec exactly.
 * Source: descriptions/api.github.com/api.github.com.json
 */

import { GitHubClient } from '../client/github-client';
import { fetchAllPages } from '../pagination/paginator';
import { ETagCache, CACHE_TTL } from '../cache/etag-cache';
import { GitHubIssue, GitHubMilestone } from '../types/github-schemas';

export class GitHubIssuesService {
  constructor(
    private readonly client: GitHubClient,
    private readonly cache: ETagCache,
  ) {}

  // ─── operationId: issues/list-for-repo ──────────────────────────────────────
  // GET /repos/{owner}/{repo}/issues
  // Params:
  //   milestone: string ("*" | "none" | milestone number)
  //   state: "open" | "closed" | "all" (default: "open")
  //   assignee: string ("*" | "none" | username)
  //   type: string
  //   creator: string
  //   mentioned: string
  //   labels: string (comma-separated)
  //   sort: "created" | "updated" | "comments" (default: "created")
  //   direction: "asc" | "desc" (from components/parameters/direction)
  //   since: string (ISO 8601, from components/parameters/since)
  //   per_page, page
  // Response: array of issue schema (40 properties)
  // Status codes: 200 (Link header), 301, 404, 422
  // NOTE: Returns PRs too — filter by absence of pull_request field for pure issues

  async listIssues(
    owner: string,
    repo: string,
    options: {
      milestone?: string;
      state?: 'open' | 'closed' | 'all';
      assignee?: string;
      creator?: string;
      mentioned?: string;
      labels?: string;
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      since?: Date;
    } = {},
  ): Promise<GitHubIssue[]> {
    return fetchAllPages<GitHubIssue>(
      this.client,
      `/repos/${owner}/${repo}/issues`,
      {
        milestone: options.milestone,
        state: options.state ?? 'open',
        assignee: options.assignee,
        creator: options.creator,
        mentioned: options.mentioned,
        labels: options.labels,
        sort: options.sort ?? 'updated',
        direction: options.direction ?? 'desc',
        since: options.since?.toISOString(),
      },
    );
  }

  // ─── operationId: issues/get ─────────────────────────────────────────────────
  // GET /repos/{owner}/{repo}/issues/{issue_number}
  // Response: issue schema (40 properties)
  // Status codes: 200, 301, 304, 404, 410

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    const cacheKey = ETagCache.buildKey('issues/get', { owner, repo, issue_number: String(issueNumber) });
    const cached = this.cache.get(cacheKey);

    const response = await this.client.request<GitHubIssue>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/issues/${issueNumber}`,
      etag: cached?.etag,
    });

    if (response.notModified && cached) return cached.data as GitHubIssue;
    if (response.etag) this.cache.set(cacheKey, response.etag, response.data, CACHE_TTL.ISSUE);
    return response.data;
  }

  // ─── operationId: issues/list-milestones ────────────────────────────────────
  // GET /repos/{owner}/{repo}/milestones
  // Params:
  //   state: "open" | "closed" | "all" (default: "open")
  //   sort: "due_on" | "completeness" (default: "due_on")
  //   direction: "asc" | "desc" (default: "asc")
  //   per_page, page
  // Response: array of milestone schema
  // Status codes: 200 (Link header), 404

  async listMilestones(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'due_on' | 'completeness';
      direction?: 'asc' | 'desc';
    } = {},
  ): Promise<GitHubMilestone[]> {
    return fetchAllPages<GitHubMilestone>(
      this.client,
      `/repos/${owner}/${repo}/milestones`,
      {
        state: options.state ?? 'open',
        sort: options.sort ?? 'due_on',
        direction: options.direction ?? 'asc',
      },
    );
  }

  // ─── operationId: issues/get-milestone ──────────────────────────────────────
  // GET /repos/{owner}/{repo}/milestones/{milestone_number}
  // Response: milestone schema
  // Status codes: 200, 404

  async getMilestone(owner: string, repo: string, milestoneNumber: number): Promise<GitHubMilestone> {
    const response = await this.client.request<GitHubMilestone>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/milestones/${milestoneNumber}`,
    });
    return response.data;
  }

  // ─── operationId: issues/list-labels-for-repo ───────────────────────────────
  // GET /repos/{owner}/{repo}/labels
  // Params: per_page, page
  // Response: array of label schema
  // Status codes: 200 (Link header), 404

  async listLabels(
    owner: string,
    repo: string,
  ): Promise<Array<{ id: number; node_id: string; url: string; name: string; color: string; default: boolean; description: string | null }>> {
    return fetchAllPages(this.client, `/repos/${owner}/${repo}/labels`, {});
  }

  // ─── operationId: issues/list-for-repo (pure issues only) ───────────────────
  // GitHub issues endpoint returns both issues AND pull requests.
  // Filter by absence of pull_request field to get pure issues only.

  async listPureIssues(
    owner: string,
    repo: string,
    options: Parameters<typeof this.listIssues>[2] = {},
  ): Promise<GitHubIssue[]> {
    const all = await this.listIssues(owner, repo, options);
    return all.filter(issue => !issue.pull_request);
  }
}
