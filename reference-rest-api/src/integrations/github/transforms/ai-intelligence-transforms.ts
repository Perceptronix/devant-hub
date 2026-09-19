/**
 * DevANT AI Intelligence Transforms
 *
 * Derives AI-ready signals from GitHub API data.
 * All input types match GitHub OpenAPI spec schemas exactly.
 *
 * Signals:
 * - Commit risk scoring (churn, hotspot, large diff)
 * - Stale PR detection
 * - Bus factor analysis
 * - Contributor ownership mapping
 * - Hotspot file detection
 * - Sprint detection from milestones
 * - Release cadence analysis
 */

import {
  GitHubCommit, GitHubPullRequest, GitHubPullRequestReview,
  GitHubContributorStats, GitHubIssue, GitHubMilestone,
  GitHubRelease, GitHubDiffEntry,
} from '../types/github-schemas';

// ─── Commit Risk Scoring ──────────────────────────────────────────────────────

export interface CommitRiskSignal {
  sha: string;
  author: string | null;
  message: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  riskScore: number; // 0-100
  riskFactors: string[];
  timestamp: string;
}

/**
 * Score commit risk based on diff size, file count, and message quality.
 * Uses commit schema: stats.additions, stats.deletions, files[].
 */
export function scoreCommitRisk(commit: GitHubCommit): CommitRiskSignal {
  const additions = commit.stats?.additions ?? 0;
  const deletions = commit.stats?.deletions ?? 0;
  const changedFiles = commit.files?.length ?? 0;
  const message = commit.commit.message;
  const riskFactors: string[] = [];
  let score = 0;

  // Large diff
  if (additions + deletions > 1000) { score += 30; riskFactors.push('large_diff'); }
  else if (additions + deletions > 500) { score += 15; riskFactors.push('medium_diff'); }

  // Many files changed
  if (changedFiles > 20) { score += 20; riskFactors.push('many_files'); }
  else if (changedFiles > 10) { score += 10; riskFactors.push('moderate_files'); }

  // High churn (deletions relative to additions)
  const churnRatio = additions > 0 ? deletions / additions : 0;
  if (churnRatio > 2) { score += 20; riskFactors.push('high_churn'); }

  // Poor commit message (too short)
  if (message.length < 10) { score += 15; riskFactors.push('poor_message'); }

  // Merge commit (lower risk)
  if (message.startsWith('Merge ')) score = Math.max(0, score - 10);

  return {
    sha: commit.sha,
    author: commit.author?.login ?? commit.commit.author?.name ?? null,
    message: message.split('\n')[0].slice(0, 100),
    additions,
    deletions,
    changedFiles,
    riskScore: Math.min(100, score),
    riskFactors,
    timestamp: commit.commit.author?.date ?? commit.commit.committer?.date ?? '',
  };
}

// ─── Stale PR Detection ───────────────────────────────────────────────────────

export interface StalePRSignal {
  number: number;
  title: string;
  author: string | null;
  daysSinceUpdate: number;
  daysSinceCreation: number;
  additions: number;
  deletions: number;
  reviewCount: number;
  approvalCount: number;
  isStale: boolean;
  staleness: 'fresh' | 'aging' | 'stale' | 'abandoned';
  blockers: string[];
}

/**
 * Detect stale PRs from pull-request schema.
 * Uses: updated_at, created_at, additions, deletions, draft.
 */
export function detectStalePR(
  pr: GitHubPullRequest,
  reviews: GitHubPullRequestReview[],
  staleDaysThreshold = 7,
): StalePRSignal {
  const now = Date.now();
  const daysSinceUpdate = (now - new Date(pr.updated_at).getTime()) / 86_400_000;
  const daysSinceCreation = (now - new Date(pr.created_at).getTime()) / 86_400_000;
  const approvals = reviews.filter(r => r.state === 'APPROVED').length;
  const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
  const blockers: string[] = [];

  if (pr.draft) blockers.push('draft');
  if (changesRequested > 0) blockers.push('changes_requested');
  if (pr.requested_reviewers.length > 0 && approvals === 0) blockers.push('awaiting_review');
  if (pr.mergeable === false) blockers.push('merge_conflict');

  let staleness: StalePRSignal['staleness'];
  if (daysSinceUpdate > 30) staleness = 'abandoned';
  else if (daysSinceUpdate > staleDaysThreshold * 2) staleness = 'stale';
  else if (daysSinceUpdate > staleDaysThreshold) staleness = 'aging';
  else staleness = 'fresh';

  return {
    number: pr.number,
    title: pr.title,
    author: pr.user?.login ?? null,
    daysSinceUpdate,
    daysSinceCreation,
    additions: pr.additions,
    deletions: pr.deletions,
    reviewCount: reviews.length,
    approvalCount: approvals,
    isStale: staleness === 'stale' || staleness === 'abandoned',
    staleness,
    blockers,
  };
}

