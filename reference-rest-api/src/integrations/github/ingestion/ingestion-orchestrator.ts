/**
 * DevANT GitHub Ingestion Orchestrator
 *
 * Coordinates the full ingestion pipeline for a repository:
 * 1. Initial backfill (historical data)
 * 2. Incremental sync (delta since last sync)
 * 3. Webhook-driven real-time updates
 * 4. Gap recovery (missed webhooks)
 *
 * Design principles:
 * - Webhook-first: webhooks drive real-time, REST is fallback/backfill
 * - Incremental: use `since` params, never full re-fetch
 * - Resilient: gap recovery on webhook failure
 * - Observable: emit events for each ingested entity
 */

import { GitHubClient } from '../client/github-client';
import { GitHubReposService } from '../services/repos-service';
import { GitHubPullsService } from '../services/pulls-service';
import { GitHubIssuesService } from '../services/issues-service';
import { GitHubActionsService } from '../services/actions-service';
import { GitHubSecurityService } from '../services/security-service';
import { ETagCache } from '../cache/etag-cache';
import {
  mapRepository, mapCommit, mapPullRequest, mapReview,
  mapIssue, mapDeployment, mapDeploymentStatus, mapRelease,
  mapWorkflowRun, mapContributor, mapContributorStats,
  DevANTRepo, DevANTCommit, DevANTPullRequest, DevANTReview,
  DevANTIssue, DevANTDeployment, DevANTDeploymentStatus,
  DevANTRelease, DevANTWorkflowRun, DevANTContributor,
  DevANTContributorWeeklyStats,
} from '../mappers/repo-mapper';

export interface IngestionConfig {
  owner: string;
  repo: string;
  /** Backfill start date — how far back to fetch history */
  backfillSince?: Date;
  /** Last sync timestamp — for incremental sync */
  lastSyncAt?: Date;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface IngestionResult {
  owner: string;
  repo: string;
  repository: DevANTRepo | null;
  commits: DevANTCommit[];
  pullRequests: DevANTPullRequest[];
  reviews: DevANTReview[];
  issues: DevANTIssue[];
  deployments: DevANTDeployment[];
  deploymentStatuses: DevANTDeploymentStatus[];
  releases: DevANTRelease[];
  workflowRuns: DevANTWorkflowRun[];
  contributors: DevANTContributor[];
  contributorStats: DevANTContributorWeeklyStats[];
  languages: Record<string, number>;
  errors: Array<{ entity: string; error: string }>;
  syncedAt: Date;
  durationMs: number;
}

export class GitHubIngestionOrchestrator {
  private readonly reposService: GitHubReposService;
  private readonly pullsService: GitHubPullsService;
  private readonly issuesService: GitHubIssuesService;
  private readonly actionsService: GitHubActionsService;
  private readonly securityService: GitHubSecurityService;

  constructor(
    private readonly client: GitHubClient,
    private readonly cache: ETagCache,
  ) {
    this.reposService = new GitHubReposService(client, cache);
    this.pullsService = new GitHubPullsService(client, cache);
    this.issuesService = new GitHubIssuesService(client, cache);
    this.actionsService = new GitHubActionsService(client, cache);
    this.securityService = new GitHubSecurityService(client);
  }

