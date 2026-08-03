import { TWENTY_DEFAULT_API_PATH } from './env-config.js';
import type {
  TwentyApiEnvelope,
  TwentyCompanyRecord,
  TwentyCreateCompanyRequest,
  TwentyCreateNoteRequest,
  TwentyCreateNoteTargetRequest,
  TwentyCreateOpportunityRequest,
  TwentyCreatePersonRequest,
  TwentyCreateTaskRequest,
  TwentyCreateTaskTargetRequest,
  TwentyCreateWebhookRequest,
  TwentyCustomRecord,
  TwentyNoteRecord,
  TwentyNoteTargetRecord,
  TwentyOpportunityRecord,
  TwentyPersonRecord,
  TwentyTaskRecord,
  TwentyTaskTargetRecord,
  TwentyUpdateCompanyRequest,
  TwentyUpdateOpportunityRequest,
  TwentyUpdateTaskRequest,
  TwentyWebhookRecord,
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

  async createOpportunity(body: TwentyCreateOpportunityRequest): Promise<TwentyOpportunityRecord> {
    const payload = await this.request<TwentyOpportunityRecord>('POST', '/opportunities', body);
    return this.unwrapRecord(payload, 'createOpportunity', 'opportunity');
  }

  /**
   * Patch opportunity fields (stage sync). NEEDS LIVE VERIFICATION against a
   * real Twenty instance for stage enum values configured per workspace.
   */
  async updateOpportunity(
    opportunityId: string,
    body: TwentyUpdateOpportunityRequest
  ): Promise<TwentyOpportunityRecord> {
    const payload = await this.request<TwentyOpportunityRecord>(
      'PATCH',
      `/opportunities/${opportunityId}`,
      body
    );
    return this.unwrapRecord(payload, 'updateOpportunity', 'opportunity');
  }

  async createTask(body: TwentyCreateTaskRequest): Promise<TwentyTaskRecord> {
    const payload = await this.request<TwentyTaskRecord>('POST', '/tasks', body);
    return this.unwrapRecord(payload, 'createTask', 'task');
  }

  async updateTask(taskId: string, body: TwentyUpdateTaskRequest): Promise<TwentyTaskRecord> {
    const payload = await this.request<TwentyTaskRecord>('PATCH', `/tasks/${taskId}`, body);
    return this.unwrapRecord(payload, 'updateTask', 'task');
  }

  async createTaskTarget(body: TwentyCreateTaskTargetRequest): Promise<TwentyTaskTargetRecord> {
    const payload = await this.request<TwentyTaskTargetRecord>('POST', '/taskTargets', body);
    return this.unwrapRecord(payload, 'createTaskTarget', 'taskTarget');
  }

  async createCompany(body: TwentyCreateCompanyRequest): Promise<TwentyCompanyRecord> {
    const payload = await this.request<TwentyCompanyRecord>('POST', '/companies', body);
    return this.unwrapRecord(payload, 'createCompany', 'company');
  }

  async updateCompany(
    companyId: string,
    body: TwentyUpdateCompanyRequest
  ): Promise<TwentyCompanyRecord> {
    const payload = await this.request<TwentyCompanyRecord>(
      'PATCH',
      `/companies/${companyId}`,
      body
    );
    return this.unwrapRecord(payload, 'updateCompany', 'company');
  }

  /**
   * NEEDS LIVE VERIFICATION against a real Twenty instance — same filter
   * convention as findPersonByEmail, not checked against a live API here.
   */
  async findCompanyByName(name: string): Promise<TwentyCompanyRecord | null> {
    const filter = `name[eq]:${encodeURIComponent(name)}`;
    const payload = await this.request<{ companies?: TwentyCompanyRecord[] }>(
      'GET',
      `/companies?filter=${filter}&limit=1`
    );

    const data = payload.data as { companies?: TwentyCompanyRecord[] } | undefined;
    const companies = data?.companies ?? [];
    return companies[0] ?? null;
  }

  async createNote(body: TwentyCreateNoteRequest): Promise<TwentyNoteRecord> {
    const payload = await this.request<TwentyNoteRecord>('POST', '/notes', body);
    return this.unwrapRecord(payload, 'createNote', 'note');
  }

  /** See TwentyCreateNoteTargetRequest's doc comment — needs live verification. */
  async createNoteTarget(body: TwentyCreateNoteTargetRequest): Promise<TwentyNoteTargetRecord> {
    const payload = await this.request<TwentyNoteTargetRecord>('POST', '/noteTargets', body);
    return this.unwrapRecord(payload, 'createNoteTarget', 'noteTarget');
  }

  /** See TwentyCreateWebhookRequest's doc comment — operation string format needs live verification. */
  async createWebhookSubscription(body: TwentyCreateWebhookRequest): Promise<TwentyWebhookRecord> {
    const payload = await this.request<TwentyWebhookRecord>('POST', '/webhooks', body);
    return this.unwrapRecord(payload, 'createWebhook', 'webhook');
  }

  async deleteWebhookSubscription(webhookId: string): Promise<void> {
    await this.request<TwentyWebhookRecord>('DELETE', `/webhooks/${webhookId}`);
  }

  async listWebhookSubscriptions(): Promise<TwentyWebhookRecord[]> {
    const payload = await this.request<{ webhooks?: TwentyWebhookRecord[] }>('GET', '/webhooks');
    const data = payload.data as { webhooks?: TwentyWebhookRecord[] } | undefined;
    return data?.webhooks ?? [];
  }

  /**
   * Generic CRUD for custom objects — Twenty's Core API auto-generates a
   * REST endpoint per object at its plural API name (e.g. a custom
   * "Invoice" object -> /rest/invoices), identical in shape to built-in
   * objects. Pass that plural name; the record shape is workspace-specific
   * so it isn't typed beyond `{ id, ...fields }`.
   */
  async createCustomRecord(
    pluralApiName: string,
    body: Record<string, unknown>
  ): Promise<TwentyCustomRecord> {
    const payload = await this.request<TwentyCustomRecord>('POST', `/${pluralApiName}`, body);
    return this.unwrapRecord(payload, `create${capitalize(pluralApiName)}`, pluralApiName);
  }

  async updateCustomRecord(
    pluralApiName: string,
    recordId: string,
    body: Record<string, unknown>
  ): Promise<TwentyCustomRecord> {
    const payload = await this.request<TwentyCustomRecord>(
      'PATCH',
      `/${pluralApiName}/${recordId}`,
      body
    );
    return this.unwrapRecord(payload, `update${capitalize(pluralApiName)}`, pluralApiName);
  }

  async listCustomRecords(pluralApiName: string, query?: string): Promise<TwentyCustomRecord[]> {
    const suffix = query ? `?${query}` : '';
    const payload = await this.request<Record<string, TwentyCustomRecord[]>>(
      'GET',
      `/${pluralApiName}${suffix}`
    );
    const data = payload.data as Record<string, TwentyCustomRecord[]> | undefined;
    return data?.[pluralApiName] ?? [];
  }
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}
