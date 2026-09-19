/**
 * DevANT GitHub Integration — Public API
 *
 * Single entry point for all GitHub integration modules.
 * Source of truth: github/rest-api-description (OpenAPI 3.0.3, v1.1.4)
 */

// ─── Client ───────────────────────────────────────────────────────────────────
export { GitHubClient, GitHubAPIError, GitHubRateLimitError, GitHubStatsComputingError } from './client/github-client';
export type { GitHubClientConfig, GitHubRequestOptions, GitHubResponse } from './client/github-client';
export { GitHubAppAuth } from './client/github-app-auth';
export type { GitHubAppConfig, InstallationToken } from './client/github-app-auth';

// ─── Retry & Rate Limit ───────────────────────────────────────────────────────
export { GitHubRetryHandler } from './retry/retry-handler';
export type { RetryConfig } from './retry/retry-handler';
export { GitHubRateLimitMonitor } from './retry/rate-limit-monitor';

// ─── Pagination ───────────────────────────────────────────────────────────────
export { fetchAllPages, fetchSince, backfillUntil, parseLinkHeader, extractPageNumber } from './pagination/paginator';
export type { PaginationOptions, PageResult } from './pagination/paginator';

// ─── Cache ────────────────────────────────────────────────────────────────────
export { ETagCache, CACHE_TTL } from './cache/etag-cache';
export type { CacheEntry, ETagCacheConfig } from './cache/etag-cache';

// ─── Services ─────────────────────────────────────────────────────────────────
export { GitHubReposService } from './services/repos-service';
export { GitHubPullsService } from './services/pulls-service';
export { GitHubIssuesService } from './services/issues-service';
export { GitHubActionsService } from './services/actions-service';
export { GitHubSecurityService } from './services/security-service';
export { GitHubWebhooksService, DEVANT_WEBHOOK_EVENTS } from './services/webhooks-service';
export type { SecurityRiskSnapshot } from './services/security-service';
export type { WorkflowRunListOptions } from './services/actions-service';

// ─── Webhooks ─────────────────────────────────────────────────────────────────
export { GitHubWebhookHandler } from './webhooks/webhook-handler';
export type { WebhookHeaders, WebhookHandlerConfig, DeliveryStore, WebhookProcessResult, GitHubWebhookEvent } from './webhooks/webhook-handler';
export { GitHubWebhookRouter } from './webhooks/webhook-router';
export type {
  PushEventPayload, PullRequestEventPayload, DeploymentEventPayload,
  DeploymentStatusEventPayload, WorkflowRunEventPayload, ReleaseEventPayload,
  IssuesEventPayload,
} from './webhooks/webhook-router';

// ─── Types (GitHub OpenAPI Schemas) ───────────────────────────────────────────
export type {
  GitHubRepository, GitHubMinimalRepository, GitHubSimpleUser,
  GitHubCommit, GitHubCommitAuthor, GitHubCommitStats, GitHubDiffEntry, GitHubCommitComparison,
  GitHubPullRequest, GitHubPullRequestReview, GitHubPullRequestRef,
  GitHubIssue, GitHubMilestone,
  GitHubDeployment, GitHubDeploymentStatus,
  GitHubRelease, GitHubReleaseAsset,
  GitHubWorkflowRun,
  GitHubContributor, GitHubContributorStats,
  GitHubRateLimitOverview, GitHubRateLimitResource,
  GitHubCommitActivity, GitHubCodeFrequency, GitHubParticipation,
  GitHubTrafficViews, GitHubTrafficClones,
} from './types/github-schemas';

// ─── Mappers ──────────────────────────────────────────────────────────────────
export {
  mapRepository, mapCommit, mapPullRequest, mapReview, mapIssue,
  mapDeployment, mapDeploymentStatus, mapRelease, mapWorkflowRun,
  mapContributor, mapContributorStats,
} from './mappers/repo-mapper';
export type {
  DevANTRepo, DevANTCommit, DevANTPullRequest, DevANTReview, DevANTIssue,
  DevANTDeployment, DevANTDeploymentStatus, DevANTRelease, DevANTWorkflowRun,
  DevANTContributor, DevANTContributorWeeklyStats,
} from './mappers/repo-mapper';

