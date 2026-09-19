/**
 * DevANT GitHub Webhook Handler
 *
 * Handles incoming GitHub webhook payloads with:
 * - HMAC-SHA256 signature verification (X-Hub-Signature-256)
 * - Event type routing (X-GitHub-Event)
 * - Delivery ID deduplication (X-GitHub-Delivery)
 * - Replay protection via delivery ID store
 *
 * Webhook events relevant to DevANT (from GitHub OpenAPI spec):
 *   push                → commit intelligence, lead time
 *   pull_request        → PR intelligence, cycle time
 *   pull_request_review → review latency
 *   issues              → issue intelligence, sprint tracking
 *   deployment          → DORA deployment frequency
 *   deployment_status   → DORA MTTR, change failure rate
 *   release             → release intelligence
 *   workflow_run        → CI/CD intelligence, DORA
 *   check_run           → CI status
 *   create/delete       → branch/tag lifecycle
 *   code_scanning_alert → security intelligence
 *   secret_scanning_alert → security intelligence
 *   repository          → repo metadata changes
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ─── Event Types ──────────────────────────────────────────────────────────────

export type GitHubWebhookEvent =
  | 'push'
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'issues'
  | 'issue_comment'
  | 'deployment'
  | 'deployment_status'
  | 'release'
  | 'workflow_run'
  | 'check_run'
  | 'check_suite'
  | 'create'
  | 'delete'
  | 'code_scanning_alert'
  | 'secret_scanning_alert'
  | 'repository'
  | 'member'
  | 'organization'
  | 'ping';

export interface WebhookHeaders {
  'x-hub-signature-256': string;
  'x-github-event': string;
  'x-github-delivery': string;
  'content-type': string;
}

export interface WebhookHandlerConfig {
  /** Webhook secret configured in GitHub — used for HMAC verification */
  secret: string;
  /** Delivery ID store for deduplication (inject your own Redis/DB impl) */
  deliveryStore: DeliveryStore;
}

export interface DeliveryStore {
  has(deliveryId: string): Promise<boolean>;
  add(deliveryId: string, ttlSeconds?: number): Promise<void>;
}

export interface WebhookProcessResult {
  event: GitHubWebhookEvent;
  deliveryId: string;
  payload: unknown;
  duplicate: boolean;
}

export class GitHubWebhookHandler {
  private readonly secret: string;
  private readonly deliveryStore: DeliveryStore;

  constructor(config: WebhookHandlerConfig) {
    this.secret = config.secret;
    this.deliveryStore = config.deliveryStore;
  }

  /**
   * Process an incoming webhook request.
   * Returns null if signature is invalid (reject with 401).
   * Returns result with duplicate=true if delivery ID was already processed.
   */
  async process(
    rawBody: Buffer,
    headers: WebhookHeaders,
  ): Promise<WebhookProcessResult | null> {
    // 1. Verify HMAC-SHA256 signature
    if (!this._verifySignature(rawBody, headers['x-hub-signature-256'])) {
      return null;
    }

    const event = headers['x-github-event'] as GitHubWebhookEvent;
    const deliveryId = headers['x-github-delivery'];

    // 2. Deduplication — GitHub retries failed deliveries
    const isDuplicate = await this.deliveryStore.has(deliveryId);
    if (!isDuplicate) {
      // Store with 24h TTL — covers GitHub's retry window
      await this.deliveryStore.add(deliveryId, 86_400);
    }

    // 3. Parse payload
    const payload = JSON.parse(rawBody.toString('utf-8'));

    return {
      event,
      deliveryId,
      payload,
      duplicate: isDuplicate,
    };
  }

  /**
   * Verify X-Hub-Signature-256 header using timing-safe comparison.
   * GitHub signs with HMAC-SHA256 using the webhook secret.
   */
  private _verifySignature(body: Buffer, signatureHeader: string): boolean {
    if (!signatureHeader?.startsWith('sha256=')) return false;
    const expected = createHmac('sha256', this.secret).update(body).digest('hex');
    const expectedBuf = Buffer.from(`sha256=${expected}`, 'utf-8');
    const receivedBuf = Buffer.from(signatureHeader, 'utf-8');
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  }
}
