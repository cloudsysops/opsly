import { TWENTY_DEFAULT_API_PATH } from './env-config.js';
import type {
  TwentyApiEnvelope,
  TwentyCreateOpportunityRequest,
  TwentyCreatePersonRequest,
  TwentyCreateTaskRequest,
  TwentyCreateTaskTargetRequest,
  TwentyOpportunityRecord,
  TwentyPersonRecord,
  TwentyTaskRecord,
  TwentyTaskTargetRecord,
  TwentyUpdateTaskRequest,
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
          payload.messages?.[0] ??
          `Twenty API ${method} ${path} failed (${response.status})`;
        throw new Error(message);
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  private unwrapRecord<T extends { id?: string }>(
    payload: TwentyApiEnvelope<T>,
    operation: string,
    label: string
  ): T {
    if (payload.data && 'id' in payload.data && payload.data.id) {
      return payload.data as T;
    }

    if (payload.data && typeof payload.data === 'object') {
      const nested = (payload.data as Record<string, T | undefined>)[operation];
      if (nested?.id) {
        return nested;
      }
    }

    throw new Error(`Twenty API returned ${label} without id`);
  }

  async createPerson(body: TwentyCreatePersonRequest): Promise<TwentyPersonRecord> {
    const payload = await this.request<TwentyPersonRecord>('POST', '/people', body);
    return this.unwrapRecord(payload, 'createPerson', 'person');
  }

  /**
   * NEEDS LIVE VERIFICATION against a real Twenty instance — the filter
   * query syntax (`filter=emails.primaryEmail[eq]:<value>`) matches Twenty's
   * documented REST filtering convention but wasn't checked against a live
   * API from here.
   */
  async findPersonByEmail(email: string): Promise<TwentyPersonRecord | null> {
    const filter = `emails.primaryEmail[eq]:${encodeURIComponent(email)}`;
    const payload = await this.request<{ people?: TwentyPersonRecord[] }>(
      'GET',
      `/people?filter=${filter}&limit=1`
    );

    const data = payload.data as { people?: TwentyPersonRecord[] } | undefined;
    const people = data?.people ?? [];
    return people[0] ?? null;
  }

  async createOpportunity(
    body: TwentyCreateOpportunityRequest
  ): Promise<TwentyOpportunityRecord> {
    const payload = await this.request<TwentyOpportunityRecord>(
      'POST',
      '/opportunities',
      body
    );
    return this.unwrapRecord(payload, 'createOpportunity', 'opportunity');
  }

  async createTask(body: TwentyCreateTaskRequest): Promise<TwentyTaskRecord> {
    const payload = await this.request<TwentyTaskRecord>('POST', '/tasks', body);
    return this.unwrapRecord(payload, 'createTask', 'task');
  }

  async updateTask(
    taskId: string,
    body: TwentyUpdateTaskRequest
  ): Promise<TwentyTaskRecord> {
    const payload = await this.request<TwentyTaskRecord>(
      'PATCH',
      `/tasks/${taskId}`,
      body
    );
    return this.unwrapRecord(payload, 'updateTask', 'task');
  }

  async createTaskTarget(
    body: TwentyCreateTaskTargetRequest
  ): Promise<TwentyTaskTargetRecord> {
    const payload = await this.request<TwentyTaskTargetRecord>(
      'POST',
      '/taskTargets',
      body
    );
    return this.unwrapRecord(payload, 'createTaskTarget', 'taskTarget');
  }
}
