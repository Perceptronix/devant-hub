/**
 * DevANT DORA Metrics Transforms
 *
 * Calculates DORA metrics from GitHub API data.
 * All input types match GitHub OpenAPI spec schemas exactly.
 *
 * DORA Metrics:
 * 1. Deployment Frequency — from workflow runs / deployments
 * 2. Lead Time for Changes — commit timestamp → deployment success
 * 3. Change Failure Rate — failed deployments / total deployments
 * 4. MTTR — time from failure deployment to next success deployment
 */

import { GitHubWorkflowRun, GitHubDeployment, GitHubDeploymentStatus } from '../types/github-schemas';

// ─── Deployment Frequency ─────────────────────────────────────────────────────

export type DeploymentFrequencyRating = 'elite' | 'high' | 'medium' | 'low';

export interface DeploymentFrequencyResult {
  deploymentsPerDay: number;
  deploymentsPerWeek: number;
  totalDeployments: number;
  periodDays: number;
  rating: DeploymentFrequencyRating;
}

/**
 * Calculate deployment frequency from workflow runs.
 * Uses runs with conclusion='success' as successful deployments.
 * Source: workflow-run schema — conclusion field.
 */
export function calculateDeploymentFrequency(
  runs: GitHubWorkflowRun[],
  periodDays: number,
): DeploymentFrequencyResult {
  const successfulRuns = runs.filter(r => r.conclusion === 'success');
  const totalDeployments = successfulRuns.length;
  const deploymentsPerDay = totalDeployments / periodDays;
  const deploymentsPerWeek = deploymentsPerDay * 7;

  let rating: DeploymentFrequencyRating;
  if (deploymentsPerDay >= 1) rating = 'elite';
  else if (deploymentsPerWeek >= 1) rating = 'high';
  else if (deploymentsPerDay * 30 >= 1) rating = 'medium';
  else rating = 'low';

  return { deploymentsPerDay, deploymentsPerWeek, totalDeployments, periodDays, rating };
}

// ─── Lead Time for Changes ────────────────────────────────────────────────────

export type LeadTimeRating = 'elite' | 'high' | 'medium' | 'low';

export interface LeadTimeResult {
  averageLeadTimeHours: number;
  medianLeadTimeHours: number;
  p95LeadTimeHours: number;
  rating: LeadTimeRating;
}

/**
 * Calculate lead time from workflow run data.
 * Lead time = run_started_at → updated_at (when conclusion set).
 * For full lead time: commit timestamp → deployment (requires compare endpoint).
 */
export function calculateLeadTimeFromRuns(runs: GitHubWorkflowRun[]): LeadTimeResult {
  const completedRuns = runs.filter(r => r.conclusion === 'success' && r.run_started_at && r.updated_at);
  if (completedRuns.length === 0) {
    return { averageLeadTimeHours: 0, medianLeadTimeHours: 0, p95LeadTimeHours: 0, rating: 'low' };
  }

  const durations = completedRuns
    .map(r => (new Date(r.updated_at).getTime() - new Date(r.run_started_at).getTime()) / 3_600_000)
    .sort((a, b) => a - b);

  const avg = durations.reduce((s, v) => s + v, 0) / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.floor(durations.length * 0.95)];

  let rating: LeadTimeRating;
  if (avg < 1) rating = 'elite';
  else if (avg < 24) rating = 'high';
  else if (avg < 24 * 7) rating = 'medium';
  else rating = 'low';

  return { averageLeadTimeHours: avg, medianLeadTimeHours: median, p95LeadTimeHours: p95, rating };
}

// ─── Change Failure Rate ──────────────────────────────────────────────────────

export type ChangeFailureRating = 'elite' | 'high' | 'medium' | 'low';

export interface ChangeFailureRateResult {
  failureRate: number;
  failedDeployments: number;
  totalDeployments: number;
  rating: ChangeFailureRating;
}

/**
 * Calculate change failure rate from deployment statuses.
 * Uses deployment-status schema: state field.
 * Failure states: 'error' | 'failure'
 * Success states: 'success'
 */