  /**
   * Full ingestion for a repository.
   * Fetches all entities in parallel where possible.
   * Uses `since` for incremental sync when lastSyncAt is provided.
   */
  async ingest(config: IngestionConfig): Promise<IngestionResult> {
    const startTime = Date.now();
    const { owner, repo, lastSyncAt, backfillSince, signal } = config;
    const since = lastSyncAt ?? backfillSince ?? new Date(Date.now() - 90 * 86_400_000); // default 90 days
    const errors: Array<{ entity: string; error: string }> = [];

    const result: IngestionResult = {
      owner, repo,
      repository: null,
      commits: [], pullRequests: [], reviews: [], issues: [],
      deployments: [], deploymentStatuses: [], releases: [],
      workflowRuns: [], contributors: [], contributorStats: [],
      languages: {}, errors,
      syncedAt: new Date(),
      durationMs: 0,
    };

    // ── Tier 1: Repo metadata (fast, single request) ──────────────────────────
    result.repository = await this._safe('repository', errors, async () => {
      const r = await this.reposService.getRepository(owner, repo);
      return mapRepository(r);
    });

    // ── Tier 2: Core intelligence (parallel) ──────────────────────────────────
    const [commits, prs, issues, deployments, releases, workflowRuns, contributors, languages] =
      await Promise.all([
        this._safe('commits', errors, async () => {
          const raw = await this.reposService.listCommits(owner, repo, { since });
          return raw.map(mapCommit);
        }),
        this._safe('pullRequests', errors, async () => {
          const raw = await this.pullsService.listPullRequests(owner, repo, {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
          });
          return raw.map(mapPullRequest);
        }),
        this._safe('issues', errors, async () => {
          const raw = await this.issuesService.listPureIssues(owner, repo, {
            state: 'all',
            since,
            sort: 'updated',
            direction: 'desc',
          });
          return raw.map(mapIssue);
        }),
        this._safe('deployments', errors, async () => {
          const raw = await this.reposService.listDeployments(owner, repo);
          return raw.map(mapDeployment);
        }),
        this._safe('releases', errors, async () => {
          const raw = await this.reposService.listReleases(owner, repo);
          return raw.map(mapRelease);
        }),
        this._safe('workflowRuns', errors, async () => {
          const raw = await this.actionsService.listWorkflowRunsForRepo(owner, repo);
          return raw.map(mapWorkflowRun);
        }),
        this._safe('contributors', errors, async () => {
          const raw = await this.reposService.listContributors(owner, repo);
          return raw.map(mapContributor);
        }),
        this._safe('languages', errors, async () => {
          return this.reposService.listLanguages(owner, repo);
        }),
      ]);

    result.commits = commits ?? [];
    result.pullRequests = prs ?? [];
    result.issues = issues ?? [];
    result.deployments = deployments ?? [];
    result.releases = releases ?? [];
    result.workflowRuns = workflowRuns ?? [];
    result.contributors = contributors ?? [];
    result.languages = languages ?? {};

    // ── Tier 3: PR reviews (per-PR, rate-limit aware) ─────────────────────────
    // Only fetch reviews for recently updated PRs to avoid rate limit exhaustion
    const recentPRs = result.pullRequests.slice(0, 50);
    const reviewResults = await Promise.allSettled(
      recentPRs.map(async pr => {
        if (signal?.aborted) return [];
        const raw = await this.pullsService.listReviews(owner, repo, pr.number);
        return raw.map(r => mapReview(r, pr.number));
      }),
    );
    result.reviews = reviewResults
      .filter((r): r is PromiseFulfilledResult<DevANTReview[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // ── Tier 4: Deployment statuses (per-deployment) ──────────────────────────
    const recentDeployments = result.deployments.slice(0, 30);
    const statusResults = await Promise.allSettled(
      recentDeployments.map(async dep => {
        if (signal?.aborted) return [];
        const raw = await this.reposService.listDeploymentStatuses(owner, repo, dep.id);
        return raw.map(s => mapDeploymentStatus(s, dep.id));
      }),
    );
    result.deploymentStatuses = statusResults
      .filter((r): r is PromiseFulfilledResult<DevANTDeploymentStatus[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // ── Tier 5: Stats (async, may 202 — handled by retry) ─────────────────────
    const statsResult = await this._safe('contributorStats', errors, async () => {
      const raw = await this.reposService.getContributorsStats(owner, repo);
      return raw.map(mapContributorStats).filter((s): s is DevANTContributorWeeklyStats => s !== null);
    });
    result.contributorStats = statsResult ?? [];

    result.durationMs = Date.now() - startTime;
    result.syncedAt = new Date();
    return result;
  }

  private async _safe<T>(
    entity: string,
    errors: Array<{ entity: string; error: string }>,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      errors.push({ entity, error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }
}
