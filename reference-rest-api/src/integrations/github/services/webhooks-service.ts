/**
 * DevANT GitHub Webhooks Management Service
 *
 * Manages webhook registration, verification, and delivery audit.
 * All operationIds, paths, and params match the OpenAPI spec exactly.
 * Source: descriptions/api.github.com/api.github.com.json
 *
 * Webhook endpoints in spec (23 total):
 *   Repo-level:  GET/POST/PATCH/DELETE /repos/{owner}/{repo}/hooks
 *   Org-level:   GET/POST/PATCH/DELETE /orgs/{org}/hooks
 *   Deliveries:  GET /hooks/{hook_id}/deliveries
 *   Redeliver:   POST /hooks/{hook_id}/deliveries/{delivery_id}/attempts
 */

import { GitHubClient } from '../client/github-client';
import { fetchAllPages } from '../pagination/paginator';

// ─── Hook Schema (schema: hook, 13 properties) ────────────────────────────────

export interface GitHubHook {
  type: string;
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    email?: string;
    password?: string;
    room?: string;
    subdomain?: string;
    url?: string;
    insecure_ssl?: string | number;
    content_type?: string;
    digest?: string;
    secret?: string;
    token?: string;
  };
  updated_at: string;
  created_at: string;
  url: string;
  test_url: string;
  ping_url: string;
  deliveries_url?: string;
  last_response: {
    code: number | null;
    status: string;
    message: string | null;
  };
}

// ─── Hook Delivery (schema: hook-delivery, 15 properties) ─────────────────────

export interface GitHubHookDelivery {
  id: number;
  guid: string;
  delivered_at: string;
  redelivery: boolean;
  duration: number;
  status: string;
  status_code: number;
  event: string;
  action: string | null;
  installation_id: number | null;
  repository_id: number | null;
  url?: string;
  throttled_at?: string | null;
}

// ─── DevANT Webhook Events ────────────────────────────────────────────────────

/** Events DevANT subscribes to for full intelligence coverage */
export const DEVANT_WEBHOOK_EVENTS = [
  'push',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
  'issues',
  'issue_comment',
  'deployment',
  'deployment_status',
  'release',
  'workflow_run',
  'check_run',
  'check_suite',
  'create',
  'delete',
  'code_scanning_alert',
  'secret_scanning_alert',
  'repository',
  'member',
] as const;

export class GitHubWebhooksService {
  constructor(private readonly client: GitHubClient) {}

  // ─── operationId: repos/list-webhooks ───────────────────────────────────────
  // GET /repos/{owner}/{repo}/hooks
  // Params: per_page, page
  // Response: array of hook schema (13 properties)
  // Status codes: 200 (Link header), 404

  async listRepoWebhooks(owner: string, repo: string): Promise<GitHubHook[]> {
    return fetchAllPages<GitHubHook>(
      this.client,
      `/repos/${owner}/${repo}/hooks`,
      {},
    );
  }

  // ─── operationId: repos/create-webhook ──────────────────────────────────────
  // POST /repos/{owner}/{repo}/hooks
  // Request body:
  //   name: "web" (required for webhook)
  //   config: { url, content_type, secret, insecure_ssl }
  //   events: string[] (default: ["push"])
  //   active: boolean (default: true)
  // Response: hook schema
  // Status codes: 201, 403, 404, 422

  async createRepoWebhook(
    owner: string,
    repo: string,
    config: {
      url: string;
      secret: string;
      contentType?: 'json' | 'form';
      events?: string[];
      active?: boolean;
    },
  ): Promise<GitHubHook> {
    const response = await this.client.request<GitHubHook>({
      method: 'POST',
      path: `/repos/${owner}/${repo}/hooks`,
      body: {
        name: 'web',
        config: {
          url: config.url,
          content_type: config.contentType ?? 'json',
          secret: config.secret,
          insecure_ssl: '0',
        },
        events: config.events ?? [...DEVANT_WEBHOOK_EVENTS],
        active: config.active ?? true,
      },
    });
    return response.data;
  }

  // ─── operationId: repos/get-webhook ─────────────────────────────────────────
  // GET /repos/{owner}/{repo}/hooks/{hook_id}
  // Response: hook schema
  // Status codes: 200, 404

  async getRepoWebhook(owner: string, repo: string, hookId: number): Promise<GitHubHook> {
    const response = await this.client.request<GitHubHook>({
      method: 'GET',
      path: `/repos/${owner}/${repo}/hooks/${hookId}`,
    });
    return response.data;
  }

  // ─── operationId: repos/update-webhook ──────────────────────────────────────
  // PATCH /repos/{owner}/{repo}/hooks/{hook_id}
  // Request body: config?, events?, add_events?, remove_events?, active?
  // Response: hook schema
  // Status codes: 200, 404, 422

