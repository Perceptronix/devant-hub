/**
 * Health Score, Task Fulfillment Score, and Burn Alert computation.
 * All derived from existing GitHub data — no new API calls beyond what
 * analytics already fetches.
 */

export interface RepoMetrics {
  owner: string;
  repo: string;
  name: string;
  projectId: string;
  openIssues: number;
  openPRs: number;
  stalePRs: number;       // PRs open > 7 days
  mergedPRs: number;
  closedIssues: number;
  totalIssues: number;    // open + closed in window
  deployments: number;
  failedDeploys: number;
  commitCount: number;
}

export interface HealthScore {
  projectId: string;
  name: string;
  owner: string;
  repo: string;
  /** 0–100 */
  health: number;
  /** 0–100 */
  taskFulfillment: number;
  burnAlert: BurnAlert;
  breakdown: HealthBreakdown;
}

export interface HealthBreakdown {
  prCycleTime: number;    // 0–25
  deployStability: number; // 0–25
  issueResolution: number; // 0–25
  commitVelocity: number;  // 0–25
}

export interface BurnAlert {
  level: "none" | "warning" | "critical";
  /** overrun ratio: actual/budget, where budget = deployments expected per week */
  ratio: number;
  failureRate: number;
  stalePRCount: number;
}

/** Compute all scores from raw metrics. Pure function — testable. */
export function computeHealthScore(m: RepoMetrics): HealthScore {
  // PR cycle time: penalise stale PRs. Full score if no stale PRs.
  const prCycleTime = m.openPRs === 0 ? 25 : Math.round(25 * Math.max(0, 1 - m.stalePRs / Math.max(1, m.openPRs)));

  // Deploy stability: penalise failure rate
  const failRate = m.deployments === 0 ? 0 : m.failedDeploys / m.deployments;
  const deployStability = Math.round(25 * Math.max(0, 1 - failRate * 2));

  // Issue resolution: closed / total in window
  const issueResolution = m.totalIssues === 0 ? 25 : Math.round(25 * Math.min(1, m.closedIssues / Math.max(1, m.totalIssues)));

  // Commit velocity: score based on commits in last 14 days (25 = 14+ commits)
  const commitVelocity = Math.round(Math.min(25, (m.commitCount / 14) * 25));

  const health = prCycleTime + deployStability + issueResolution + commitVelocity;

  // Task fulfillment: PR merge rate × issue close rate
  const mergeRate = m.openPRs + m.mergedPRs === 0 ? 1 : m.mergedPRs / (m.openPRs + m.mergedPRs);
  const closeRate = m.totalIssues === 0 ? 1 : m.closedIssues / m.totalIssues;
  const taskFulfillment = Math.round(((mergeRate + closeRate) / 2) * 100);

  // Burn alert
  const level: BurnAlert["level"] =
    failRate > 0.4 || m.stalePRs > 5 ? "critical"
    : failRate > 0.2 || m.stalePRs > 2 ? "warning"
    : "none";

  return {
    projectId: m.projectId,
    name: m.name,
    owner: m.owner,
    repo: m.repo,
    health,
    taskFulfillment,
    breakdown: { prCycleTime, deployStability, issueResolution, commitVelocity },
    burnAlert: { level, ratio: failRate, failureRate: Math.round(failRate * 100), stalePRCount: m.stalePRs },
  };
}
