import { TWENTY_DEFAULT_API_PATH } from './env-config.js';
import type {
  TwentyApiEnvelope,
  TwentyCreateOpportunityRequest,
  TwentyCreatePersonRequest,
  TwentyOpportunityRecord,
  TwentyPersonRecord,
} from './types.js';

export interface TwentyClientOptions {
  timeoutMs?: number;
}

export class TwentyClient {
  private apiKey: string;
  private baseUrl: string;
  private requestTimeout: number;

  constructor(apiKey: string, baseUrl: string, options: TwentyClientOptions = {}) {
    if (!apiKey.trim()) {
      throw new Error('Twenty API key is required');
    }
    if (!baseUrl.trim()) {
      throw new Error('Twenty API URL is required');
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeout = options.timeoutMs ?? 30000;
  }

  private restUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (this.baseUrl.endsWith(TWENTY_DEFAULT_API_PATH)) {
      return `${this.baseUrl}${normalizedPath.replace(/^\/rest/, '')}`;
    }
    return `${this.baseUrl}${TWENTY_DEFAULT_API_PATH}${normalizedPath.replace(/^\/rest/, '')}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<TwentyApiEnvelope<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(this.restUrl(path), {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      let payload: TwentyApiEnvelope<T> = {};
      try {
        payload = (await response.json()) as TwentyApiEnvelope<T>;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const message =
          payload.errors?.[0]?.message ??
          `Twenty API ${method} ${path} failed (${response.status})`;
        throw new Error(message);
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async createPerson(body: TwentyCreatePersonRequest): Promise<TwentyPersonRecord> {
    const payload = await this.request<TwentyPersonRecord>('POST', '/people', body);
    if (!payload.data?.id) {
      throw new Error('Twenty API returned person without id');
    }
    return payload.data;
  }

  async createOpportunity(
    body: TwentyCreateOpportunityRequest
  ): Promise<TwentyOpportunityRecord> {
    const payload = await this.request<TwentyOpportunityRecord>(
      'POST',
      '/opportunities',
      body
    );
    if (!payload.data?.id) {
      throw new Error('Twenty API returned opportunity without id');
    }
    return payload.data;
  }
}