// ─── Bus Factor Analysis ──────────────────────────────────────────────────────

export interface BusFactorResult {
  busFactor: number;
  topContributors: Array<{ login: string; commitPercentage: number; totalCommits: number }>;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Calculate bus factor from contributor stats.
 * Uses contributor-stats schema: author.login, total (commit count).
 * Bus factor = minimum contributors whose departure would remove 50%+ of commits.
 */
export function calculateBusFactor(stats: GitHubContributorStats[]): BusFactorResult {
  const totalCommits = stats.reduce((s, c) => s + c.total, 0);
  if (totalCommits === 0) {
    return { busFactor: 0, topContributors: [], riskLevel: 'critical', recommendation: 'No commit history found' };
  }

  const sorted = [...stats]
    .filter(c => c.author !== null)
    .sort((a, b) => b.total - a.total);

  let cumulative = 0;
  let busFactor = 0;
  const topContributors: BusFactorResult['topContributors'] = [];

  for (const contributor of sorted) {
    cumulative += contributor.total;
    busFactor++;
    topContributors.push({
      login: contributor.author!.login,
      commitPercentage: (contributor.total / totalCommits) * 100,
      totalCommits: contributor.total,
    });
    if (cumulative / totalCommits >= 0.5) break;
  }

  let riskLevel: BusFactorResult['riskLevel'];
  let recommendation: string;
  if (busFactor === 1) {
    riskLevel = 'critical';
    recommendation = `Single contributor owns 50%+ of commits. Critical knowledge concentration risk.`;
  } else if (busFactor === 2) {
    riskLevel = 'high';
    recommendation = `Only 2 contributors own 50%+ of commits. High bus factor risk.`;
  } else if (busFactor <= 3) {
    riskLevel = 'medium';
    recommendation = `${busFactor} contributors own 50%+ of commits. Consider knowledge sharing.`;
  } else {
    riskLevel = 'low';
    recommendation = `Good knowledge distribution across ${busFactor}+ contributors.`;
  }

  return { busFactor, topContributors, riskLevel, recommendation };
}

// ─── Hotspot Detection ────────────────────────────────────────────────────────

export interface HotspotFile {
  filename: string;
  changeCount: number;
  totalAdditions: number;
  totalDeletions: number;
  uniqueAuthors: number;
  hotspotScore: number; // 0-100
}

/**
 * Detect hotspot files from commit diff entries.
 * Uses diff-entry schema: filename, additions, deletions.
 * High change frequency + high churn = hotspot.
 */
export function detectHotspots(
  commits: Array<{ files?: GitHubDiffEntry[]; author?: { login?: string } | null }>,
  topN = 20,
): HotspotFile[] {
  const fileStats = new Map<string, { changes: number; additions: number; deletions: number; authors: Set<string> }>();

  for (const commit of commits) {
    const author = commit.author?.login ?? 'unknown';
    for (const file of commit.files ?? []) {
      const existing = fileStats.get(file.filename) ?? { changes: 0, additions: 0, deletions: 0, authors: new Set() };
      existing.changes++;
      existing.additions += file.additions;
      existing.deletions += file.deletions;
      existing.authors.add(author);
      fileStats.set(file.filename, existing);
    }
  }

  const maxChanges = Math.max(...Array.from(fileStats.values()).map(f => f.changes), 1);

  return Array.from(fileStats.entries())
    .map(([filename, stats]) => {
      const churn = stats.additions + stats.deletions;
      const hotspotScore = Math.min(100, Math.round(
        (stats.changes / maxChanges) * 60 +
        Math.min(40, (churn / 1000) * 40),
      ));
      return {
        filename,
        changeCount: stats.changes,
        totalAdditions: stats.additions,
        totalDeletions: stats.deletions,
        uniqueAuthors: stats.authors.size,
        hotspotScore,
      };
    })
    .sort((a, b) => b.hotspotScore - a.hotspotScore)
    .slice(0, topN);
}

// ─── Sprint Detection ─────────────────────────────────────────────────────────

export interface SprintSignal {
  milestoneNumber: number;
  title: string;
  dueOn: Date | null;
  openIssues: number;
  closedIssues: number;
  completionRate: number;
  daysRemaining: number | null;
  velocity: number; // closed issues per day
  forecastedCompletion: Date | null;
  status: 'on_track' | 'at_risk' | 'overdue' | 'completed';
}

/**
 * Derive sprint signals from milestone data.
 * Uses milestone schema: open_issues, closed_issues, due_on, state.
 */
export function analyzeSprintMilestone(milestone: GitHubMilestone): SprintSignal {
  const total = milestone.open_issues + milestone.closed_issues;
  const completionRate = total > 0 ? milestone.closed_issues / total : 0;
  const dueOn = milestone.due_on ? new Date(milestone.due_on) : null;
  const now = new Date();
  const daysRemaining = dueOn ? (dueOn.getTime() - now.getTime()) / 86_400_000 : null;

  const createdAt = new Date(milestone.created_at);
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / 86_400_000;
  const velocity = daysSinceCreation > 0 ? milestone.closed_issues / daysSinceCreation : 0;

  let forecastedCompletion: Date | null = null;
  if (velocity > 0 && milestone.open_issues > 0) {
    const daysToComplete = milestone.open_issues / velocity;
    forecastedCompletion = new Date(now.getTime() + daysToComplete * 86_400_000);
  }

  let status: SprintSignal['status'];
  if (milestone.state === 'closed') status = 'completed';
  else if (daysRemaining !== null && daysRemaining < 0) status = 'overdue';
  else if (forecastedCompletion && dueOn && forecastedCompletion > dueOn) status = 'at_risk';
  else status = 'on_track';

  return {
    milestoneNumber: milestone.number,
    title: milestone.title,
    dueOn,
    openIssues: milestone.open_issues,
    closedIssues: milestone.closed_issues,
    completionRate,
    daysRemaining,
    velocity,
    forecastedCompletion,
    status,
  };
}

// ─── Release Cadence ──────────────────────────────────────────────────────────

export interface ReleaseCadenceResult {
  totalReleases: number;
  averageDaysBetweenReleases: number;
  lastReleaseDate: Date | null;
  daysSinceLastRelease: number | null;
  cadenceRating: 'frequent' | 'regular' | 'infrequent' | 'stale';
}

/**
 * Analyze release cadence from release list.
 * Uses release schema: published_at, draft, prerelease.
 */
export function analyzeReleaseCadence(releases: GitHubRelease[]): ReleaseCadenceResult {
  const published = releases
    .filter(r => !r.draft && r.published_at)
    .map(r => new Date(r.published_at!))
    .sort((a, b) => b.getTime() - a.getTime());

  if (published.length === 0) {
    return { totalReleases: 0, averageDaysBetweenReleases: 0, lastReleaseDate: null, daysSinceLastRelease: null, cadenceRating: 'stale' };
  }

  const lastReleaseDate = published[0];
  const daysSinceLastRelease = (Date.now() - lastReleaseDate.getTime()) / 86_400_000;

  let avgDays = 0;
  if (published.length > 1) {
    const gaps: number[] = [];
    for (let i = 0; i < published.length - 1; i++) {
      gaps.push((published[i].getTime() - published[i + 1].getTime()) / 86_400_000);
    }
    avgDays = gaps.reduce((s, v) => s + v, 0) / gaps.length;
  }

  let cadenceRating: ReleaseCadenceResult['cadenceRating'];
  if (avgDays <= 7) cadenceRating = 'frequent';
  else if (avgDays <= 30) cadenceRating = 'regular';
  else if (avgDays <= 90) cadenceRating = 'infrequent';
  else cadenceRating = 'stale';

  return { totalReleases: published.length, averageDaysBetweenReleases: avgDays, lastReleaseDate, daysSinceLastRelease, cadenceRating };
}
