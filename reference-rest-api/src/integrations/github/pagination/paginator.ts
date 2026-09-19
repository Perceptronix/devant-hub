/**
 * GitHub Pagination Helper
 *
 * GitHub uses Link header pagination for all list endpoints.
 * 199 endpoints in the spec return a Link response header.
 *
 * Spec-confirmed pagination params:
 *   per_page: integer, default 30 (components/parameters/per-page)
 *   page:     integer, default 1  (components/parameters/page)
 *   Max per_page: 100 for most endpoints
 *
 * Link header format (RFC 5988):
 *   <https://api.github.com/...?page=2>; rel="next",
 *   <https://api.github.com/...?page=5>; rel="last"
 *
 * Cursor pagination: only 2 endpoints use cursor param
 *   (components/parameters/cursor — query string, type: string)
 */

import { GitHubClient, GitHubResponse } from '../client/github-client';

export interface PaginationOptions {
  /** Items per page — max 100 for most endpoints */
  perPage?: number;
  /** Starting page number */
  startPage?: number;
  /** Max total items to fetch (0 = unlimited) */
  maxItems?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface PageResult<T> {
  items: T[];
  totalFetched: number;
  hasMore: boolean;
  lastPage?: number;
}

/** Parse Link header into a map of rel → URL */
export function parseLinkHeader(linkHeader: string): Record<string, string> {
  const links: Record<string, string> = {};
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.trim().match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  }
  return links;
}

/** Extract page number from a GitHub pagination URL */
export function extractPageNumber(url: string): number | null {
  try {
    const u = new URL(url);
    const page = u.searchParams.get('page');
    return page ? parseInt(page, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch all pages of a paginated GitHub endpoint.
 * Uses Link header to detect next page.
 */
export async function fetchAllPages<T>(
  client: GitHubClient,
  path: string,
  queryParams: Record<string, string | number | boolean | undefined>,
  options: PaginationOptions = {},
): Promise<T[]> {
  const perPage = options.perPage ?? 100;
  const maxItems = options.maxItems ?? 0;
  let page = options.startPage ?? 1;
  const allItems: T[] = [];

  while (true) {
    if (options.signal?.aborted) break;

    const response: GitHubResponse<T[]> = await client.request<T[]>({
      method: 'GET',
      path,
      params: { ...queryParams, per_page: perPage, page },
    });

    if (response.notModified) break;

    const items = response.data ?? [];
    allItems.push(...items);

    if (maxItems > 0 && allItems.length >= maxItems) {
      return allItems.slice(0, maxItems);
    }

    // No Link header or no "next" rel — we're done
    if (!response.linkHeader) break;
    const links = parseLinkHeader(response.linkHeader);
    if (!links['next']) break;

    const nextPage = extractPageNumber(links['next']);
    if (!nextPage) break;
    page = nextPage;
  }

  return allItems;
}

/**
 * Incremental sync: fetch only items since a given timestamp.
 * Uses the `since` query parameter (ISO 8601 date-time).
 * Supported by: repos/list-commits, issues/list-for-repo, activity endpoints.
 */
export async function fetchSince<T>(
  client: GitHubClient,
  path: string,
  since: Date,
  extraParams: Record<string, string | number | boolean | undefined> = {},
  options: PaginationOptions = {},
): Promise<T[]> {
  return fetchAllPages<T>(client, path, {
    ...extraParams,
    since: since.toISOString(),
  }, options);
}

/**
 * Backfill strategy: fetch pages in reverse chronological order.
 * Stops when items older than `until` are encountered.
 */
export async function backfillUntil<T extends { created_at?: string; updated_at?: string }>(
  client: GitHubClient,
  path: string,
  until: Date,
  extraParams: Record<string, string | number | boolean | undefined> = {},
  options: PaginationOptions = {},
): Promise<T[]> {
  const perPage = options.perPage ?? 100;
  let page = options.startPage ?? 1;
  const allItems: T[] = [];

  while (true) {
    if (options.signal?.aborted) break;

    const response: GitHubResponse<T[]> = await client.request<T[]>({
      method: 'GET',
      path,
      params: { ...extraParams, per_page: perPage, page },
    });

    if (response.notModified || !response.data?.length) break;

    const items = response.data;
    let reachedEnd = false;

    for (const item of items) {
      const ts = item.created_at ?? item.updated_at;
      if (ts && new Date(ts) < until) {
        reachedEnd = true;
        break;
      }
      allItems.push(item);
    }

    if (reachedEnd) break;
    if (!response.linkHeader) break;
    const links = parseLinkHeader(response.linkHeader);
    if (!links['next']) break;

    const nextPage = extractPageNumber(links['next']);
    if (!nextPage) break;
    page = nextPage;
  }

  return allItems;
}
