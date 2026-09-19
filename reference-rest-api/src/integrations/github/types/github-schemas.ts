/**
 * DevANT GitHub Schema Types
 *
 * TypeScript interfaces derived from GitHub OpenAPI spec schemas.
 * Source: descriptions/api.github.com/api.github.com.json
 *         components/schemas/*
 *
 * Schema property counts (from spec):
 *   full-repository:          105 properties
 *   commit:                    11 properties
 *   pull-request:              48 properties
 *   pull-request-review:       13 properties
 *   issue:                     40 properties
 *   deployment:                18 properties
 *   deployment-status:         15 properties
 *   release:                   25 properties
 *   workflow-run:              36 properties
 *   contributor:               22 properties
 *   rate-limit-overview:        2 properties
 */

// ─── Shared Primitives ────────────────────────────────────────────────────────

export interface GitHubSimpleUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  url: string;
  html_url: string;
  type: string;
  site_admin: boolean;
}

export interface GitHubMinimalRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubSimpleUser;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  default_branch: string;
}

// ─── Repository (schema: full-repository, 105 properties) ────────────────────

export interface GitHubRepository extends GitHubMinimalRepository {
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  size: number;
  open_issues_count: number;
  language: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: 'public' | 'private' | 'internal';
  pushed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  topics: string[];
  license: { key: string; name: string; spdx_id: string } | null;
  organization: GitHubSimpleUser | null;
  parent?: GitHubMinimalRepository;
  source?: GitHubMinimalRepository;
  network_count?: number;
  subscribers_count?: number;
}

// ─── Commit (schema: commit, 11 properties) ───────────────────────────────────

export interface GitHubCommitAuthor {
  name: string | null;
  email: string | null;
  date: string;
}

export interface GitHubCommitStats {
  additions: number;
  deletions: number;
  total: number;
}

export interface GitHubDiffEntry {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
}

