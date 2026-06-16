import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  Task,
  CreateTaskRequest,
  Appointment,
  SendMessageRequest,
  ListContactsFilter,
  ListResponse,
} from './types.js';

export interface GoHighLevelClientOptions {
  timeoutMs?: number;
  locationId?: string;
  apiVersion?: string;
}

export class GoHighLevelClient {
  private apiKey: string;
  private baseUrl: string;
  private requestTimeout: number;
  private locationId: string;
  private apiVersion: string;
  private usesLeadConnector: boolean;

  constructor(
    apiKey: string,
    baseUrl = 'https://services.leadconnectorhq.com',
    options: GoHighLevelClientOptions = {}
  ) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('GoHighLevel API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeout = options.timeoutMs ?? 30000;
    this.locationId = options.locationId?.trim() ?? '';
    this.apiVersion = options.apiVersion?.trim() ?? '2021-07-28';
    this.usesLeadConnector = this.baseUrl.includes('leadconnectorhq.com');
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseRetryAfter(retryAfter: string | null): number | null {
    if (!retryAfter) {
      return null;
    }

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isNaN(retryAt)) {
      return null;
    }

    return Math.max(0, retryAt - Date.now());
  }

  private getRateLimitBackoffDelay(attempt: number): number {
    const baseDelayMs = 1000;
    const maxDelayMs = 30000;
    const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
    const jitter = Math.floor(Math.random() * 250);

    return Math.min(maxDelayMs, exponentialDelay + jitter);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const maxRateLimitRetries = 3;

    for (let attempt = 0; attempt <= maxRateLimitRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        };
        if (this.usesLeadConnector) {
          headers.Version = this.apiVersion;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `GoHighLevel API error: ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText) as Record<string, unknown>;
            errorMessage = (errorJson.message as string) || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }

          if (response.status === 429 && attempt < maxRateLimitRetries) {
            const retryAfterMs = this.parseRetryAfter(response.headers.get('Retry-After'));
            const delayMs = retryAfterMs ?? this.getRateLimitBackoffDelay(attempt);
            await this.sleep(delayMs);
            continue;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json() as T;
        return data;
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            throw new Error(`GoHighLevel request timeout after ${this.requestTimeout}ms`);
          }
          throw err;
        }
        throw new Error(`GoHighLevel API request failed: ${String(err)}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new Error('GoHighLevel API request failed after rate-limit retries');
  }

  private requireLocationId(): string {
    if (!this.locationId) {
      throw new Error('GOHIGHLEVEL_LOCATION_ID is required for LeadConnector API calls');
    }
    return this.locationId;
  }

  async getContacts(filter?: ListContactsFilter): Promise<ListResponse<Contact>> {
    const params = new URLSearchParams();
    if (this.usesLeadConnector) {
      params.append('locationId', this.requireLocationId());
    }
    if (filter?.status) {
      params.append('status', filter.status);
    }
    if (filter?.source) {
      params.append('source', filter.source);
    }
    if (filter?.search) {
      params.append('query', filter.search);
    }
    if (filter?.limit) {
      params.append('limit', String(filter.limit));
    }
    if (filter?.offset) {
      params.append('offset', String(filter.offset));
    }

    const path = this.usesLeadConnector
      ? `/contacts/${params.toString() ? `?${params.toString()}` : ''}`
      : `/v1/contacts${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await this.request<{
      data?: Contact[];
      contacts?: Contact[];
      total?: number;
      limit?: number;
      offset?: number;
    }>('GET', path);

    const rows = response.contacts ?? response.data ?? [];

    return {
      data: rows,
      total: response.total ?? rows.length,
      limit: response.limit,
      offset: response.offset,
    };
  }

  async getContact(contactId: string): Promise<Contact> {
    const path = this.usesLeadConnector
      ? `/contacts/${contactId}?locationId=${encodeURIComponent(this.requireLocationId())}`
      : `/v1/contacts/${contactId}`;
    const response = await this.request<{ data?: Contact; contact?: Contact }>('GET', path);
    const contact = response.contact ?? response.data;
    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }
    return contact;
  }

  async createContact(data: CreateContactRequest): Promise<Contact> {
    const payload = this.usesLeadConnector
      ? { ...data, locationId: this.requireLocationId() }
      : data;
    const path = this.usesLeadConnector ? '/contacts/' : '/v1/contacts';
    const response = await this.request<{ data?: Contact; contact?: Contact }>('POST', path, payload);
    const contact = response.contact ?? response.data;
    if (!contact) {
      throw new Error('Failed to create contact');
    }
    return contact;
  }

  async updateContact(contactId: string, data: UpdateContactRequest): Promise<Contact> {
    const path = this.usesLeadConnector
      ? `/contacts/${contactId}?locationId=${encodeURIComponent(this.requireLocationId())}`
      : `/v1/contacts/${contactId}`;
    const response = await this.request<{ data?: Contact; contact?: Contact }>('PUT', path, data);
    const contact = response.contact ?? response.data;
    if (!contact) {
      throw new Error(`Failed to update contact ${contactId}`);
    }
    return contact;
  }

  async getTasks(contactId?: string): Promise<Task[]> {
    const path = contactId ? `/v1/tasks?contactId=${contactId}` : '/v1/tasks';
    const response = await this.request<{ data?: Task[] }>('GET', path);
    return response.data || [];
  }

  async createTask(data: CreateTaskRequest): Promise<Task> {
    const response = await this.request<{ data?: Task }>('POST', '/v1/tasks', data);
    if (!response.data) {
      throw new Error('Failed to create task');
    }
    return response.data;
  }

  async updateTask(taskId: string, data: Partial<CreateTaskRequest>): Promise<Task> {
    const response = await this.request<{ data?: Task }>('PUT', `/v1/tasks/${taskId}`, data);
    if (!response.data) {
      throw new Error(`Failed to update task ${taskId}`);
    }
    return response.data;
  }

  async getAppointments(contactId?: string): Promise<Appointment[]> {
    const path = contactId ? `/v1/appointments?contactId=${contactId}` : '/v1/appointments';
    const response = await this.request<{ data?: Appointment[] }>('GET', path);
    return response.data || [];
  }

  async sendMessage(data: SendMessageRequest): Promise<{ id: string; status: string }> {
    const endpoint = data.channel === 'email' ? '/v1/emails/send' : '/v1/messages/send';
    const payload = {
      contactId: data.contactId,
      message: data.message,
      ...(data.templateId && { templateId: data.templateId }),
      ...(data.variables && { variables: data.variables }),
    };

    const response = await this.request<{ id?: string; status?: string }>(
      'POST',
      endpoint,
      payload
    );

    return {
      id: response.id || '',
      status: response.status || 'sent',
    };
  }
}
