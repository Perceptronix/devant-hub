/**
 * GitHub API Retry Handler
 *
 * Handles:
 * - 429 Too Many Requests (primary rate limit)
 * - 403 with retry-after (secondary rate limit / abuse detection)
 * - 500/502/503/504 transient server errors
 * - 202 Accepted (stats computing) — via GitHubStatsComputingError
 *
 * Source: GitHub REST API docs on rate limiting and abuse detection.
 * x-github.triggersNotification operations use 3s base delay.
 */

import { GitHubAPIError, GitHubRateLimitError, GitHubStatsComputingError } from '../client/github-client';

export interface RetryConfig {
  maxAttempts: number;
  /** Base delay in ms for exponential backoff */
  baseDelayMs: number;
  /** Max delay cap in ms */
  maxDelayMs: number;
  /** Delay between stats-computing retries (202) in ms */
  statsRetryDelayMs: number;
  /** Max attempts for stats-computing retries */
  statsMaxAttempts: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  statsRetryDelayMs: 5_000,
  statsMaxAttempts: 6,
};

export class GitHubRetryHandler {
  private readonly config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let statsAttempts = 0;
    let attempt = 0;

    while (true) {
      try {
        return await fn();
      } catch (err) {
        // Stats computing — GitHub returns 202 while computing
        if (err instanceof GitHubStatsComputingError) {
          statsAttempts++;
          if (statsAttempts >= this.config.statsMaxAttempts) throw err;
          await this._sleep(this.config.statsRetryDelayMs);
          continue;
        }

        // Rate limit exceeded
        if (err instanceof GitHubRateLimitError) {
          const waitMs = Math.max(0, err.resetAt * 1000 - Date.now()) + 1000;
          await this._sleep(Math.min(waitMs, this.config.maxDelayMs));
          attempt = 0;
          continue;
        }

        if (err instanceof GitHubAPIError) {
          attempt++;
          if (attempt >= this.config.maxAttempts) throw err;

          // 429 — primary rate limit
          if (err.status === 429) {
            const retryAfter = this._parseRetryAfter(err.body);
            await this._sleep(retryAfter ?? this._backoff(attempt));
            continue;
          }

          // 403 — secondary rate limit / abuse detection
          if (err.status === 403) {
            const retryAfter = this._parseRetryAfter(err.body);
            if (retryAfter !== null) {
              await this._sleep(retryAfter);
              continue;
            }
            // Non-retryable 403 (auth failure)
            throw err;
          }

          // Transient server errors
          if ([500, 502, 503, 504].includes(err.status)) {
            await this._sleep(this._backoff(attempt));
            continue;
          }

          // Non-retryable client errors
          throw err;
        }

        // AbortError (timeout) — retry
        if (err instanceof Error && err.name === 'AbortError') {
          attempt++;
          if (attempt >= this.config.maxAttempts) throw err;
          await this._sleep(this._backoff(attempt));
          continue;
        }

        throw err;
      }
    }
  }

  /** Exponential backoff with jitter */
  private _backoff(attempt: number): number {
    const exp = Math.min(this.config.baseDelayMs * Math.pow(2, attempt - 1), this.config.maxDelayMs);
    const jitter = Math.random() * 0.3 * exp;
    return Math.floor(exp + jitter);
  }

  private _parseRetryAfter(body: string): number | null {
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed?.retry_after === 'number') return parsed.retry_after * 1000;
    } catch { /* ignore */ }
    return null;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