// ─── Transforms ───────────────────────────────────────────────────────────────
export {
  calculateDeploymentFrequency, calculateLeadTimeFromRuns,
  calculateChangeFailureRate, calculateMTTR, buildDORAScorecard,
} from './transforms/dora-transforms';
export type {
  DORAScorecard, DeploymentFrequencyResult, LeadTimeResult,
  ChangeFailureRateResult, MTTRResult,
} from './transforms/dora-transforms';

export {
  scoreCommitRisk, detectStalePR, calculateBusFactor,
  detectHotspots, analyzeSprintMilestone, analyzeReleaseCadence,
} from './transforms/ai-intelligence-transforms';
export type {
  CommitRiskSignal, StalePRSignal, BusFactorResult,
  HotspotFile, SprintSignal, ReleaseCadenceResult,
} from './transforms/ai-intelligence-transforms';

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  RepositorySchema, CommitSchema, PullRequestSchema, PullRequestSimpleSchema,
  PullRequestReviewSchema, IssueSchema, DeploymentSchema, DeploymentStatusSchema,
  ReleaseSchema, WorkflowRunSchema, RateLimitOverviewSchema, ContributorStatsSchema,
  safeValidate,
} from './validators/zod-schemas';

// ─── Endpoint Registry ────────────────────────────────────────────────────────
export { GITHUB_ENDPOINT_REGISTRY, DevANTCategory, RateLimitRisk } from './openapi/endpoint-registry';
export type { EndpointRegistryEntry, EndpointRegistry, DevANTCategoryType, RateLimitRiskType } from './openapi/endpoint-registry';

// ─── Ingestion ────────────────────────────────────────────────────────────────
export { GitHubIngestionOrchestrator } from './ingestion/ingestion-orchestrator';
export type { IngestionConfig, IngestionResult } from './ingestion/ingestion-orchestrator';

// ─── Factory ──────────────────────────────────────────────────────────────────
// Concrete imports needed for the factory function (not re-exported as types)
import { GitHubClient } from './client/github-client';
import { ETagCache } from './cache/etag-cache';
import { GitHubReposService } from './services/repos-service';
import { GitHubPullsService } from './services/pulls-service';
import { GitHubIssuesService } from './services/issues-service';
import { GitHubActionsService } from './services/actions-service';
import { GitHubSecurityService } from './services/security-service';
import { GitHubWebhooksService } from './services/webhooks-service';
import { GitHubIngestionOrchestrator } from './ingestion/ingestion-orchestrator';

/**
 * Create a fully configured DevANT GitHub integration instance.
 * Uses GitHub App installation token auth (preferred for production).
 */
export interface GitHubIntegration {
  client: GitHubClient;
  cache: ETagCache;
  repos: GitHubReposService;
  pulls: GitHubPullsService;
  issues: GitHubIssuesService;
  actions: GitHubActionsService;
  security: GitHubSecurityService;
  webhooks: GitHubWebhooksService;
  orchestrator: GitHubIngestionOrchestrator;
}

export function createGitHubIntegration(config: {
  token: string;
  baseUrl?: string;
  userAgent?: string;
  cacheMaxEntries?: number;
}): GitHubIntegration {
  const client = new GitHubClient({
    token: config.token,
    baseUrl: config.baseUrl,
    userAgent: config.userAgent ?? 'DevANT/1.0',
  });
  const cache = new ETagCache({ maxEntries: config.cacheMaxEntries ?? 10_000 });

  return {
    client,
    cache,
    repos: new GitHubReposService(client, cache),
    pulls: new GitHubPullsService(client, cache),
    issues: new GitHubIssuesService(client, cache),
    actions: new GitHubActionsService(client, cache),
    security: new GitHubSecurityService(client),
    webhooks: new GitHubWebhooksService(client),
    orchestrator: new GitHubIngestionOrchestrator(client, cache),
  };
}
