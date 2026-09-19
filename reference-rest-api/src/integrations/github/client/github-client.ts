/**
 * DevANT GitHub API Client
 * Centralized HTTP client for all GitHub REST API calls.
 *
 * Auth: GitHub App installation tokens (preferred) or PAT.
 * Rate limits: 5000 req/hr (PAT), 15000 req/hr (GitHub App).
 * Secondary rate limits: triggered by burst — enforced via retry.
 * Spec: descriptions/api.github.com/api.github.com.json (OpenAPI 3.0.3 v1.1.4)
 */

import { GitHubRetryHandler } from '../retry/retry-handler';
import { GitHubRateLimitMonitor } from '../retry/rate-limit-monitor';

export interface GitHubClientConfig {
  /** GitHub App installation token or PAT */
  token: string;
  /** Base URL — override for GHES */
  baseUrl?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** User-Agent header — required by GitHub API */
  userAgent?: string;
}

export interface GitHubRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** ETag from previous response for conditional GET */
  etag?: string;
  /**
   * Set to true for operations with x-github.triggersNotification = true.
   * Enforces 3s minimum delay between calls.
   */
  triggersNotification?: boolean;
}

export interface GitHubResponse<T> {
  data: T;
  status: number;
  /** Link header for pagination — present on paginated endpoints */
  linkHeader?: string;
  /** ETag for conditional caching */
  etag?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  rateLimitLimit?: number;
  /** True when 304 Not Modified — data is from cache */
  notModified?: boolean;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private token: string;
  private readonly retryHandler: GitHubRetryHandler;
  private readonly rateLimitMonitor: GitHubRateLimitMonitor;

  constructor(config: GitHubClientConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.github.com';
    this.userAgent = config.userAgent ?? 'DevANT/1.0';
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.token = config.token;
    this.retryHandler = new GitHubRetryHandler();
    this.rateLimitMonitor = new GitHubRateLimitMonitor();
  }

  /** Update token — used for installation token rotation */
  updateToken(token: string): void {
    this.token = token;
  }

  async request<T>(options: GitHubRequestOptions): Promise<GitHubResponse<T>> {
    return this.retryHandler.withRetry(() => this._doRequest<T>(options));
  }

  private async _doRequest<T>(options: GitHubRequestOptions): Promise<GitHubResponse<T>> {
    // Enforce 3s delay for notification-triggering operations
    if (options.triggersNotification) {
      await this.rateLimitMonitor.enforceNotificationDelay();
    }

    await this.rateLimitMonitor.checkAndWait();

    const url = this._buildUrl(options.path, options.params);
    const headers = this._buildHeaders(options.etag);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    // Extract rate limit headers from every response
    const rateLimitRemaining = Number(response.headers.get('X-RateLimit-Remaining') ?? -1);
    const rateLimitReset = Number(response.headers.get('X-RateLimit-Reset') ?? 0);
    const rateLimitLimit = Number(response.headers.get('X-RateLimit-Limit') ?? -1);
    this.rateLimitMonitor.update(rateLimitRemaining, rateLimitReset);

    // 304 Not Modified — caller should use cached data
    if (response.status === 304) {
      return {
        data: null as unknown as T,
        status: 304,
        notModified: true,
        etag: options.etag,
        rateLimitRemaining,
        rateLimitReset,
        rateLimitLimit,
      };
    }

    // 202 Accepted — stats endpoints are computing asynchronously
    if (response.status === 202) {
      throw new GitHubStatsComputingError(options.path);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new GitHubAPIError(response.status, options.path, body);
    }

    const data = await response.json() as T;
    return {
      data,
      status: response.status,
      linkHeader: response.headers.get('Link') ?? undefined,
      etag: response.headers.get('ETag') ?? undefined,
      rateLimitRemaining,
      rateLimitReset,
      rateLimitLimit,
    };
  }

  private _buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  }

  private _buildHeaders(etag?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
    };
    if (etag) headers['If-None-Match'] = etag;
    return headers;
  }
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class GitHubAPIError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: string,
  ) {
    super(`GitHub API error ${status} on ${path}: ${body}`);
    this.name = 'GitHubAPIError';
  }
}

export class GitHubStatsComputingError extends Error {
  constructor(public readonly path: string) {
    super(`GitHub stats computing (202) for ${path} — retry after delay`);
    this.name = 'GitHubStatsComputingError';
  }
}

export class GitHubRateLimitError extends Error {
  constructor(public readonly resetAt: number) {
    super(`GitHub rate limit exceeded — resets at ${new Date(resetAt * 1000).toISOString()}`);
    this.name = 'GitHubRateLimitError';
  }
}
