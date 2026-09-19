/**
 * DevANT GitHub Endpoint Registry
 * Source of truth: github/rest-api-description (OpenAPI 3.0.3, v1.1.4)
 * Spec: descriptions/api.github.com/api.github.com.json
 * Total spec operations: 1153 | Registered DevANT-relevant: see categories below
 */

// ─── Category Enum ────────────────────────────────────────────────────────────

export const DevANTCategory = {
  REPOSITORY_INTELLIGENCE: 'repository_intelligence',
  COMMIT_INTELLIGENCE: 'commit_intelligence',
  PULL_REQUEST_INTELLIGENCE: 'pull_request_intelligence',
  ISSUE_INTELLIGENCE: 'issue_intelligence',
  DEPLOYMENT_INTELLIGENCE: 'deployment_intelligence',
  RELEASE_INTELLIGENCE: 'release_intelligence',
  CONTRIBUTOR_INTELLIGENCE: 'contributor_intelligence',
  WEBHOOK_INTELLIGENCE: 'webhook_intelligence',
  SECURITY_INTELLIGENCE: 'security_intelligence',
  ACTIVITY_TIMELINE: 'activity_timeline',
  DORA_METRICS: 'dora_metrics',
  RISK_INTELLIGENCE: 'risk_intelligence',
  STAKEHOLDER_REPORTING: 'stakeholder_reporting',
  WALLBOARD_INTELLIGENCE: 'wallboard_intelligence',
  SPRINT_INTELLIGENCE: 'sprint_intelligence',
} as const;

export type DevANTCategoryType = typeof DevANTCategory[keyof typeof DevANTCategory];

// ─── Rate Limit Risk Enum ─────────────────────────────────────────────────────

export const RateLimitRisk = {
  LOW: 'low',       // read-only, rarely called
  MEDIUM: 'medium', // paginated, called per-repo
  HIGH: 'high',     // stats endpoints (202 async), per-commit, abuse-trigger
} as const;

export type RateLimitRiskType = typeof RateLimitRisk[keyof typeof RateLimitRisk];

// ─── Registry Entry Type ──────────────────────────────────────────────────────

export interface EndpointRegistryEntry {
  /** HTTP method exactly as in OpenAPI spec */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  /** Path exactly as in OpenAPI spec */
  path: string;
  /** operationId exactly as in OpenAPI spec */
  operationId: string;
  /** Official OpenAPI tag */
  tag: string;
  /** DevANT intelligence category */
  category: DevANTCategoryType;
  /**
   * Link-header pagination (per_page + page params).
   * Source: 199 endpoints in spec use Link response header.
   */
  pagination: boolean;
  /** Whether response can be ETag-cached */
  cacheable: boolean;
  /** Whether a webhook event can replace or supplement this poll */
  webhookRelated: boolean;
  /** Whether this endpoint feeds AI analytics pipelines */
  aiRelevant: boolean;
  /** Rate limit risk classification */
  rateLimitRisk: RateLimitRiskType;
  /**
   * Whether GitHub Apps (installation tokens) can call this.
   * Source: x-github.enabledForGitHubApps in spec.
   */
  enabledForGitHubApps: boolean;
  /**
   * Whether this operation triggers GitHub abuse detection.
   * Source: x-github.triggersNotification in spec.
   * Throttle to 3s between calls when true.
   */
  triggersNotification: boolean;
  /** Primary DevANT use case */
  primaryUseCase: string;
}

export type EndpointRegistry = Record<string, EndpointRegistryEntry>;

// ─── Registry ─────────────────────────────────────────────────────────────────
// operationId is the key — matches spec exactly.

