# DevANT GitHub Integration Architecture

Source of truth: `github/rest-api-description` (OpenAPI 3.0.3, v1.1.4)
Spec file: `descriptions/api.github.com/api.github.com.json`

---

## Repository Analysis Summary

| Metric | Value |
|--------|-------|
| OpenAPI version | 3.0.3 |
| Spec version | 1.1.4 |
| Total operations | 1,153 |
| Total paths | 765 |
| Official tags | 48 |
| Component schemas | 926 |
| Reusable parameters | 200 |
| Reusable responses | 43 |
| Paginated endpoints (Link header) | 199 |
| Cursor-paginated endpoints | 2 |
| GitHub App-enabled operations | 902 |
| Notification-triggering operations | 20 |
| Deprecated operations | 31 |

## Spec Variants

| Variant | Location | Purpose |
|---------|----------|---------|
| `api.github.com.json` | `descriptions/api.github.com/` | Stable, GitHub.com — **use this** |
| `api.github.com.2022-11-28.json` | same | Versioned API (header: `X-GitHub-Api-Version: 2022-11-28`) |
| `api.github.com.2026-03-10.json` | same | Newer versioned API |
| `ghec.*` | `descriptions/ghec/` | GitHub Enterprise Cloud |
| `ghes-3.x.*` | `descriptions/ghes-3.x/` | GitHub Enterprise Server |
| `descriptions-next/` | — | OpenAPI 3.1 — subject to breaking changes |

**DevANT uses**: `descriptions/api.github.com/api.github.com.json` (stable, 3.0.3)

---

## Pagination Architecture

### Link Header Pagination (199 endpoints)
All list endpoints use RFC 5988 Link headers:
```
Link: <https://api.github.com/repos/owner/repo/commits?page=2>; rel="next",
      <https://api.github.com/repos/owner/repo/commits?page=5>; rel="last"
```

Spec-confirmed parameters (from `components/parameters`):
- `per_page`: integer, default 30, max 100 (most endpoints)
- `page`: integer, default 1

### Incremental Sync Strategy
Endpoints supporting `since` (ISO 8601 date-time):
- `repos/list-commits` — `since`, `until`
- `issues/list-for-repo` — `since`
- `activity/list-repo-events` — no since, use ETag

### Stats Endpoints (202 Async)
These 5 endpoints return `202 Accepted` while GitHub computes stats:
- `repos/get-contributors-stats`
- `repos/get-commit-activity-stats`
- `repos/get-code-frequency-stats`
- `repos/get-participation-stats`
- `repos/get-punch-card-stats`

**Strategy**: Retry after 5s, max 6 attempts. Cache results for 1 hour.

---

## Authentication Architecture

GitHub API uses Bearer token auth. No security schemes are defined in the spec
(global security is undefined — all endpoints accept the same auth).

| Token Type | Rate Limit | Best For |
|-----------|-----------|---------|
| GitHub App installation token | 15,000 req/hr | Production — DevANT preferred |
| Personal Access Token (PAT) | 5,000 req/hr | Development only |
| Unauthenticated | 60 req/hr | Never use in production |

**Required headers** (all requests):
```
Authorization: Bearer {token}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
User-Agent: DevANT/1.0
```

### GitHub App vs PAT Endpoint Coverage
- 902/1153 operations: `x-github.enabledForGitHubApps = true`
- 246/1153 operations: `x-github.enabledForGitHubApps = false` (OAuth/PAT only)
- Traffic endpoints (`/traffic/*`) require push access — not available via GitHub Apps

---

## Rate Limit Architecture

### Primary Rate Limit
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Monitor on every response via `GitHubRateLimitMonitor`
- Pause when remaining < 100, wait until reset

### Secondary Rate Limit (Abuse Detection)
- Triggered by burst requests, concurrent requests, or notification-triggering ops
- Response: `403` with `retry_after` in body, or `429`
- 20 operations have `x-github.triggersNotification = true` — enforce 3s delay

