/**
 * DevANT GitHub Zod Validation Schemas
 *
 * Runtime validation for GitHub API responses.
 * Derived from OpenAPI spec schemas — property names match spec exactly.
 *
 * Strategy:
 * - Validate at ingestion boundary (API response → DevANT pipeline)
 * - Use .passthrough() to tolerate additive spec changes
 * - Strict validation only on fields DevANT actively uses
 * - Log validation failures without crashing ingestion
 */

import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

export const SimpleUserSchema = z.object({
  login: z.string(),
  id: z.number().int(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  url: z.string().url(),
  html_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),
}).passthrough();

export const NullableSimpleUserSchema = SimpleUserSchema.nullable();

// ─── Repository ───────────────────────────────────────────────────────────────

export const MinimalRepositorySchema = z.object({
  id: z.number().int(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: SimpleUserSchema,
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
  default_branch: z.string(),
}).passthrough();

export const RepositorySchema = MinimalRepositorySchema.extend({
  forks_count: z.number().int(),
  stargazers_count: z.number().int(),
  watchers_count: z.number().int(),
  size: z.number().int(),
  open_issues_count: z.number().int(),
  language: z.string().nullable(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.enum(['public', 'private', 'internal']),
  pushed_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  topics: z.array(z.string()),
}).passthrough();

// ─── Commit ───────────────────────────────────────────────────────────────────

export const CommitAuthorSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  date: z.string().datetime({ offset: true }),
}).passthrough();

export const DiffEntrySchema = z.object({
  sha: z.string(),
  filename: z.string(),
  status: z.enum(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']),
  additions: z.number().int(),
  deletions: z.number().int(),
  changes: z.number().int(),
  blob_url: z.string().url(),
  raw_url: z.string().url(),
  contents_url: z.string().url(),
  patch: z.string().optional(),
  previous_filename: z.string().optional(),
}).passthrough();

export const CommitSchema = z.object({
  url: z.string().url(),
  sha: z.string(),
  node_id: z.string(),
  html_url: z.string().url(),
  commit: z.object({
    author: CommitAuthorSchema.nullable(),
    committer: CommitAuthorSchema.nullable(),
    message: z.string(),
    comment_count: z.number().int(),
    tree: z.object({ sha: z.string(), url: z.string().url() }),
  }).passthrough(),
  author: NullableSimpleUserSchema,
  committer: NullableSimpleUserSchema,
  parents: z.array(z.object({ sha: z.string(), url: z.string().url() }).passthrough()),
  stats: z.object({
    additions: z.number().int(),
    deletions: z.number().int(),
    total: z.number().int(),
  }).optional(),
  files: z.array(DiffEntrySchema).optional(),
}).passthrough();

// ─── Pull Request ─────────────────────────────────────────────────────────────

export const PullRequestRefSchema = z.object({
  label: z.string(),
  ref: z.string(),
  sha: z.string(),
  user: NullableSimpleUserSchema,
  repo: MinimalRepositorySchema.nullable(),
}).passthrough();

export const PullRequestSchema = z.object({
  url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  html_url: z.string().url(),
  number: z.number().int(),
  state: z.enum(['open', 'closed']),
  locked: z.boolean(),
  title: z.string(),
  user: NullableSimpleUserSchema,
  body: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  merged_at: z.string().datetime({ offset: true }).nullable(),
  merge_commit_sha: z.string().nullable(),
  assignee: NullableSimpleUserSchema,
  assignees: z.array(SimpleUserSchema),
  requested_reviewers: z.array(SimpleUserSchema),
  head: PullRequestRefSchema,
  base: PullRequestRefSchema,
  draft: z.boolean(),
  merged: z.boolean(),
  mergeable: z.boolean().nullable(),
  commits: z.number().int(),
  additions: z.number().int(),
  deletions: z.number().int(),
  changed_files: z.number().int(),
}).passthrough();

export const PullRequestSimpleSchema = z.object({
  url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  html_url: z.string().url(),
  number: z.number().int(),
  state: z.enum(['open', 'closed']),
  title: z.string(),
  user: NullableSimpleUserSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  merged_at: z.string().datetime({ offset: true }).nullable(),
  draft: z.boolean(),
  head: PullRequestRefSchema,
  base: PullRequestRefSchema,
}).passthrough();

export const PullRequestReviewSchema = z.object({
  id: z.number().int(),
  node_id: z.string(),
  user: NullableSimpleUserSchema,
  body: z.string(),
  state: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING']),
  html_url: z.string().url(),
  pull_request_url: z.string().url(),
  submitted_at: z.string().datetime({ offset: true }).nullable(),
  commit_id: z.string().nullable(),
  author_association: z.string(),
}).passthrough();

// ─── Issue ────────────────────────────────────────────────────────────────────

export const MilestoneSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  number: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  creator: NullableSimpleUserSchema,
  open_issues: z.number().int(),
  closed_issues: z.number().int(),
  state: z.enum(['open', 'closed']),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  due_on: z.string().datetime({ offset: true }).nullable(),
  closed_at: z.string().datetime({ offset: true }).nullable(),
}).passthrough();