export const GITHUB_ENDPOINT_REGISTRY: EndpointRegistry = {

  // ══════════════════════════════════════════════════════════════════════════
  // REPOSITORY INTELLIGENCE
  // Why DevANT needs it: repo metadata drives all context — default branch,
  // visibility, language, fork status, archived state, open issues count.
  // Polling: on-demand + daily refresh. Webhook: repository event.
  // Cache: ETag. AI: repo health scoring, risk baseline.
  // ══════════════════════════════════════════════════════════════════════════

  'repos/get': {
    method: 'GET',
    path: '/repos/{owner}/{repo}',
    operationId: 'repos/get',
    tag: 'repos',
    category: DevANTCategory.REPOSITORY_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Repo metadata, health baseline, language detection',
  },

  'repos/list-branches': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/branches',
    operationId: 'repos/list-branches',
    tag: 'repos',
    category: DevANTCategory.REPOSITORY_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Branch inventory, stale branch detection, default branch tracking',
  },

  'repos/list-languages': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/languages',
    operationId: 'repos/list-languages',
    tag: 'repos',
    category: DevANTCategory.REPOSITORY_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Tech stack detection, language distribution for wallboard',
  },

  'repos/list-tags': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/tags',
    operationId: 'repos/list-tags',
    tag: 'repos',
    category: DevANTCategory.REPOSITORY_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Tag inventory for release correlation',
  },

  'repos/list-contributors': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/contributors',
    operationId: 'repos/list-contributors',
    tag: 'repos',
    category: DevANTCategory.CONTRIBUTOR_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Contributor ranking, bus factor analysis, ownership mapping',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMMIT INTELLIGENCE
  // Why DevANT needs it: commit velocity, churn, lead time, hotspot detection.
  // Polling: incremental via `since` param. Webhook: push event.
  // Cache: ETag on single commit. AI: churn, risk, lead time.
  // ══════════════════════════════════════════════════════════════════════════

  'repos/list-commits': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/commits',
    operationId: 'repos/list-commits',
    tag: 'repos',
    category: DevANTCategory.COMMIT_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Commit velocity, author attribution, incremental sync via since/until',
  },

  'repos/get-commit': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/commits/{ref}',
    operationId: 'repos/get-commit',
    tag: 'repos',
    category: DevANTCategory.COMMIT_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.HIGH,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Commit diff, files changed, additions/deletions for churn analysis',
  },

  'repos/compare-commits': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/compare/{basehead}',
    operationId: 'repos/compare-commits',
    tag: 'repos',
    category: DevANTCategory.COMMIT_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Lead time calculation: compare deploy SHA to feature branch base',
  },

  'repos/get-contributors-stats': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/stats/contributors',
    operationId: 'repos/get-contributors-stats',
    tag: 'repos',
    category: DevANTCategory.CONTRIBUTOR_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.HIGH,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Weekly commit stats per contributor — bus factor, ownership, churn',
  },

  'repos/get-commit-activity-stats': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/stats/commit_activity',
    operationId: 'repos/get-commit-activity-stats',
    tag: 'repos',
    category: DevANTCategory.DORA_METRICS,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.HIGH,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Weekly commit frequency — deployment frequency proxy, sprint velocity',
  },

  'repos/get-code-frequency-stats': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/stats/code_frequency',
    operationId: 'repos/get-code-frequency-stats',
    tag: 'repos',
    category: DevANTCategory.RISK_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.HIGH,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Weekly additions/deletions — code churn detection, refactor risk',
  },

  'repos/get-participation-stats': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/stats/participation',
    operationId: 'repos/get-participation-stats',
    tag: 'repos',
    category: DevANTCategory.CONTRIBUTOR_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.HIGH,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Owner vs all-contributor commit split — team health wallboard',
  },

  'repos/get-punch-card-stats': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/stats/punch_card',
    operationId: 'repos/get-punch-card-stats',
    tag: 'repos',
    category: DevANTCategory.CONTRIBUTOR_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.HIGH,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Commit time-of-day heatmap — sprint pattern detection',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PULL REQUEST INTELLIGENCE
  // Why DevANT needs it: PR cycle time, review latency, stale PR detection,
  // merge rate, review coverage. Webhook: pull_request, pull_request_review.
  // Cache: ETag on single PR. AI: stale detection, review quality scoring.
  // ══════════════════════════════════════════════════════════════════════════

  'pulls/list': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/pulls',
    operationId: 'pulls/list',
    tag: 'pulls',
    category: DevANTCategory.PULL_REQUEST_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'PR inventory, open/closed state, stale PR detection',
  },

  'pulls/get': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/pulls/{pull_number}',
    operationId: 'pulls/get',
    tag: 'pulls',
    category: DevANTCategory.PULL_REQUEST_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'PR detail: cycle time, additions/deletions, merge status, reviewers',
  },

  'pulls/list-reviews': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/pulls/{pull_number}/reviews',
    operationId: 'pulls/list-reviews',
    tag: 'pulls',
    category: DevANTCategory.PULL_REQUEST_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Review latency, approval patterns, review coverage scoring',
  },

  'pulls/list-commits': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/pulls/{pull_number}/commits',
    operationId: 'pulls/list-commits',
    tag: 'pulls',
    category: DevANTCategory.PULL_REQUEST_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Commits per PR — complexity proxy, lead time calculation',
  },

  'pulls/list-files': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/pulls/{pull_number}/files',
    operationId: 'pulls/list-files',
    tag: 'pulls',
    category: DevANTCategory.RISK_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Files changed per PR — hotspot detection, risk scoring',
  },

  'pulls/list-requested-reviewers': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers',
    operationId: 'pulls/list-requested-reviewers',
    tag: 'pulls',
    category: DevANTCategory.PULL_REQUEST_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Reviewer assignment tracking, review bottleneck detection',
  },

  'repos/list-pull-requests-associated-with-commit': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/commits/{commit_sha}/pulls',
    operationId: 'repos/list-pull-requests-associated-with-commit',
    tag: 'repos',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Link commit to PR for lead time calculation (commit → PR → deploy)',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ISSUE INTELLIGENCE
  // Why DevANT needs it: issue velocity, bug rate, sprint tracking,
  // milestone forecasting. Webhook: issues event.
  // Cache: ETag. AI: sprint detection, milestone forecasting.
  // ══════════════════════════════════════════════════════════════════════════

  'issues/list-for-repo': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/issues',
    operationId: 'issues/list-for-repo',
    tag: 'issues',
    category: DevANTCategory.ISSUE_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Issue inventory, open/closed rate, sprint backlog tracking',
  },

  'issues/get': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/issues/{issue_number}',
    operationId: 'issues/get',
    tag: 'issues',
    category: DevANTCategory.ISSUE_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Issue detail: labels, milestone, assignee, time-to-close',
  },

  'issues/list-milestones': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/milestones',
    operationId: 'issues/list-milestones',
    tag: 'issues',
    category: DevANTCategory.SPRINT_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Sprint/milestone tracking, due date forecasting, completion rate',
  },

  'issues/list-labels-for-repo': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/labels',
    operationId: 'issues/list-labels-for-repo',
    tag: 'issues',
    category: DevANTCategory.ISSUE_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Label taxonomy for issue classification and AI categorization',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT INTELLIGENCE + DORA METRICS
  // Why DevANT needs it: deployment frequency (DORA), environment tracking,
  // MTTR calculation. Webhook: deployment, deployment_status events.
  // Cache: ETag. AI: DORA scoring, failure rate, MTTR.
  // ══════════════════════════════════════════════════════════════════════════

  'repos/list-deployments': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/deployments',
    operationId: 'repos/list-deployments',
    tag: 'repos',
    category: DevANTCategory.DEPLOYMENT_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Deployment frequency (DORA), environment inventory, deploy history',
  },

  'repos/get-deployment': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/deployments/{deployment_id}',
    operationId: 'repos/get-deployment',
    tag: 'repos',
    category: DevANTCategory.DEPLOYMENT_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Deployment detail: SHA, environment, creator, timestamps',
  },

  'repos/list-deployment-statuses': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses',
    operationId: 'repos/list-deployment-statuses',
    tag: 'repos',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Deployment success/failure — MTTR, change failure rate (DORA)',
  },

  'repos/get-deployment-status': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}',
    operationId: 'repos/get-deployment-status',
    tag: 'repos',
    category: DevANTCategory.DORA_METRICS,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Individual deployment status detail for MTTR calculation',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RELEASE INTELLIGENCE
  // Why DevANT needs it: release cadence, release notes, version tracking.
  // Webhook: release event. Cache: ETag. AI: release frequency, cadence.
  // ══════════════════════════════════════════════════════════════════════════

  'repos/list-releases': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/releases',
    operationId: 'repos/list-releases',
    tag: 'repos',
    category: DevANTCategory.RELEASE_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Release cadence, version history, release frequency tracking',
  },

  'repos/get-latest-release': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/releases/latest',
    operationId: 'repos/get-latest-release',
    tag: 'repos',
    category: DevANTCategory.RELEASE_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Current production version for wallboard, stakeholder reporting',
  },

  'repos/get-release': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/releases/{release_id}',
    operationId: 'repos/get-release',
    tag: 'repos',
    category: DevANTCategory.RELEASE_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Release detail: tag, body, assets, published_at',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS / CI INTELLIGENCE (DORA: Deployment Frequency + Lead Time)
  // Why DevANT needs it: CI pass rate, build duration, workflow failure rate.
  // Webhook: workflow_run, check_run events. AI: DORA, failure prediction.
  // ══════════════════════════════════════════════════════════════════════════

  'actions/list-workflow-runs-for-repo': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/actions/runs',
    operationId: 'actions/list-workflow-runs-for-repo',
    tag: 'actions',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'CI run history, deployment frequency, build success rate',
  },

  'actions/get-workflow-run': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/actions/runs/{run_id}',
    operationId: 'actions/get-workflow-run',
    tag: 'actions',
    category: DevANTCategory.DORA_METRICS,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Run detail: status, conclusion, timing — lead time, MTTR',
  },

  'actions/get-workflow-run-usage': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/actions/runs/{run_id}/timing',
    operationId: 'actions/get-workflow-run-usage',
    tag: 'actions',
    category: DevANTCategory.DORA_METRICS,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: false,
    triggersNotification: false,
    primaryUseCase: 'Build duration per run — CI performance trending',
  },

  'actions/list-jobs-for-workflow-run': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/actions/runs/{run_id}/jobs',
    operationId: 'actions/list-jobs-for-workflow-run',
    tag: 'actions',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Job-level timing for bottleneck detection in CI pipeline',
  },

  'actions/list-repo-workflows': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/actions/workflows',
    operationId: 'actions/list-repo-workflows',
    tag: 'actions',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Workflow inventory for CI pipeline mapping',
  },

  'actions/list-workflow-runs': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
    operationId: 'actions/list-workflow-runs',
    tag: 'actions',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Per-workflow run history for deployment frequency per pipeline',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WEBHOOK INTELLIGENCE
  // Why DevANT needs it: real-time event ingestion replaces polling for
  // push, PR, deployment, release, issues. Webhook: all events.
  // ══════════════════════════════════════════════════════════════════════════

  'repos/list-webhooks': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/hooks',
    operationId: 'repos/list-webhooks',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Verify DevANT webhook registration, audit hook config',
  },

  'repos/create-webhook': {
    method: 'POST',
    path: '/repos/{owner}/{repo}/hooks',
    operationId: 'repos/create-webhook',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: false,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Register DevANT webhook for real-time event ingestion',
  },

  'repos/get-webhook': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/hooks/{hook_id}',
    operationId: 'repos/get-webhook',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Verify webhook config, check active status and events subscribed',
  },

  'repos/update-webhook': {
    method: 'PATCH',
    path: '/repos/{owner}/{repo}/hooks/{hook_id}',
    operationId: 'repos/update-webhook',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: false,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Update webhook URL, secret rotation, event subscription changes',
  },

  'repos/delete-webhook': {
    method: 'DELETE',
    path: '/repos/{owner}/{repo}/hooks/{hook_id}',
    operationId: 'repos/delete-webhook',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: false,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Deregister webhook on repo offboarding',
  },

  'repos/list-webhook-deliveries': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/hooks/{hook_id}/deliveries',
    operationId: 'repos/list-webhook-deliveries',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: true,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Webhook delivery audit, failure detection, replay identification',
  },

  'repos/redeliver-webhook-delivery': {
    method: 'POST',
    path: '/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts',
    operationId: 'repos/redeliver-webhook-delivery',
    tag: 'repos',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: false,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Manual webhook replay for missed events during downtime',
  },

  'orgs/list-webhooks': {
    method: 'GET',
    path: '/orgs/{org}/hooks',
    operationId: 'orgs/list-webhooks',
    tag: 'orgs',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Org-level webhook inventory for multi-repo DevANT installations',
  },

  'orgs/create-webhook': {
    method: 'POST',
    path: '/orgs/{org}/hooks',
    operationId: 'orgs/create-webhook',
    tag: 'orgs',
    category: DevANTCategory.WEBHOOK_INTELLIGENCE,
    pagination: false,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Register org-level webhook — single hook covers all repos in org',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY INTELLIGENCE
  // Why DevANT needs it: vulnerability exposure, secret leaks, advisory
  // tracking for risk scoring. Webhook: code_scanning_alert, secret_scanning.
  // ══════════════════════════════════════════════════════════════════════════

  'code-scanning/list-alerts-for-repo': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/code-scanning/alerts',
    operationId: 'code-scanning/list-alerts-for-repo',
    tag: 'code-scanning',
    category: DevANTCategory.SECURITY_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Open vulnerability count, severity distribution for risk scoring',
  },

  'secret-scanning/list-alerts-for-repo': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/secret-scanning/alerts',
    operationId: 'secret-scanning/list-alerts-for-repo',
    tag: 'secret-scanning',
    category: DevANTCategory.SECURITY_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Secret leak detection, exposure window calculation',
  },

  'repos/list-vulnerability-alerts': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/vulnerability-alerts',
    operationId: 'repos/check-vulnerability-alerts',
    tag: 'repos',
    category: DevANTCategory.SECURITY_INTELLIGENCE,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Dependabot vulnerability alert status check',
  },

  'dependabot/list-alerts-for-repo': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/dependabot/alerts',
    operationId: 'dependabot/list-alerts-for-repo',
    tag: 'dependabot',
    category: DevANTCategory.SECURITY_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Dependency vulnerability tracking, CVSS scoring for risk dashboard',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITY TIMELINE
  // Why DevANT needs it: event stream for real-time activity feed,
  // contributor activity, repo pulse. Webhook: all events.
  // ══════════════════════════════════════════════════════════════════════════

  'activity/list-repo-events': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/events',
    operationId: 'activity/list-repo-events',
    tag: 'activity',
    category: DevANTCategory.ACTIVITY_TIMELINE,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: false,
    triggersNotification: false,
    primaryUseCase: 'Activity timeline feed, contributor pulse, event stream for wallboard',
  },

  'activity/list-events-for-authenticated-user': {
    method: 'GET',
    path: '/users/{username}/events',
    operationId: 'activity/list-events-for-authenticated-user',
    tag: 'activity',
    category: DevANTCategory.CONTRIBUTOR_INTELLIGENCE,
    pagination: true,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: false,
    triggersNotification: false,
    primaryUseCase: 'Per-contributor activity stream for contributor intelligence',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TRAFFIC INTELLIGENCE (Stakeholder Reporting / Wallboard)
  // Why DevANT needs it: repo visibility metrics for stakeholder reports.
  // Note: requires push access. Not available via GitHub Apps.
  // ══════════════════════════════════════════════════════════════════════════

  'repos/get-views': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/traffic/views',
    operationId: 'repos/get-views',
    tag: 'repos',
    category: DevANTCategory.STAKEHOLDER_REPORTING,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: false,
    triggersNotification: false,
    primaryUseCase: 'Repo view count for stakeholder visibility reporting',
  },

  'repos/get-clones': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/traffic/clones',
    operationId: 'repos/get-clones',
    tag: 'repos',
    category: DevANTCategory.STAKEHOLDER_REPORTING,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: false,
    triggersNotification: false,
    primaryUseCase: 'Clone count for adoption tracking in stakeholder reports',
  },

  'repos/get-top-paths': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/traffic/popular/paths',
    operationId: 'repos/get-top-paths',
    tag: 'repos',
    category: DevANTCategory.STAKEHOLDER_REPORTING,
    pagination: false,
    cacheable: true,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: false,
    triggersNotification: false,
    primaryUseCase: 'Top accessed paths for documentation/repo health reporting',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RATE LIMIT
  // Why DevANT needs it: proactive rate limit monitoring to prevent 403s.
  // ══════════════════════════════════════════════════════════════════════════

  'rate-limit/get': {
    method: 'GET',
    path: '/rate_limit',
    operationId: 'rate-limit/get',
    tag: 'rate-limit',
    category: DevANTCategory.ACTIVITY_TIMELINE,
    pagination: false,
    cacheable: false,
    webhookRelated: false,
    aiRelevant: false,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Proactive rate limit monitoring, throttle detection, quota management',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHECKS (CI Status for DORA)
  // ══════════════════════════════════════════════════════════════════════════

  'checks/list-for-ref': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/commits/{ref}/check-runs',
    operationId: 'checks/list-for-ref',
    tag: 'checks',
    category: DevANTCategory.DORA_METRICS,
    pagination: true,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.MEDIUM,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'CI check status per commit — build pass rate, failure detection',
  },

  'repos/get-combined-status-for-ref': {
    method: 'GET',
    path: '/repos/{owner}/{repo}/commits/{ref}/status',
    operationId: 'repos/get-combined-status-for-ref',
    tag: 'repos',
    category: DevANTCategory.DORA_METRICS,
    pagination: false,
    cacheable: true,
    webhookRelated: true,
    aiRelevant: true,
    rateLimitRisk: RateLimitRisk.LOW,
    enabledForGitHubApps: true,
    triggersNotification: false,
    primaryUseCase: 'Combined CI status for commit — gate check before deployment tracking',
  },

} satisfies EndpointRegistry;
