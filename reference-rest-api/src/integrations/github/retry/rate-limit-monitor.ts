/**
 * GitHub Rate Limit Monitor
 *
 * Tracks X-RateLimit-Remaining and X-RateLimit-Reset headers from every
 * GitHub API response. Proactively pauses requests when remaining < threshold.
 *
 * Primary rate limit: 5000/hr (PAT), 15000/hr (GitHub App installation token)
 * Secondary rate limit: burst-based, no fixed quota — enforced by retry handler
 * Notification-triggering ops: 3s minimum delay (x-github.triggersNotification)
 *
 * Source: GitHub REST API rate limiting documentation.
 */

export class GitHubRateLimitMonitor {
  private remaining: number = 5000;
  private resetAt: number = 0;
  private lastNotificationCallAt: number = 0;

  private readonly LOW_THRESHOLD = 100;
  private readonly NOTIFICATION_DELAY_MS = 3_000;

  update(remaining: number, resetAt: number): void {
    this.remaining = remaining;
    this.resetAt = resetAt;
  }

  async checkAndWait(): Promise<void> {
    if (this.remaining < this.LOW_THRESHOLD && this.resetAt > 0) {
      const waitMs = Math.max(0, this.resetAt * 1000 - Date.now()) + 500;
      if (waitMs > 0 && waitMs < 3_600_000) {
        await this._sleep(waitMs);
      }
    }
  }

  /** Enforce 3s minimum between notification-triggering operations */
  async enforceNotificationDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastNotificationCallAt;
    if (elapsed < this.NOTIFICATION_DELAY_MS) {
      await this._sleep(this.NOTIFICATION_DELAY_MS - elapsed);
    }
    this.lastNotificationCallAt = Date.now();
  }

  getStatus(): { remaining: number; resetAt: Date | null } {
    return {
      remaining: this.remaining,
      resetAt: this.resetAt > 0 ? new Date(this.resetAt * 1000) : null,
    };
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
