/**
 * DevANT GitHub Actions Service
 *
 * Wraps GitHub Actions REST API endpoints for DORA metrics:
 * - Deployment Frequency (workflow runs per time period)
 * - Lead Time (run created_at → conclusion)
 * - Change Failure Rate (failed/cancelled conclusions)
 * - MTTR (time from failure to next success)
 *
 * All operationIds, paths, and params match the OpenAPI spec exactly.
 * Source: descriptions/api.github.com/api.github.com.json
 */

import { GitHubClient } from '../client/github-client';
import { fetchAllPages } from '../pagination/paginator';
import { ETagCache, CACHE_TTL } from '../cache/etag-cache';
import { GitHubWorkflowRun } from '../types/github-schemas';

export interface WorkflowRunListOptions {
  actor?: string;
  branch?: string;
  event?: string;
  /** Filter by status — spec enum: completed, action_required, cancelled, failure, neutral, skipped, stale, success, timed_out, in_progress, queued, requested, waiting, pending */
  status?: 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting' | 'pending';
  /** ISO 8601 date range: "2024-01-01..2024-12-31" */
  created?: string;
  excludePullRequests?: boolean;
  checkSuiteId?: number;
  headSha?: string;
}

export class GitHubActionsService {
  constructor(
    private readonly client: GitHubClient,
    private readonly cache: ETagCache,
  ) {}

  // ─── operationId: actions/list-workflow-runs-for-repo ────────────────────────
  // GET /repos/{owner}/{repo}/actions/runs
  // Params: actor, branch (x-ref: workflow-run-branch), event, status (x-ref: workflow-run-status),
  //         per_page, page, created, exclude_pull_requests, check_suite_id, head_sha
  // Response: { total_count: number, workflow_runs: WorkflowRun[] }
  // Status codes: 200 (Link header)

  async listWorkflowRunsForRepo(
    owner: string,
    repo: string,
    options: WorkflowRunListOptions = {},
  ): Promise<GitHubWorkflowRun[]> {
    // Response is wrapped: { total_count, workflow_runs: [] }
    const response = await this.client.request<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/runs`,
      params: {
        actor: options.actor,
        branch: options.branch,
        event: options.event,
        status: options.status,
        created: options.created,
        exclude_pull_requests: options.excludePullRequests,
        check_suite_id: options.checkSuiteId,
        head_sha: options.headSha,
        per_page: 100,
      },
    });
    return response.data.workflow_runs;
  }

  // ─── operationId: actions/get-workflow-run ───────────────────────────────────
  // GET /repos/{owner}/{repo}/actions/runs/{run_id}
  // Params: exclude_pull_requests (boolean)
  // Response: workflow-run schema (36 properties)
  // Status codes: 200

  async getWorkflowRun(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<GitHubWorkflowRun> {
    const cacheKey = ETagCache.buildKey('actions/get-workflow-run', { owner, repo, run_id: String(runId) });
    const cached = this.cache.get(cacheKey);

    const response = await this.client.request<GitHubWorkflowRun>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/runs/${runId}`,
      etag: cached?.etag,
    });

    if (response.notModified && cached) return cached.data as GitHubWorkflowRun;
    if (response.etag) this.cache.set(cacheKey, response.etag, response.data, CACHE_TTL.ACTIONS);
    return response.data;
  }

  // ─── operationId: actions/get-workflow-run-usage ────────────────────────────
  // GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing
  // Response: { billable: { UBUNTU: { total_ms: number }, ... }, run_duration_ms: number }
  // Status codes: 200
  // Note: x-github.enabledForGitHubApps = false — requires OAuth token

  async getWorkflowRunTiming(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<{ billable: Record<string, { total_ms: number; jobs: number }>; run_duration_ms: number }> {
    const response = await this.client.request<{ billable: Record<string, { total_ms: number; jobs: number }>; run_duration_ms: number }>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/runs/${runId}/timing`,
    });
    return response.data;
  }

  // ─── operationId: actions/list-jobs-for-workflow-run ────────────────────────
  // GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs
  // Params: filter ("latest" | "all"), per_page, page
  // Response: { total_count: number, jobs: Job[] }
  // Status codes: 200 (Link header)

  async listJobsForWorkflowRun(
    owner: string,
    repo: string,
    runId: number,
    filter: 'latest' | 'all' = 'latest',
  ): Promise<Array<{
    id: number;
    run_id: number;
    name: string;
    status: string;
    conclusion: string | null;
    started_at: string | null;
    completed_at: string | null;
    steps: Array<{ name: string; status: string; conclusion: string | null; number: number; started_at: string | null; completed_at: string | null }>;
  }>> {
    const response = await this.client.request<{ total_count: number; jobs: unknown[] }>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
      params: { filter, per_page: 100 },
    });
    return response.data.jobs as ReturnType<typeof this.listJobsForWorkflowRun> extends Promise<infer T> ? T : never;
  }

  // ─── operationId: actions/list-repo-workflows ───────────────────────────────
  // GET /repos/{owner}/{repo}/actions/workflows
  // Params: per_page, page
  // Response: { total_count: number, workflows: Workflow[] }
  // Status codes: 200 (Link header)

  async listWorkflows(
    owner: string,
    repo: string,
  ): Promise<Array<{ id: number; node_id: string; name: string; path: string; state: string; created_at: string; updated_at: string; url: string; html_url: string; badge_url: string }>> {
    const response = await this.client.request<{ total_count: number; workflows: unknown[] }>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/workflows`,
      params: { per_page: 100 },
    });
    return response.data.workflows as ReturnType<typeof this.listWorkflows> extends Promise<infer T> ? T : never;
  }

  // ─── operationId: actions/list-workflow-runs ────────────────────────────────
  // GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs
  // Params: same as list-workflow-runs-for-repo + workflow_id (path)
  // Response: { total_count: number, workflow_runs: WorkflowRun[] }
  // Status codes: 200 (Link header)

  async listWorkflowRuns(
    owner: string,
    repo: string,
    workflowId: number | string,
    options: WorkflowRunListOptions = {},
  ): Promise<GitHubWorkflowRun[]> {
    const response = await this.client.request<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`,
      params: {
        actor: options.actor,
        branch: options.branch,
        event: options.event,
        status: options.status,
        created: options.created,
        exclude_pull_requests: options.excludePullRequests,
        per_page: 100,
      },
    });
    return response.data.workflow_runs;
  }
}
