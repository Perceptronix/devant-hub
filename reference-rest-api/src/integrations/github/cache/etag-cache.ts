/**
 * ETag Cache for GitHub API
 *
 * GitHub returns ETag headers on most GET responses.
 * Sending If-None-Match with the stored ETag returns 304 Not Modified
 * when data hasn't changed — saves rate limit quota.
 *
 * Cache key: operationId + serialized path params
 * TTL: configurable per category (short for PRs/issues, longer for stats)
 */

export interface CacheEntry {
  etag: string;
  data: unknown;
  cachedAt: number;
  ttlMs: number;
}

export interface ETagCacheConfig {
  /** Default TTL in ms */
  defaultTtlMs?: number;
  /** Max cache entries before LRU eviction */
  maxEntries?: number;
}

/** TTL presets by DevANT category (ms) */
export const CACHE_TTL = {
  /** Repo metadata changes rarely */
  REPOSITORY: 5 * 60 * 1000,
  /** Commits: use incremental sync, cache individual commits long */
  COMMIT: 10 * 60 * 1000,
  /** PRs change frequently when open */
  PULL_REQUEST: 2 * 60 * 1000,
  /** Issues change frequently */
  ISSUE: 2 * 60 * 1000,
  /** Deployments: webhook-driven, cache for fallback */
  DEPLOYMENT: 3 * 60 * 1000,
  /** Releases change rarely */
  RELEASE: 10 * 60 * 1000,
  /** Stats: computed async, cache aggressively */
  STATS: 60 * 60 * 1000,
  /** Traffic: only updates daily */
  TRAFFIC: 60 * 60 * 1000,
  /** Actions runs: change during CI */
  ACTIONS: 1 * 60 * 1000,
} as const;

export class ETagCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(config: ETagCacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? 10_000;
    this.defaultTtlMs = config.defaultTtlMs ?? CACHE_TTL.REPOSITORY;
  }

  get(key: string): CacheEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  set(key: string, etag: string, data: unknown, ttlMs?: number): void {
    if (this.store.size >= this.maxEntries) {
      // LRU eviction: remove oldest entry
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      etag,
      data,
      cachedAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Build a cache key from operationId + path params */
  static buildKey(operationId: string, params: Record<string, string>): string {
    const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return `${operationId}:${sorted}`;
  }

  getStats(): { size: number; maxEntries: number } {
    return { size: this.store.size, maxEntries: this.maxEntries };
  }
}
