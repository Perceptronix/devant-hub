/**
 * DevANT GitHub Security Intelligence Service
 *
 * Wraps GitHub security-related REST API endpoints:
 * - Code scanning alerts (SAST)
 * - Secret scanning alerts
 * - Dependabot alerts
 *
 * All operationIds, paths, and params match the OpenAPI spec exactly.
 * Source: descriptions/api.github.com/api.github.com.json
 */

import { GitHubClient } from '../client/github-client';
import { fetchAllPages } from '../pagination/paginator';

// ─── Code Scanning Alert (schema: code-scanning-alert, 17 properties) ─────────

export interface CodeScanningAlert {
  number: number;
  created_at: string;
  updated_at: string | null;
  url: string;
  html_url: string;
  state: 'open' | 'closed' | 'dismissed' | 'fixed' | 'auto_dismissed';
  dismissed_by: { login: string; id: number } | null;
  dismissed_at: string | null;
  dismissed_reason: 'false positive' | "won't fix" | 'used in tests' | null;
  rule: {
    id: string | null;
    severity: 'none' | 'note' | 'warning' | 'error' | null;
    security_severity_level: 'low' | 'medium' | 'high' | 'critical' | null;
    description: string;
    name: string;
    tags: string[] | null;
  };
  tool: { name: string; version: string | null; guid: string | null };
  most_recent_instance: {
    ref: string;
    analysis_key: string;
    environment: string;
    state: string;
    location: { path?: string; start_line?: number; end_line?: number };
  };
  instances_url: string;
}

// ─── Secret Scanning Alert (schema: secret-scanning-alert, 33 properties) ─────

export interface SecretScanningAlert {
  number: number;
  created_at: string;
  updated_at: string | null;
  url: string;
  html_url: string;
  locations_url: string;
  state: 'open' | 'resolved';
  resolution: 'false_positive' | 'wont_fix' | 'revoked' | 'used_in_tests' | 'pattern_deleted' | 'pattern_edited' | null;
  resolved_at: string | null;
  resolved_by: { login: string; id: number } | null;
  secret_type: string;
  secret_type_display_name: string;
  secret: string;
  push_protection_bypassed: boolean | null;
  push_protection_bypassed_by: { login: string; id: number } | null;
  push_protection_bypassed_at: string | null;
  validity: 'active' | 'inactive' | 'unknown';
}

// ─── Dependabot Alert ─────────────────────────────────────────────────────────

export interface DependabotAlert {
  number: number;
  state: 'auto_dismissed' | 'dismissed' | 'fixed' | 'open';
  dependency: {
    package: { ecosystem: string; name: string };
    manifest_path: string;
    scope: 'development' | 'runtime' | null;
  };
  security_advisory: {
    ghsa_id: string;
    cve_id: string | null;
    summary: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    cvss: { score: number; vector_string: string | null };
    cwes: Array<{ cwe_id: string; name: string }>;
    published_at: string;
    updated_at: string;
    withdrawn_at: string | null;
  };
  security_vulnerability: {
    package: { ecosystem: string; name: string };
    severity: 'low' | 'medium' | 'high' | 'critical';
    vulnerable_version_range: string;
    first_patched_version: { identifier: string } | null;
  };
  url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  dismissed_at: string | null;
  dismissed_by: { login: string; id: number } | null;
  dismissed_reason: string | null;
  dismissed_comment: string | null;
  fixed_at: string | null;
  auto_dismissed_at: string | null;
}

export class GitHubSecurityService {
  constructor(private readonly client: GitHubClient) {}

  // ─── operationId: code-scanning/list-alerts-for-repo ────────────────────────
  // GET /repos/{owner}/{repo}/code-scanning/alerts
  // Params:
  //   tool_name: string
  //   tool_guid: string | null
  //   ref: string
  //   pr_number: integer
  //   state: "open" | "closed" | "dismissed" | "fixed"
  //   severity: "critical" | "high" | "medium" | "low" | "warning" | "note" | "error"
  //   per_page, page
  // Response: array of code-scanning-alert schema (17 properties)
  // Status codes: 200 (Link header), 304, 403, 404, 503

  async listCodeScanningAlerts(
    owner: string,
    repo: string,
    options: {
      toolName?: string;
      ref?: string;
      state?: 'open' | 'closed' | 'dismissed' | 'fixed';
      severity?: 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'note' | 'error';
    } = {},
  ): Promise<CodeScanningAlert[]> {
    return fetchAllPages<CodeScanningAlert>(
      this.client,
      `/repos/${owner}/${repo}/code-scanning/alerts`,
      {
        tool_name: options.toolName,
        ref: options.ref,
        state: options.state ?? 'open',
        severity: options.severity,
      },
    );
  }