  async updateRepoWebhook(
    owner: string,
    repo: string,
    hookId: number,
    updates: {
      url?: string;
      secret?: string;
      events?: string[];
      active?: boolean;
    },
  ): Promise<GitHubHook> {
    const body: Record<string, unknown> = {};
    if (updates.url || updates.secret) {
      body.config = {
        ...(updates.url && { url: updates.url }),
        ...(updates.secret && { secret: updates.secret }),
        content_type: 'json',
        insecure_ssl: '0',
      };
    }
    if (updates.events) body.events = updates.events;
    if (updates.active !== undefined) body.active = updates.active;

    const response = await this.client.request<GitHubHook>({
      method: 'PATCH',
      path: `/repos/${owner}/${repo}/hooks/${hookId}`,
      body,
    });
    return response.data;
  }

  // ─── operationId: repos/delete-webhook ──────────────────────────────────────
  // DELETE /repos/{owner}/{repo}/hooks/{hook_id}
  // Response: 204 No Content
  // Status codes: 204, 404

  async deleteRepoWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.client.request<void>({
      method: 'DELETE',
      path: `/repos/${owner}/${repo}/hooks/${hookId}`,
    });
  }

  // ─── operationId: repos/list-webhook-deliveries ─────────────────────────────
  // GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries
  // Params: per_page, page, cursor
  // Response: array of hook-delivery schema (15 properties)
  // Status codes: 200 (Link header), 400, 422

  async listWebhookDeliveries(
    owner: string,
    repo: string,
    hookId: number,
  ): Promise<GitHubHookDelivery[]> {
    return fetchAllPages<GitHubHookDelivery>(
      this.client,
      `/repos/${owner}/${repo}/hooks/${hookId}/deliveries`,
      {},
    );
  }

  // ─── operationId: repos/redeliver-webhook-delivery ──────────────────────────
  // POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts
  // Response: 202 Accepted
  // Status codes: 202, 400, 422
  // Use case: replay missed deliveries during DevANT downtime

  async redeliverWebhookDelivery(
    owner: string,
    repo: string,
    hookId: number,
    deliveryId: number,
  ): Promise<void> {
    await this.client.request<void>({
      method: 'POST',
      path: `/repos/${owner}/${repo}/hooks/${hookId}/deliveries/${deliveryId}/attempts`,
    });
  }

  // ─── operationId: orgs/create-webhook ───────────────────────────────────────
  // POST /orgs/{org}/hooks
  // Request body: name, config, events, active
  // Response: org-hook schema
  // Status codes: 201, 404, 422
  // Use case: single org-level hook covers all repos — preferred for multi-repo

  async createOrgWebhook(
    org: string,
    config: {
      url: string;
      secret: string;
      contentType?: 'json' | 'form';
      events?: string[];
      active?: boolean;
    },
  ): Promise<GitHubHook> {
    const response = await this.client.request<GitHubHook>({
      method: 'POST',
      path: `/orgs/${org}/hooks`,
      body: {
        name: 'web',
        config: {
          url: config.url,
          content_type: config.contentType ?? 'json',
          secret: config.secret,
          insecure_ssl: '0',
        },
        events: config.events ?? [...DEVANT_WEBHOOK_EVENTS],
        active: config.active ?? true,
      },
    });
    return response.data;
  }

  // ─── operationId: orgs/list-webhooks ────────────────────────────────────────
  // GET /orgs/{org}/hooks
  // Params: per_page, page
  // Response: array of org-hook schema
  // Status codes: 200 (Link header), 404

  async listOrgWebhooks(org: string): Promise<GitHubHook[]> {
    return fetchAllPages<GitHubHook>(this.client, `/orgs/${org}/hooks`, {});
  }

  // ─── Ensure DevANT webhook is registered ─────────────────────────────────────
  // Idempotent: checks existing hooks before creating.
  // Returns existing hook ID if already registered, or creates new one.

  async ensureRepoWebhook(
    owner: string,
    repo: string,
    webhookUrl: string,
    secret: string,
  ): Promise<{ hookId: number; created: boolean }> {
    const existing = await this.listRepoWebhooks(owner, repo);
    const devantHook = existing.find(h => h.config.url === webhookUrl);

    if (devantHook) {
      // Ensure it's active and has all required events
      const missingEvents = DEVANT_WEBHOOK_EVENTS.filter(e => !devantHook.events.includes(e));
      if (!devantHook.active || missingEvents.length > 0) {
        await this.updateRepoWebhook(owner, repo, devantHook.id, {
          events: [...DEVANT_WEBHOOK_EVENTS],
          active: true,
        });
      }
      return { hookId: devantHook.id, created: false };
    }

    const hook = await this.createRepoWebhook(owner, repo, { url: webhookUrl, secret });
    return { hookId: hook.id, created: true };
  }
}