### Rate Limit Response Headers (from `/rate_limit` endpoint)
```json
{
  "resources": {
    "core": { "limit": 5000, "remaining": 4999, "reset": 1372700873, "used": 1 },
    "search": { "limit": 30, "remaining": 18, "reset": 1372697452, "used": 12 }
  }
}
```

---

## Webhook Architecture

### Webhook-First Ingestion Design
Real-time events replace polling for all supported event types.
REST polling is used only for:
1. Initial backfill
2. Webhook delivery failures (gap recovery)
3. Endpoints with no webhook equivalent (stats, traffic)

### Supported Webhook Events for DevANT

| Event | DevANT Use | Replaces Polling |
|-------|-----------|-----------------|
| `push` | Commit intelligence, lead time | `repos/list-commits` |
| `pull_request` | PR cycle time, stale detection | `pulls/list` |
| `pull_request_review` | Review latency | `pulls/list-reviews` |
| `issues` | Issue velocity, sprint tracking | `issues/list-for-repo` |
| `deployment` | DORA deployment frequency | `repos/list-deployments` |
| `deployment_status` | DORA MTTR, failure rate | `repos/list-deployment-statuses` |
| `release` | Release cadence | `repos/list-releases` |
| `workflow_run` | CI intelligence, DORA | `actions/list-workflow-runs-for-repo` |
| `check_run` | CI status per commit | `checks/list-for-ref` |
| `code_scanning_alert` | Security intelligence | `code-scanning/list-alerts-for-repo` |
| `secret_scanning_alert` | Security intelligence | `secret-scanning/list-alerts-for-repo` |
| `repository` | Repo metadata changes | `repos/get` |

### Webhook Security
- Signature: `X-Hub-Signature-256: sha256={HMAC-SHA256}`
- Delivery ID: `X-GitHub-Delivery` — use for deduplication
- Event type: `X-GitHub-Event`
- Replay protection: store delivery IDs with 24h TTL

### Webhook Registration
- Repo-level: `POST /repos/{owner}/{repo}/hooks`
- Org-level: `POST /orgs/{org}/hooks` — covers all repos (preferred for multi-repo)

---

## ETag Caching Strategy

| Category | TTL | Rationale |
|----------|-----|-----------|
| Repository metadata | 5 min | Changes rarely |
| Individual commits | 10 min | Immutable after push |
| Pull requests (open) | 2 min | Active changes |
| Issues (open) | 2 min | Active changes |
| Deployments | 3 min | Webhook-driven |
| Releases | 10 min | Infrequent changes |
| Stats (async) | 60 min | Expensive to compute |
| Traffic | 60 min | Daily granularity |
| Actions runs | 1 min | Active during CI |

---

## DORA Metrics Data Sources

| DORA Metric | Primary Source | Fallback |
|-------------|---------------|---------|
| Deployment Frequency | `deployment` webhook | `repos/list-deployments` |
| Lead Time for Changes | `push` webhook + `workflow_run` webhook | `repos/list-commits` + `actions/list-workflow-runs-for-repo` |
| Change Failure Rate | `deployment_status` webhook | `repos/list-deployment-statuses` |
| MTTR | `deployment_status` webhook sequence | `repos/list-deployment-statuses` |

---

## AI Intelligence Data Sources

| Signal | Endpoint | Schema Fields Used |
|--------|----------|-------------------|
| Commit risk | `repos/get-commit` | `stats.additions`, `stats.deletions`, `files[].status` |
| Stale PR | `pulls/get` | `updated_at`, `draft`, `mergeable`, `requested_reviewers` |
| Bus factor | `repos/get-contributors-stats` | `author.login`, `total`, `weeks[]` |
| Hotspot files | `repos/get-commit` (files) | `files[].filename`, `additions`, `deletions` |
| Code churn | `repos/get-code-frequency-stats` | `[timestamp, additions, deletions]` |
| Sprint velocity | `issues/list-milestones` | `open_issues`, `closed_issues`, `due_on` |
| Release cadence | `repos/list-releases` | `published_at`, `draft`, `prerelease` |
| Contributor ownership | `repos/get-contributors-stats` | `author.login`, `weeks[].c` |