export function calculateChangeFailureRate(
  deployments: GitHubDeployment[],
  statusesByDeploymentId: Map<number, GitHubDeploymentStatus[]>,
): ChangeFailureRateResult {
  let failed = 0;
  let total = 0;

  for (const deployment of deployments) {
    const statuses = statusesByDeploymentId.get(deployment.id) ?? [];
    const finalStatus = statuses[0]; // statuses are newest-first
    if (!finalStatus) continue;
    total++;
    if (finalStatus.state === 'error' || finalStatus.state === 'failure') failed++;
  }

  const failureRate = total > 0 ? failed / total : 0;

  let rating: ChangeFailureRating;
  if (failureRate <= 0.05) rating = 'elite';
  else if (failureRate <= 0.10) rating = 'high';
  else if (failureRate <= 0.15) rating = 'medium';
  else rating = 'low';

  return { failureRate, failedDeployments: failed, totalDeployments: total, rating };
}

// ─── MTTR ─────────────────────────────────────────────────────────────────────

export type MTTRRating = 'elite' | 'high' | 'medium' | 'low';

export interface MTTRResult {
  averageMTTRHours: number;
  incidents: number;
  rating: MTTRRating;
}

/**
 * Calculate MTTR from deployment status sequences.
 * MTTR = time from first 'failure'/'error' status to next 'success' status.
 * Uses deployment-status schema: state + created_at fields.
 */
export function calculateMTTR(
  deployments: GitHubDeployment[],
  statusesByDeploymentId: Map<number, GitHubDeploymentStatus[]>,
): MTTRResult {
  const sorted = [...deployments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const timeline: Array<{ time: Date; state: string; env: string }> = [];
  for (const dep of sorted) {
    const statuses = (statusesByDeploymentId.get(dep.id) ?? []).reverse(); // oldest first
    for (const s of statuses) {
      timeline.push({ time: new Date(s.created_at), state: s.state, env: dep.environment });
    }
  }

  const mttrValues: number[] = [];
  let failureTime: Date | null = null;

  for (const event of timeline) {
    if ((event.state === 'failure' || event.state === 'error') && !failureTime) {
      failureTime = event.time;
    } else if (event.state === 'success' && failureTime) {
      const mttrHours = (event.time.getTime() - failureTime.getTime()) / 3_600_000;
      mttrValues.push(mttrHours);
      failureTime = null;
    }
  }

  const avgMTTR = mttrValues.length > 0
    ? mttrValues.reduce((s, v) => s + v, 0) / mttrValues.length
    : 0;

  let rating: MTTRRating;
  if (avgMTTR < 1) rating = 'elite';
  else if (avgMTTR < 24) rating = 'high';
  else if (avgMTTR < 24 * 7) rating = 'medium';
  else rating = 'low';

  return { averageMTTRHours: avgMTTR, incidents: mttrValues.length, rating };
}

// ─── DORA Summary ─────────────────────────────────────────────────────────────

export interface DORAScorecard {
  deploymentFrequency: DeploymentFrequencyResult;
  leadTime: LeadTimeResult;
  changeFailureRate: ChangeFailureRateResult;
  mttr: MTTRResult;
  overallRating: 'elite' | 'high' | 'medium' | 'low';
  calculatedAt: string;
}

const RATING_SCORE: Record<string, number> = { elite: 4, high: 3, medium: 2, low: 1 };

export function buildDORAScorecard(
  deploymentFrequency: DeploymentFrequencyResult,
  leadTime: LeadTimeResult,
  changeFailureRate: ChangeFailureRateResult,
  mttr: MTTRResult,
): DORAScorecard {
  const scores = [
    RATING_SCORE[deploymentFrequency.rating],
    RATING_SCORE[leadTime.rating],
    RATING_SCORE[changeFailureRate.rating],
    RATING_SCORE[mttr.rating],
  ];
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const overallRating = avg >= 3.5 ? 'elite' : avg >= 2.5 ? 'high' : avg >= 1.5 ? 'medium' : 'low';

  return {
    deploymentFrequency,
    leadTime,
    changeFailureRate,
    mttr,
    overallRating,
    calculatedAt: new Date().toISOString(),
  };
}