  // ─── operationId: secret-scanning/list-alerts-for-repo ──────────────────────
  // GET /repos/{owner}/{repo}/secret-scanning/alerts
  // Params:
  //   state: "open" | "resolved"
  //   secret_type: string (comma-separated)
  //   resolution: string
  //   sort: "created" | "updated" (default: "created")
  //   direction: "asc" | "desc" (default: "desc")
  //   per_page, page (cursor-based: before, after)
  // Response: array of secret-scanning-alert schema (33 properties)
  // Status codes: 200 (Link header), 404, 503

  async listSecretScanningAlerts(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'resolved';
      secretType?: string;
      resolution?: string;
      sort?: 'created' | 'updated';
      direction?: 'asc' | 'desc';
    } = {},
  ): Promise<SecretScanningAlert[]> {
    return fetchAllPages<SecretScanningAlert>(
      this.client,
      `/repos/${owner}/${repo}/secret-scanning/alerts`,
      {
        state: options.state ?? 'open',
        secret_type: options.secretType,
        resolution: options.resolution,
        sort: options.sort ?? 'created',
        direction: options.direction ?? 'desc',
      },
    );
  }

  // ─── operationId: dependabot/list-alerts-for-repo ───────────────────────────
  // GET /repos/{owner}/{repo}/dependabot/alerts
  // Params:
  //   state: "auto_dismissed" | "dismissed" | "fixed" | "open"
  //   severity: "low" | "medium" | "high" | "critical"
  //   ecosystem: string
  //   package: string
  //   manifest: string
  //   scope: "development" | "runtime"
  //   sort: "created" | "updated" (default: "created")
  //   direction: "asc" | "desc" (default: "desc")
  //   per_page, page (also: before, after cursor)
  // Response: array of dependabot-alert schema
  // Status codes: 200 (Link header), 304, 400, 403, 404, 422

  async listDependabotAlerts(
    owner: string,
    repo: string,
    options: {
      state?: 'auto_dismissed' | 'dismissed' | 'fixed' | 'open';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      ecosystem?: string;
      scope?: 'development' | 'runtime';
      sort?: 'created' | 'updated';
      direction?: 'asc' | 'desc';
    } = {},
  ): Promise<DependabotAlert[]> {
    return fetchAllPages<DependabotAlert>(
      this.client,
      `/repos/${owner}/${repo}/dependabot/alerts`,
      {
        state: options.state ?? 'open',
        severity: options.severity,
        ecosystem: options.ecosystem,
        scope: options.scope,
        sort: options.sort ?? 'created',
        direction: options.direction ?? 'desc',
      },
    );
  }

  // ─── Security Risk Summary ────────────────────────────────────────────────────
  // Aggregates all security signals into a single risk snapshot

  async getSecurityRiskSnapshot(owner: string, repo: string): Promise<SecurityRiskSnapshot> {
    const [codeScanningAlerts, secretAlerts, dependabotAlerts] = await Promise.allSettled([
      this.listCodeScanningAlerts(owner, repo, { state: 'open' }),
      this.listSecretScanningAlerts(owner, repo, { state: 'open' }),
      this.listDependabotAlerts(owner, repo, { state: 'open' }),
    ]);

    const csa = codeScanningAlerts.status === 'fulfilled' ? codeScanningAlerts.value : [];
    const ssa = secretAlerts.status === 'fulfilled' ? secretAlerts.value : [];
    const dba = dependabotAlerts.status === 'fulfilled' ? dependabotAlerts.value : [];

    const csaBySeverity = groupBySeverity(csa, a => a.rule.security_severity_level ?? a.rule.severity ?? 'unknown');
    const dbaBySeverity = groupBySeverity(dba, a => a.security_advisory.severity);

    const criticalCount = (csaBySeverity.critical ?? 0) + (dbaBySeverity.critical ?? 0);
    const highCount = (csaBySeverity.high ?? 0) + (dbaBySeverity.high ?? 0);

    let riskLevel: SecurityRiskSnapshot['riskLevel'];
    if (criticalCount > 0 || ssa.length > 0) riskLevel = 'critical';
    else if (highCount > 5) riskLevel = 'high';
    else if (highCount > 0) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      owner,
      repo,
      riskLevel,
      openCodeScanningAlerts: csa.length,
      codeScanningBySeverity: csaBySeverity,
      openSecretAlerts: ssa.length,
      openDependabotAlerts: dba.length,
      dependabotBySeverity: dbaBySeverity,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export interface SecurityRiskSnapshot {
  owner: string;
  repo: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  openCodeScanningAlerts: number;
  codeScanningBySeverity: Record<string, number>;
  openSecretAlerts: number;
  openDependabotAlerts: number;
  dependabotBySeverity: Record<string, number>;
  calculatedAt: string;
}

function groupBySeverity<T>(items: T[], getSeverity: (item: T) => string | null | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const sev = getSeverity(item) ?? 'unknown';
    result[sev] = (result[sev] ?? 0) + 1;
  }
  return result;
}
