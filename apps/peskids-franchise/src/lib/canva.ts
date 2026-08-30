/**
 * Canva API Client
 *
 * Provides functions to interact with Canva's Connect API for:
 * - OAuth 2.0 authentication flow
 * - Listing and searching designs
 * - Getting design metadata and embed URLs
 *
 * Copied and adapted from workforce-portal project.
 */

// ============ Types ============

export interface CanvaDesign {
  id: string;
  title: string;
  owner: {
    user_id: string;
    display_name?: string;
  };
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  urls: {
    edit_url: string;
    view_url: string;
  };
  created_at: string;
  updated_at: string;
  page_count?: number;
}

export interface CanvaFolder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  thumbnail?: {
    url: string;
  };
}

export interface CanvaUser {
  user_id: string;
  display_name?: string;
}

export interface CanvaTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  scope: string;
}

export interface CanvaApiError {
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED' | 'API_ERROR' | 'NOT_CONNECTED';
  message: string;
}

// ============ OAuth Configuration ============

const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

const REQUIRED_SCOPES = ['design:meta:read', 'folder:read', 'profile:read'];

// ============ PKCE Utilities ============

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function getAuthorizationUrl(
  redirectUri: string,
  state: string,
  codeVerifier: string
): Promise<string> {
  const clientId = process.env.CANVA_CLIENT_ID;

  if (!clientId) {
    throw new Error('CANVA_CLIENT_ID environment variable is not set');
  }

  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: REQUIRED_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${CANVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<CanvaTokens> {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw {
      error: 'Configuration error',
      code: 'API_ERROR',
      message: 'Canva API credentials are not configured',
    } as CanvaApiError;
  }

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    let error: Record<string, string> = {};
    try { error = JSON.parse(responseText); } catch { /* not JSON */ }
    console.error('Canva token exchange error:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      redirectUri,
    });
    throw {
      error: 'Token exchange failed',
      code: 'API_ERROR',
      message: error.error_description || 'Failed to exchange authorization code',
    } as CanvaApiError;
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<CanvaTokens> {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw {
      error: 'Configuration error',
      code: 'API_ERROR',
      message: 'Canva API credentials are not configured',
    } as CanvaApiError;
  }

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Canva token refresh error:', error);
    throw {
      error: 'Token refresh failed',
      code: 'UNAUTHORIZED',
      message: 'Failed to refresh access token. Please reconnect Canva.',
    } as CanvaApiError;
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export function tokensNeedRefresh(expiresAt: number): boolean {
  const bufferMs = 5 * 60 * 1000;
  return Date.now() + bufferMs >= expiresAt;
}

// ============ API Functions ============

async function canvaFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${CANVA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw { error: 'Unauthorized', code: 'UNAUTHORIZED', message: 'Access token is invalid or expired' } as CanvaApiError;
    }
    if (response.status === 403) {
      throw { error: 'Forbidden', code: 'FORBIDDEN', message: 'You do not have permission to access this resource' } as CanvaApiError;
    }
    if (response.status === 404) {
      throw { error: 'Not found', code: 'NOT_FOUND', message: 'The requested resource was not found' } as CanvaApiError;
    }
    if (response.status === 429) {
      throw { error: 'Rate limited', code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' } as CanvaApiError;
    }

    const error = await response.json().catch(() => ({}));
    throw { error: 'API error', code: 'API_ERROR', message: error.message || 'An error occurred while communicating with Canva' } as CanvaApiError;
  }

  return response.json();
}

export async function getCurrentUser(accessToken: string): Promise<CanvaUser> {
  const data = await canvaFetch<{ profile: CanvaUser }>('/users/me', accessToken);
  return data.profile;
}

export async function listDesigns(
  accessToken: string,
  options: {
    query?: string;
    ownership?: 'any' | 'owned' | 'shared';
    sortBy?: 'relevance' | 'modified_descending' | 'modified_ascending' | 'title_ascending' | 'title_descending';
    limit?: number;
    continuation?: string;
  } = {}
): Promise<{ designs: CanvaDesign[]; continuation?: string }> {
  const params = new URLSearchParams();

  if (options.query) params.set('query', options.query);
  if (options.ownership) params.set('ownership', options.ownership);
  if (options.sortBy) params.set('sort_by', options.sortBy);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.continuation) params.set('continuation', options.continuation);

  const queryString = params.toString();
  const endpoint = `/designs${queryString ? `?${queryString}` : ''}`;

  const data = await canvaFetch<{ items: CanvaDesign[]; continuation?: string }>(endpoint, accessToken);

  return { designs: data.items || [], continuation: data.continuation };
}

export async function getDesign(accessToken: string, designId: string): Promise<CanvaDesign> {
  return canvaFetch<CanvaDesign>(`/designs/${designId}`, accessToken);
}

// ============ Embed Utilities ============

export function getEmbedUrl(viewUrl: string): string {
  try {
    const url = new URL(viewUrl);
    url.searchParams.set('embed', '');
    return url.toString();
  } catch {
    if (viewUrl.includes('?')) {
      return `${viewUrl}&embed`;
    }
    return `${viewUrl}?embed`;
  }
}

export function extractDesignId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/design\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
