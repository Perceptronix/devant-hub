/**
 * DevANT Repository Mapper
 *
 * Transforms raw GitHub API responses into DevANT internal domain models.
 * Keeps API schema concerns isolated from business logic.
 *
 * Input types match GitHub OpenAPI spec schemas exactly.
 */

import {
  GitHubRepository, GitHubCommit, GitHubPullRequest,
  GitHubPullRequestReview, GitHubIssue, GitHubDeployment,
  GitHubDeploymentStatus, GitHubRelease, GitHubWorkflowRun,
  GitHubContributor, GitHubContributorStats,
} from '../types/github-schemas';

// ─── DevANT Domain Models ─────────────────────────────────────────────────────

export interface DevANTRepo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  language: string | null;
  visibility: 'public' | 'private' | 'internal';
  archived: boolean;
  disabled: boolean;
  openIssuesCount: number;
  forksCount: number;
  starsCount: number;
  pushedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  topics: string[];
}

export interface DevANTCommit {
  sha: string;
  shortSha: string;
  message: string;
  messageFirstLine: string;
  authorLogin: string | null;
  authorName: string | null;
  authorEmail: string | null;
  committedAt: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  parents: string[];
  isMergeCommit: boolean;
}

export interface DevANTPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  authorLogin: string | null;
  draft: boolean;
  merged: boolean;
  mergedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  commits: number;
  headSha: string;
  headRef: string;
  baseSha: string;
  baseRef: string;
  requestedReviewerLogins: string[];
  cycleTimeHours: number | null;
  mergeTimeHours: number | null;
}

export interface DevANTReview {
  id: number;
  prNumber: number;
  reviewerLogin: string | null;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  submittedAt: Date | null;
  commitId: string | null;
}

export interface DevANTIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  authorLogin: string | null;
  assigneeLogins: string[];
  labels: string[];
  milestoneTitle: string | null;
  milestoneNumber: number | null;
  milestoneDueOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  isPullRequest: boolean;
  stateReason: string | null;
  timeToCloseHours: number | null;
}

export interface DevANTDeployment {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  task: string;
  creatorLogin: string | null;
  createdAt: Date;
  updatedAt: Date;
  isProduction: boolean;
  isTransient: boolean;
}

export interface DevANTDeploymentStatus {
  id: number;
  deploymentId: number;
  state: GitHubDeploymentStatus['state'];
  environment: string;
  createdAt: Date;
  updatedAt: Date;
  isSuccess: boolean;
  isFailure: boolean;
}

export interface DevANTRelease {
  id: number;
  tagName: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  authorLogin: string;
  createdAt: Date;
  publishedAt: Date | null;
  targetCommitish: string;
}

export interface DevANTWorkflowRun {
  id: number;
  name: string | null;
  workflowId: number;
  headSha: string;
  headBranch: string | null;
  event: string;
  status: string | null;
  conclusion: string | null;
  runNumber: number;
  runAttempt: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date;
  durationMs: number | null;
  actorLogin: string | null;
  isSuccess: boolean;
  isFailure: boolean;
  pullRequestNumbers: number[];
}

export interface DevANTContributor {
  login: string | null;
  id: number | null;
  contributions: number;
  avatarUrl: string | null;
}

export interface DevANTContributorWeeklyStats {
  login: string;
  totalCommits: number;
  weeks: Array<{
    weekStart: Date;
    additions: number;
    deletions: number;
    commits: number;
  }>;
}

// ─── Mapper Functions ─────────────────────────────────────────────────────────

export function mapRepository(r: GitHubRepository): DevANTRepo {
  return {
    id: r.id,
    fullName: r.full_name,
    owner: r.owner.login,
    name: r.name,
    defaultBranch: r.default_branch,
    language: r.language,
    visibility: r.visibility,
    archived: r.archived,
    disabled: r.disabled,
    openIssuesCount: r.open_issues_count,
    forksCount: r.forks_count,
    starsCount: r.stargazers_count,
    pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
    createdAt: r.created_at ? new Date(r.created_at) : null,
    updatedAt: r.updated_at ? new Date(r.updated_at) : null,
    topics: r.topics ?? [],
  };
}

export function mapCommit(c: GitHubCommit): DevANTCommit {
  const committedAt = new Date(
    c.commit.committer?.date ?? c.commit.author?.date ?? new Date().toISOString(),
  );
  return {
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message,
    messageFirstLine: c.commit.message.split('\n')[0].slice(0, 200),
    authorLogin: c.author?.login ?? null,
    authorName: c.commit.author?.name ?? null,
    authorEmail: c.commit.author?.email ?? null,
    committedAt,
    additions: c.stats?.additions ?? 0,
    deletions: c.stats?.deletions ?? 0,
    changedFiles: c.files?.length ?? 0,
    parents: c.parents.map(p => p.sha),
    isMergeCommit: c.parents.length > 1,
  };
}

