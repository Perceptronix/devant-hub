/**
 * DevANT GitHub App Authentication
 *
 * Manages GitHub App installation token lifecycle.
 * Installation tokens expire after 1 hour — auto-rotate before expiry.
 *
 * GitHub App auth flow:
 * 1. Sign JWT with App private key (RS256, 10 min expiry)
 * 2. POST /app/installations/{installation_id}/access_tokens → installation token
 * 3. Use installation token as Bearer for all API calls
 * 4. Rotate before expiry (rotate at 55 min to be safe)
 *
 * Endpoints used:
 *   POST /app/installations/{installation_id}/access_tokens
 *     operationId: apps/create-installation-access-token
 *     enabledForGitHubApps: false (uses JWT, not installation token)
 *   GET /app/installations
 *     operationId: apps/list-installations
 *   GET /installation/repositories
 *     operationId: apps/list-repos-accessible-to-installation
 */

import { createSign } from 'crypto';

export interface GitHubAppConfig {
  /** GitHub App ID */
  appId: number;
  /** PEM-encoded private key */
  privateKey: string;
  /** Installation ID for the target org/user */
  installationId: number;
}

export interface InstallationToken {
  token: string;
  expiresAt: Date;
  permissions: Record<string, string>;
  repositorySelection: 'all' | 'selected';
}

export class GitHubAppAuth {
  private readonly config: GitHubAppConfig;
  private cachedToken: InstallationToken | null = null;
  /** Rotate 5 minutes before expiry */
  private readonly ROTATION_BUFFER_MS = 5 * 60 * 1000;

  constructor(config: GitHubAppConfig) {
    this.config = config;
  }

  /** Get a valid installation token, rotating if needed */
  async getToken(): Promise<string> {
    if (this.cachedToken && !this.isExpired(this.cachedToken)) {
      return this.cachedToken.token;
    }
    this.cachedToken = await this.createInstallationToken();
    return this.cachedToken.token;
  }

  private isExpired(token: InstallationToken): boolean {
    return Date.now() >= token.expiresAt.getTime() - this.ROTATION_BUFFER_MS;
  }

  /**
   * POST /app/installations/{installation_id}/access_tokens
   * operationId: apps/create-installation-access-token
   * Auth: JWT (not installation token)
   * Response: { token, expires_at, permissions, repository_selection }
   */
  private async createInstallationToken(): Promise<InstallationToken> {
    const jwt = this.signJWT();

    const response = await fetch(
      `https://api.github.com/app/installations/${this.config.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'DevANT/1.0',
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to create installation token: ${response.status} ${body}`);
    }

    const data = await response.json() as {
      token: string;
      expires_at: string;
      permissions: Record<string, string>;
      repository_selection: 'all' | 'selected';
    };

    return {
      token: data.token,
      expiresAt: new Date(data.expires_at),
      permissions: data.permissions,
      repositorySelection: data.repository_selection,
    };
  }

  /**
   * Sign a GitHub App JWT.
   * Algorithm: RS256
   * Claims: iss (app ID), iat (now - 60s), exp (now + 10min)
   * Max expiry: 10 minutes per GitHub spec.
   */
  private signJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iat: now - 60,
      exp: now + 600,
      iss: String(this.config.appId),
    })).toString('base64url');

    const data = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(data);
    const signature = sign.sign(this.config.privateKey, 'base64url');

    return `${data}.${signature}`;
  }

  /** List all installations for this GitHub App */
  async listInstallations(): Promise<Array<{ id: number; account: { login: string; type: string } }>> {
    const jwt = this.signJWT();
    const response = await fetch('https://api.github.com/app/installations?per_page=100', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'DevANT/1.0',
      },
    });
    if (!response.ok) throw new Error(`Failed to list installations: ${response.status}`);
    return response.json();
  }
}