export const IssueSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  number: z.number().int(),
  title: z.string(),
  user: NullableSimpleUserSchema,
  state: z.enum(['open', 'closed']),
  locked: z.boolean(),
  assignee: NullableSimpleUserSchema,
  assignees: z.array(SimpleUserSchema),
  milestone: MilestoneSchema.nullable(),
  comments: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  body: z.string().nullable(),
  state_reason: z.enum(['completed', 'reopened', 'not_planned']).nullable().optional(),
}).passthrough();

// ─── Deployment ───────────────────────────────────────────────────────────────

export const DeploymentSchema = z.object({
  url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  sha: z.string(),
  ref: z.string(),
  task: z.string(),
  payload: z.record(z.unknown()),
  environment: z.string(),
  description: z.string().nullable(),
  creator: NullableSimpleUserSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  statuses_url: z.string().url(),
  repository_url: z.string().url(),
  transient_environment: z.boolean().optional(),
  production_environment: z.boolean().optional(),
}).passthrough();

export const DeploymentStatusSchema = z.object({
  url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  state: z.enum(['error', 'failure', 'inactive', 'in_progress', 'queued', 'pending', 'success', 'waiting']),
  creator: NullableSimpleUserSchema,
  description: z.string(),
  environment: z.string(),
  target_url: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  deployment_url: z.string().url(),
  repository_url: z.string().url(),
}).passthrough();

// ─── Release ──────────────────────────────────────────────────────────────────

export const ReleaseSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  tag_name: z.string(),
  target_commitish: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  published_at: z.string().datetime({ offset: true }).nullable(),
  author: SimpleUserSchema,
}).passthrough();

// ─── Workflow Run ─────────────────────────────────────────────────────────────

export const WorkflowRunSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  node_id: z.string(),
  head_branch: z.string().nullable(),
  head_sha: z.string(),
  path: z.string(),
  run_number: z.number().int(),
  run_attempt: z.number().int(),
  event: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed', 'waiting', 'requested', 'pending']).nullable(),
  conclusion: z.enum(['success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out', 'action_required', 'startup_failure', 'stale']).nullable(),
  workflow_id: z.number().int(),
  url: z.string().url(),
  html_url: z.string().url(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  run_started_at: z.string().datetime({ offset: true }),
  actor: NullableSimpleUserSchema,
  triggering_actor: NullableSimpleUserSchema,
  display_title: z.string(),
}).passthrough();

// ─── Rate Limit ───────────────────────────────────────────────────────────────

export const RateLimitResourceSchema = z.object({
  limit: z.number().int(),
  remaining: z.number().int(),
  reset: z.number().int(),
  used: z.number().int(),
}).passthrough();

export const RateLimitOverviewSchema = z.object({
  resources: z.object({
    core: RateLimitResourceSchema,
    search: RateLimitResourceSchema,
    graphql: RateLimitResourceSchema,
  }).passthrough(),
  rate: RateLimitResourceSchema,
}).passthrough();

// ─── Contributor Stats ────────────────────────────────────────────────────────

export const ContributorStatsSchema = z.object({
  author: NullableSimpleUserSchema,
  total: z.number().int(),
  weeks: z.array(z.object({
    w: z.number().int(),
    a: z.number().int(),
    d: z.number().int(),
    c: z.number().int(),
  })),
}).passthrough();

// ─── Validation Helper ────────────────────────────────────────────────────────

export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
): { success: true; data: T } | { success: false; error: z.ZodError; raw: unknown } {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Log but don't throw — tolerate additive spec changes
    console.warn(`[DevANT] Schema validation warning for ${context}:`, result.error.flatten());
    return { success: false, error: result.error, raw: data };
  }
  return { success: true, data: result.data };
}