export function mapPullRequest(pr: GitHubPullRequest): DevANTPullRequest {
  const createdAt = new Date(pr.created_at);
  const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
  const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;

  const cycleTimeHours = mergedAt
    ? (mergedAt.getTime() - createdAt.getTime()) / 3_600_000
    : closedAt
    ? (closedAt.getTime() - createdAt.getTime()) / 3_600_000
    : null;

  const mergeTimeHours = mergedAt
    ? (mergedAt.getTime() - createdAt.getTime()) / 3_600_000
    : null;

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    authorLogin: pr.user?.login ?? null,
    draft: pr.draft,
    merged: pr.merged,
    mergedAt,
    createdAt,
    updatedAt: new Date(pr.updated_at),
    closedAt,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    commits: pr.commits,
    headSha: pr.head.sha,
    headRef: pr.head.ref,
    baseSha: pr.base.sha,
    baseRef: pr.base.ref,
    requestedReviewerLogins: pr.requested_reviewers.map(r => r.login),
    cycleTimeHours,
    mergeTimeHours,
  };
}

export function mapReview(review: GitHubPullRequestReview, prNumber: number): DevANTReview {
  return {
    id: review.id,
    prNumber,
    reviewerLogin: review.user?.login ?? null,
    state: review.state,
    submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
    commitId: review.commit_id,
  };
}

export function mapIssue(issue: GitHubIssue): DevANTIssue {
  const createdAt = new Date(issue.created_at);
  const closedAt = issue.closed_at ? new Date(issue.closed_at) : null;
  const timeToCloseHours = closedAt
    ? (closedAt.getTime() - createdAt.getTime()) / 3_600_000
    : null;

  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    authorLogin: issue.user?.login ?? null,
    assigneeLogins: issue.assignees.map(a => a.login),
    labels: issue.labels.map(l => l.name),
    milestoneTitle: issue.milestone?.title ?? null,
    milestoneNumber: issue.milestone?.number ?? null,
    milestoneDueOn: issue.milestone?.due_on ? new Date(issue.milestone.due_on) : null,
    createdAt,
    updatedAt: new Date(issue.updated_at),
    closedAt,
    isPullRequest: !!issue.pull_request,
    stateReason: issue.state_reason ?? null,
    timeToCloseHours,
  };
}

export function mapDeployment(d: GitHubDeployment): DevANTDeployment {
  return {
    id: d.id,
    sha: d.sha,
    ref: d.ref,
    environment: d.environment,
    task: d.task,
    creatorLogin: d.creator?.login ?? null,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
    isProduction: d.production_environment ?? false,
    isTransient: d.transient_environment ?? false,
  };
}

export function mapDeploymentStatus(
  s: GitHubDeploymentStatus,
  deploymentId: number,
): DevANTDeploymentStatus {
  return {
    id: s.id,
    deploymentId,
    state: s.state,
    environment: s.environment,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    isSuccess: s.state === 'success',
    isFailure: s.state === 'failure' || s.state === 'error',
  };
}

export function mapRelease(r: GitHubRelease): DevANTRelease {
  return {
    id: r.id,
    tagName: r.tag_name,
    name: r.name,
    draft: r.draft,
    prerelease: r.prerelease,
    authorLogin: r.author.login,
    createdAt: new Date(r.created_at),
    publishedAt: r.published_at ? new Date(r.published_at) : null,
    targetCommitish: r.target_commitish,
  };
}

export function mapWorkflowRun(run: GitHubWorkflowRun): DevANTWorkflowRun {
  const createdAt = new Date(run.created_at);
  const updatedAt = new Date(run.updated_at);
  const startedAt = new Date(run.run_started_at);
  const durationMs = run.conclusion
    ? updatedAt.getTime() - startedAt.getTime()
    : null;

  return {
    id: run.id,
    name: run.name,
    workflowId: run.workflow_id,
    headSha: run.head_sha,
    headBranch: run.head_branch,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    runNumber: run.run_number,
    runAttempt: run.run_attempt,
    createdAt,
    updatedAt,
    startedAt,
    durationMs,
    actorLogin: run.actor?.login ?? null,
    isSuccess: run.conclusion === 'success',
    isFailure: run.conclusion === 'failure' || run.conclusion === 'timed_out',
    pullRequestNumbers: run.pull_requests.map(pr => pr.number),
  };
}

export function mapContributor(c: GitHubContributor): DevANTContributor {
  return {
    login: c.login ?? null,
    id: c.id ?? null,
    contributions: c.contributions,
    avatarUrl: c.avatar_url ?? null,
  };
}

export function mapContributorStats(s: GitHubContributorStats): DevANTContributorWeeklyStats | null {
  if (!s.author) return null;
  return {
    login: s.author.login,
    totalCommits: s.total,
    weeks: s.weeks.map(w => ({
      weekStart: new Date(w.w * 1000),
      additions: w.a,
      deletions: w.d,
      commits: w.c,
    })),
  };
}
