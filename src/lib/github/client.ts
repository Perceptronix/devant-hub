/**
 * GitHub REST API v3 client.
 * Implements 28 endpoints with retries, ETag passthrough, and pagination helpers.
 */

const BASE = "https://api.github.com";

export interface GitHubFetchOpts extends Omit<RequestInit, "body"> {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function ghFetch<T>(path: string, token: string, opts: GitHubFetchOpts = {}): Promise<T> {
  const url = new URL(BASE + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  let attempt = 0;
  while (attempt < 4) {
    const res = await fetch(url.toString(), {
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(opts.headers as Record<string, string> | undefined),
      },
    });
    if (res.status === 304) return null as T;
    if (res.status === 204) return null as T;
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "0", 10);
      const delay = (retryAfter || Math.pow(2, attempt)) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GitHub ${res.status} ${res.statusText} on ${path}: ${text}`);
    }
    return (await res.json()) as T;
  }
  throw new Error(`GitHub: max retries exceeded on ${path}`);
}

async function ghPaginate<T>(path: string, token: string, opts: GitHubFetchOpts = {}, max = 200): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  const perPage = 100;
  while (results.length < max) {
    const batch = await ghFetch<T[]>(path, token, {
      ...opts,
      query: { ...opts.query, per_page: perPage, page },
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }
  return results;
}

export async function listAllCommits(token: string, owner: string, repo: string, opts: CommitListOpts = {}, max = 500): Promise<any[]> {
  const results: any[] = [];
  let page = opts.page ?? 1;
  const perPage = opts.per_page ?? 100;
  while (results.length < max) {
    const batch = await listCommits(token, owner, repo, { ...opts, per_page: perPage, page });
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return results.slice(0, max);
}

// ---------- Repository ----------
export const getRepo = (token: string, owner: string, repo: string) =>
  ghFetch<any>(`/repos/${owner}/${repo}`, token);

export const listUserRepos = (token: string) =>
  ghPaginate<any>(`/user/repos`, token, { query: { sort: "updated", per_page: 100 } });

export const listBranches = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/branches`, token);

export const listCollaborators = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/collaborators`, token);

export const listContributors = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/contributors`, token);

// ---------- Deployments ----------
export const listDeployments = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/deployments`, token);

export const listDeploymentStatuses = (token: string, owner: string, repo: string, deploymentId: number) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`, token);

// ---------- Webhooks ----------
export const listHooks = (token: string, owner: string, repo: string) =>
  ghFetch<any[]>(`/repos/${owner}/${repo}/hooks`, token);

export const createHook = (token: string, owner: string, repo: string, body: { config: { url: string; secret?: string; content_type?: string }; events?: string[]; active?: boolean }) =>
  ghFetch<any>(`/repos/${owner}/${repo}/hooks`, token, {
    method: "POST",
    body: { name: "web", active: true, events: ["push", "pull_request", "issues", "deployment", "deployment_status"], ...body },
  });

export const getHook = (token: string, owner: string, repo: string, hookId: number) =>
  ghFetch<any>(`/repos/${owner}/${repo}/hooks/${hookId}`, token);

export const deleteHook = (token: string, owner: string, repo: string, hookId: number) =>
  ghFetch<void>(`/repos/${owner}/${repo}/hooks/${hookId}`, token, { method: "DELETE" });

// ---------- Commits ----------
export interface CommitListOpts {
  sha?: string;
  author?: string;
  since?: string;
  until?: string;
  per_page?: number;
  page?: number;
}
export const listCommits = (token: string, owner: string, repo: string, opts: CommitListOpts = {}) =>
  ghFetch<any[]>(`/repos/${owner}/${repo}/commits`, token, { query: opts as Record<string, string | number | undefined> });

export const getCommit = (token: string, owner: string, repo: string, ref: string) =>
  ghFetch<any>(`/repos/${owner}/${repo}/commits/${ref}`, token);

export const compareCommits = (token: string, owner: string, repo: string, basehead: string) =>
  ghFetch<any>(`/repos/${owner}/${repo}/compare/${basehead}`, token);

// ---------- Releases & Tags ----------
export const listReleases = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/releases`, token);

export const listTags = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/tags`, token);

// ---------- Pull Requests ----------
export const listPulls = (token: string, owner: string, repo: string, state: "open" | "closed" | "all" = "open") =>
  ghPaginate<any>(`/repos/${owner}/${repo}/pulls`, token, { query: { state } });

export const getPull = (token: string, owner: string, repo: string, num: number) =>
  ghFetch<any>(`/repos/${owner}/${repo}/pulls/${num}`, token);

export const listPullCommits = (token: string, owner: string, repo: string, num: number) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/pulls/${num}/commits`, token);

export const listPullFiles = (token: string, owner: string, repo: string, num: number) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/pulls/${num}/files`, token);

export const listPullRequestedReviewers = (token: string, owner: string, repo: string, num: number) =>
  ghFetch<any>(`/repos/${owner}/${repo}/pulls/${num}/requested_reviewers`, token);

export const listPullReviews = (token: string, owner: string, repo: string, num: number) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/pulls/${num}/reviews`, token);

// ---------- Issues ----------
export const listIssues = (token: string, owner: string, repo: string, state: "open" | "closed" | "all" = "open") =>
  ghPaginate<any>(`/repos/${owner}/${repo}/issues`, token, { query: { state } });

export const listIssueEvents = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/issues/events`, token);

export const listLabels = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/labels`, token);

export const listMilestones = (token: string, owner: string, repo: string) =>
  ghPaginate<any>(`/repos/${owner}/${repo}/milestones`, token);

// ---------- Users ----------
export const getAuthenticatedUser = (token: string) => ghFetch<any>(`/user`, token);
export const getUserByLogin = (token: string, login: string) => ghFetch<any>(`/users/${login}`, token);