export interface GitHubCommit {
  url: string;
  sha: string;
  node_id: string;
  html_url: string;
  comments_url: string;
  commit: {
    url: string;
    author: GitHubCommitAuthor | null;
    committer: GitHubCommitAuthor | null;
    message: string;
    comment_count: number;
    tree: { sha: string; url: string };
    verification?: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
  author: GitHubSimpleUser | null;
  committer: GitHubSimpleUser | null;
  parents: Array<{ sha: string; url: string; html_url?: string }>;
  stats?: GitHubCommitStats;
  files?: GitHubDiffEntry[];
}

// ─── Commit Comparison (schema: commit-comparison, 13 properties) ─────────────

export interface GitHubCommitComparison {
  url: string;
  html_url: string;
  permalink_url: string;
  diff_url: string;
  patch_url: string;
  base_commit: GitHubCommit;
  merge_base_commit: GitHubCommit;
  status: 'diverged' | 'ahead' | 'behind' | 'identical';
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubCommit[];
  files?: GitHubDiffEntry[];
}

// ─── Pull Request (schema: pull-request, 48 properties) ──────────────────────

export interface GitHubPullRequestRef {
  label: string;
  ref: string;
  sha: string;
  user: GitHubSimpleUser | null;
  repo: GitHubMinimalRepository | null;
}

export interface GitHubPullRequest {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  number: number;
  state: 'open' | 'closed';
  locked: boolean;
  title: string;
  user: GitHubSimpleUser | null;
  body: string | null;
  labels: Array<{ id: number; name: string; color: string; description: string | null }>;
  milestone: GitHubMilestone | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  assignee: GitHubSimpleUser | null;
  assignees: GitHubSimpleUser[];
  requested_reviewers: GitHubSimpleUser[];
  head: GitHubPullRequestRef;
  base: GitHubPullRequestRef;
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  rebaseable: boolean | null;
  mergeable_state: string;
  merged_by: GitHubSimpleUser | null;
  comments: number;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  auto_merge: { merge_method: string; commit_title: string; commit_message: string } | null;
}

// ─── Pull Request Review (schema: pull-request-review, 13 properties) ─────────

export interface GitHubPullRequestReview {
  id: number;
  node_id: string;
  user: GitHubSimpleUser | null;
  body: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  html_url: string;
  pull_request_url: string;
  submitted_at: string | null;
  commit_id: string | null;
  author_association: string;
}

// ─── Issue (schema: issue, 40 properties) ─────────────────────────────────────

export interface GitHubMilestone {
  url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  description: string | null;
  creator: GitHubSimpleUser | null;
  open_issues: number;
  closed_issues: number;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  due_on: string | null;
  closed_at: string | null;
}

export interface GitHubIssue {
  url: string;
  repository_url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: GitHubSimpleUser | null;
  labels: Array<{ id: number; name: string; color: string; description: string | null }>;
  state: 'open' | 'closed';
  locked: boolean;
  assignee: GitHubSimpleUser | null;
  assignees: GitHubSimpleUser[];
  milestone: GitHubMilestone | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body: string | null;
  /** Present if this issue is actually a pull request */
  pull_request?: { url: string; html_url: string; diff_url: string; patch_url: string; merged_at: string | null };
  author_association: string;
  state_reason: 'completed' | 'reopened' | 'not_planned' | null;
}

// ─── Deployment (schema: deployment, 18 properties) ──────────────────────────

export interface GitHubDeployment {
  url: string;
  id: number;
  node_id: string;
  sha: string;
  ref: string;
  task: string;
  payload: Record<string, unknown>;
  original_environment?: string;
  environment: string;
  description: string | null;
  creator: GitHubSimpleUser | null;
  created_at: string;
  updated_at: string;
  statuses_url: string;
  repository_url: string;
  transient_environment?: boolean;
  production_environment?: boolean;
}

// ─── Deployment Status (schema: deployment-status, 15 properties) ─────────────

export interface GitHubDeploymentStatus {
  url: string;
  id: number;
  node_id: string;
  state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success' | 'waiting';
  creator: GitHubSimpleUser | null;
  description: string;
  environment: string;
  target_url: string;
  created_at: string;
  updated_at: string;
  deployment_url: string;
  repository_url: string;
  environment_url: string;
  log_url: string;
  performed_via_github_app: unknown | null;
}

// ─── Release (schema: release, 25 properties) ─────────────────────────────────

export interface GitHubRelease {
  url: string;
  html_url: string;
  assets_url: string;
  upload_url: string;
  tarball_url: string | null;
  zipball_url: string | null;
  id: number;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  author: GitHubSimpleUser;
  assets: GitHubReleaseAsset[];
  reactions?: Record<string, number>;
}

export interface GitHubReleaseAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string | null;
  uploader: GitHubSimpleUser | null;
  content_type: string;
  state: 'uploaded' | 'open';
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

// ─── Workflow Run (schema: workflow-run, 36 properties) ───────────────────────

export interface GitHubWorkflowRun {
  id: number;
  name: string | null;
  node_id: string;
  check_suite_id: number;
  check_suite_node_id: string;
  head_branch: string | null;
  head_sha: string;
  path: string;
  run_number: number;
  run_attempt: number;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending' | null;
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'startup_failure' | 'stale' | null;
  workflow_id: number;
  url: string;
  html_url: string;
  pull_requests: Array<{ id: number; number: number; head: { sha: string; ref: string }; base: { sha: string; ref: string } }>;
  created_at: string;
  updated_at: string;
  actor: GitHubSimpleUser | null;
  triggering_actor: GitHubSimpleUser | null;
  run_started_at: string;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  workflow_url: string;
  head_commit: { id: string; message: string; timestamp: string; author: { name: string; email: string } } | null;
  repository: GitHubMinimalRepository;
  head_repository: GitHubMinimalRepository;
  display_title: string;
}

// ─── Contributor (schema: contributor, 22 properties) ─────────────────────────

export interface GitHubContributor {
  login?: string;
  id?: number;
  node_id?: string;
  avatar_url?: string;
  url?: string;
  html_url?: string;
  type: string;
  site_admin?: boolean;
  contributions: number;
}

// ─── Rate Limit (schema: rate-limit-overview, 2 properties) ──────────────────

export interface GitHubRateLimitResource {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GitHubRateLimitOverview {
  resources: {
    core: GitHubRateLimitResource;
    search: GitHubRateLimitResource;
    graphql: GitHubRateLimitResource;
    integration_manifest: GitHubRateLimitResource;
    code_scanning_upload: GitHubRateLimitResource;
    actions_runner_registration: GitHubRateLimitResource;
    scim: GitHubRateLimitResource;
    dependency_snapshots: GitHubRateLimitResource;
  };
  rate: GitHubRateLimitResource;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/** repos/get-contributors-stats response item */
export interface GitHubContributorStats {
  author: GitHubSimpleUser | null;
  total: number;
  weeks: Array<{
    w: number;   // Unix timestamp of week start
    a: number;   // additions
    d: number;   // deletions
    c: number;   // commits
  }>;
}

/** repos/get-commit-activity-stats response item */
export interface GitHubCommitActivity {
  days: [number, number, number, number, number, number, number]; // Sun-Sat
  total: number;
  week: number; // Unix timestamp
}

/** repos/get-code-frequency-stats response item: [timestamp, additions, deletions] */
export type GitHubCodeFrequency = [number, number, number];

/** repos/get-participation-stats */
export interface GitHubParticipation {
  all: number[];   // 52 weeks, all contributors
  owner: number[]; // 52 weeks, repo owner only
}

/** repos/get-views */
export interface GitHubTrafficViews {
  count: number;
  uniques: number;
  views: Array<{ timestamp: string; count: number; uniques: number }>;
}

/** repos/get-clones */
export interface GitHubTrafficClones {
  count: number;
  uniques: number;
  clones: Array<{ timestamp: string; count: number; uniques: number }>;
}
