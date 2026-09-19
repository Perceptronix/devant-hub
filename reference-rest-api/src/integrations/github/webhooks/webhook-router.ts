/**
 * DevANT Webhook Event Router
 *
 * Routes verified GitHub webhook payloads to DevANT intelligence pipelines.
 * Each handler receives the typed payload and routes to the correct service.
 *
 * Design: webhook-first ingestion — REST polling is fallback/backfill only.
 */

import { GitHubWebhookEvent } from './webhook-handler';

export type WebhookEventHandler<T = unknown> = (payload: T, deliveryId: string) => Promise<void>;

export class GitHubWebhookRouter {
  private readonly handlers = new Map<GitHubWebhookEvent, WebhookEventHandler[]>();

  on<T>(event: GitHubWebhookEvent, handler: WebhookEventHandler<T>): this {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler as WebhookEventHandler);
    this.handlers.set(event, existing);
    return this;
  }

  async dispatch(event: GitHubWebhookEvent, payload: unknown, deliveryId: string): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
    // Run all handlers concurrently — each pipeline is independent
    await Promise.allSettled(handlers.map(h => h(payload, deliveryId)));
  }
}

// ─── DevANT Webhook Event Payload Types ──────────────────────────────────────
// Minimal typed interfaces matching GitHub OpenAPI webhook schemas.
// Full schemas are in the dereferenced spec files.

export interface PushEventPayload {
  ref: string;
  before: string;
  after: string;
  repository: { id: number; full_name: string; default_branch: string };
  pusher: { name: string; email: string };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: { name: string; email: string; username?: string };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: { id: string; timestamp: string } | null;
}

export interface PullRequestEventPayload {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize' | 'review_requested' |
          'review_request_removed' | 'labeled' | 'unlabeled' | 'assigned' | 'unassigned' |
          'ready_for_review' | 'converted_to_draft' | 'edited' | 'auto_merge_enabled' |
          'auto_merge_disabled' | 'locked' | 'unlocked';
  number: number;
  pull_request: {
    id: number;
    number: number;
    state: 'open' | 'closed';
    title: string;
    merged: boolean;
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    additions: number;
    deletions: number;
    changed_files: number;
    commits: number;
    head: { sha: string; ref: string };
    base: { sha: string; ref: string };
    user: { login: string; id: number };
    requested_reviewers: Array<{ login: string; id: number }>;
    draft: boolean;
  };
  repository: { id: number; full_name: string };
  sender: { login: string; id: number };
}

export interface DeploymentEventPayload {
  action: 'created';
  deployment: {
    id: number;
    sha: string;
    ref: string;
    task: string;
    environment: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    creator: { login: string; id: number };
  };
  repository: { id: number; full_name: string };
}

export interface DeploymentStatusEventPayload {
  action: 'created';
  deployment_status: {
    id: number;
    state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success' | 'waiting';
    description: string | null;
    environment: string;
    created_at: string;
    updated_at: string;
    deployment_url: string;
    target_url: string | null;
  };
  deployment: { id: number; sha: string; ref: string; environment: string };
  repository: { id: number; full_name: string };
}

export interface WorkflowRunEventPayload {
  action: 'requested' | 'in_progress' | 'completed';
  workflow_run: {
    id: number;
    name: string;
    head_sha: string;
    head_branch: string;
    run_number: number;
    run_attempt: number;
    event: string;
    status: string;
    conclusion: string | null;
    workflow_id: number;
    created_at: string;
    updated_at: string;
    run_started_at: string;
    pull_requests: Array<{ id: number; number: number }>;
  };
  repository: { id: number; full_name: string };
}

export interface ReleaseEventPayload {
  action: 'published' | 'unpublished' | 'created' | 'edited' | 'deleted' |
          'prereleased' | 'released';
  release: {
    id: number;
    tag_name: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string | null;
    author: { login: string; id: number };
    target_commitish: string;
  };
  repository: { id: number; full_name: string };
}

export interface IssuesEventPayload {
  action: 'opened' | 'edited' | 'deleted' | 'transferred' | 'pinned' | 'unpinned' |
          'closed' | 'reopened' | 'assigned' | 'unassigned' | 'labeled' | 'unlabeled' |
          'locked' | 'unlocked' | 'milestoned' | 'demilestoned';
  issue: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    user: { login: string; id: number };
    assignees: Array<{ login: string; id: number }>;
    labels: Array<{ name: string; color: string }>;
    milestone: { id: number; title: string; due_on: string | null } | null;
    pull_request?: { url: string }; // present if issue is a PR
  };
  repository: { id: number; full_name: string };
}