---

## SDK Directory Structure

```
src/integrations/github/
├── openapi/
│   └── endpoint-registry.ts      # Full endpoint registry with DevANT metadata
├── client/
│   └── github-client.ts          # Centralized HTTP client, ETag, rate limit headers
├── retry/
│   ├── retry-handler.ts          # Exponential backoff, 202/429/403/5xx handling
│   └── rate-limit-monitor.ts     # Proactive rate limit monitoring
├── pagination/
│   └── paginator.ts              # Link header pagination, incremental sync, backfill
├── cache/
│   └── etag-cache.ts             # ETag cache with TTL presets per category
├── webhooks/
│   ├── webhook-handler.ts        # HMAC verification, deduplication, parsing
│   └── webhook-router.ts         # Event routing + typed payload interfaces
├── services/
│   ├── repos-service.ts          # repos, commits, branches, stats, traffic, deployments
│   ├── pulls-service.ts          # pull requests, reviews, files, commits
│   └── actions-service.ts        # workflow runs, jobs, timing
├── transforms/
│   ├── dora-transforms.ts        # DORA metric calculations
│   └── ai-intelligence-transforms.ts  # Risk scoring, stale PR, bus factor, hotspots
├── validators/
│   └── zod-schemas.ts            # Zod runtime validation for all key schemas
├── types/
│   └── github-schemas.ts         # TypeScript interfaces matching OpenAPI schemas
└── ARCHITECTURE.md               # This file
```

---

## MVP Endpoint Priority List

### Tier 1 — Critical (implement first)
1. `GET /repos/{owner}/{repo}` — repo metadata baseline
2. `GET /repos/{owner}/{repo}/commits` — commit velocity
3. `GET /repos/{owner}/{repo}/pulls` — PR inventory
4. `GET /repos/{owner}/{repo}/pulls/{pull_number}` — PR detail
5. `GET /repos/{owner}/{repo}/deployments` — deployment frequency
6. `GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses` — MTTR
7. `GET /repos/{owner}/{repo}/actions/runs` — CI intelligence
8. `POST /repos/{owner}/{repo}/hooks` — webhook registration
9. `GET /rate_limit` — quota monitoring

### Tier 2 — High Value (implement second)
10. `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` — review latency
11. `GET /repos/{owner}/{repo}/issues` — issue velocity
12. `GET /repos/{owner}/{repo}/releases/latest` — release tracking
13. `GET /repos/{owner}/{repo}/stats/contributors` — bus factor
14. `GET /repos/{owner}/{repo}/stats/commit_activity` — velocity trends
15. `GET /repos/{owner}/{repo}/compare/{basehead}` — lead time

### Tier 3 — Intelligence Enhancement
16. `GET /repos/{owner}/{repo}/stats/code_frequency` — churn detection
17. `GET /repos/{owner}/{repo}/contributors` — contributor ranking
18. `GET /repos/{owner}/{repo}/milestones` — sprint tracking
19. `GET /repos/{owner}/{repo}/commits/{ref}/check-runs` — CI status
20. `GET /repos/{owner}/{repo}/code-scanning/alerts` — security risk

---

## Production Scaling Recommendations

1. **Webhook-first**: Register org-level webhooks to cover all repos with one hook
2. **Token rotation**: Use GitHub App installation tokens (15k/hr vs 5k/hr PAT)
3. **Incremental sync**: Use `since` param on commits/issues — never full re-fetch
4. **Stats caching**: Cache stats endpoints for 1hr — they're expensive and async
5. **ETag everywhere**: Send `If-None-Match` on all GET requests — 304s are free
6. **Parallel repos**: Process multiple repos concurrently with per-repo rate limit tracking
7. **Backfill queue**: Use a job queue for historical backfill — don't block real-time
8. **Delivery deduplication**: Store webhook delivery IDs in Redis with 24h TTL
9. **Gap recovery**: On webhook failure, poll the affected endpoint for the missed window
10. **Secondary rate limit**: Never burst — add 1s delay between write operations
