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
  Opportunity,
  SearchOpportunitiesFilter,
  Conversation,
  ConversationMessage,
  SearchConversationsFilter,
  SearchConversationsResponse,
  SendConversationMessageRequest,
  SendConversationMessageResponse,
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
  private lastRateLimitRemaining: number | null = null;
  private lastRateLimitReset: string | null = null;

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
    body?: unknown,
    options?: { apiVersion?: string; headers?: Record<string, string> }
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
          ...(options?.headers ?? {}),
        };
        if (this.usesLeadConnector) {
          headers.Version = options?.apiVersion ?? this.apiVersion;
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

        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        if (rateLimitRemaining !== null) {
          this.lastRateLimitRemaining = Number(rateLimitRemaining);
        }
        if (rateLimitReset !== null) {
          this.lastRateLimitReset = rateLimitReset;
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

  async searchConversations(
    filter: SearchConversationsFilter & { locationId?: string } = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    if (!this.usesLeadConnector) {
      return { conversations: [], total: 0 };
    }

    const locationId = filter.locationId ?? this.requireLocationId();
    const params = new URLSearchParams();
    params.append('locationId', locationId);
    if (filter.contactId) params.append('contactId', filter.contactId);
    if (filter.query) params.append('query', filter.query);
    if (filter.status) params.append('status', filter.status);
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.pageLimit) params.append('pageLimit', String(filter.pageLimit));

    const response = await this.request<SearchConversationsResponse>(
      'GET',
      `/conversations/search${params.toString() ? `?${params.toString()}` : ''}`,
      undefined,
      { apiVersion: '2023-02-21' }
    );

    const rows = response.conversations ?? response.data ?? [];
    return { conversations: rows, total: response.total ?? rows.length };
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    if (!this.usesLeadConnector) {
      throw new Error('getConversation requires LeadConnector API');
    }

    const locationId = this.requireLocationId();
    const response = await this.request<{ conversation?: Conversation; data?: Conversation }>(
      'GET',
      `/conversations/${conversationId}?locationId=${encodeURIComponent(locationId)}`,
      undefined,
      { apiVersion: '2023-02-21' }
    );

    const conversation = response.conversation ?? response.data;
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    return conversation;
  }

  async getConversationMessages(
    conversationId: string,
    options: { locationId?: string; limit?: number; page?: number } = {}
  ): Promise<ConversationMessage[]> {
    if (!this.usesLeadConnector) {
      return [];
    }

    const locationId = options.locationId ?? this.requireLocationId();
    const params = new URLSearchParams();
    params.append('locationId', locationId);
    if (options.limit) params.append('limit', String(options.limit));
    if (options.page) params.append('page', String(options.page));

    const response = await this.request<{
      messages?: ConversationMessage[];
      data?: ConversationMessage[];
    }>(
      'GET',
      `/conversations/${conversationId}/messages${params.toString() ? `?${params.toString()}` : ''}`,
      undefined,
      { apiVersion: '2023-02-21' }
    );

    return response.messages ?? response.data ?? [];
  }

  async findConversationByContactId(contactId: string): Promise<Conversation | null> {
    try {
      const { conversations } = await this.searchConversations({ contactId, limit: 1 });
      return conversations[0] ?? null;
    } catch {
      return null;
    }
  }

  async sendConversationMessage(
    data: SendConversationMessageRequest
  ): Promise<SendConversationMessageResponse> {
    if (!this.usesLeadConnector) {
      throw new Error('sendConversationMessage requires LeadConnector API');
    }

    const locationId = this.requireLocationId();
    const payload = {
      locationId,
      message: data.message,
      type:
        data.channel === 'email'
          ? 'Email'
          : data.channel === 'whatsapp'
            ? 'WhatsApp'
            : 'SMS',
      status: data.status ?? 'pending',
      ...(data.contactId && { contactId: data.contactId }),
      ...(data.conversationId && { conversationId: data.conversationId }),
      ...(data.replyToMessageId && { replyToMessageId: data.replyToMessageId }),
      ...(data.templateId && { templateId: data.templateId }),
      ...(data.variables && { variables: data.variables }),
    };

    const response = await this.request<{
      id?: string;
      status?: string;
      conversationId?: string;
      messageId?: string;
    }>('POST', '/conversations/messages', payload, { apiVersion: '2023-02-21' });

    return {
      id: response.id || response.messageId || '',
      status: response.status || 'pending',
      conversationId: response.conversationId ?? data.conversationId,
      messageId: response.messageId ?? response.id,
    };
  }

  async updateOpportunityStageForContact(
    contactId: string,
    pipelineStageId: string
  ): Promise<Opportunity> {
    if (!this.usesLeadConnector) {
      throw new Error('updateOpportunityStageForContact requires LeadConnector API');
    }

    const locationId = this.requireLocationId();
    const searchResponse = await this.request<{
      opportunities?: Opportunity[];
      data?: Opportunity[];
    }>('POST', '/opportunities/search', {
      locationId,
      contactId,
      page: 1,
      limit: 1,
    });

    const opportunities = searchResponse.opportunities ?? searchResponse.data ?? [];
    const opportunity = opportunities[0];
    if (!opportunity?.id) {
      throw new Error(`No GoHighLevel opportunity found for contact ${contactId}`);
    }

    const updateResponse = await this.request<{ opportunity?: Opportunity; data?: Opportunity }>(
      'PUT',
      `/opportunities/${opportunity.id}`,
      { pipelineStageId }
    );

    const updated = updateResponse.opportunity ?? updateResponse.data;
    if (!updated) {
      throw new Error(`Failed to update opportunity stage for contact ${contactId}`);
    }

    return updated;
  }

  getLastRateLimitInfo(): { remaining: number | null; resetAt: string | null } {
    return {
      remaining: this.lastRateLimitRemaining,
      resetAt: this.lastRateLimitReset,
    };
  }

  async listTags(): Promise<Array<{ id: string; name: string }>> {
    const locationId = this.requireLocationId();
    const path = `/tags/?locationId=${encodeURIComponent(locationId)}`;
    const response = await this.request<{
      tags?: Array<{ id: string; name: string }>;
      data?: Array<{ id: string; name: string }>;
    }>('GET', path);
    return response.tags ?? response.data ?? [];
  }

  async deleteContact(contactId: string): Promise<void> {
    const locationId = this.requireLocationId();
    const path = `/contacts/${contactId}?locationId=${encodeURIComponent(locationId)}`;
    await this.request<Record<string, unknown>>('DELETE', path);
  }

  async addContactTags(contactId: string, tags: string[]): Promise<void> {
    const locationId = this.requireLocationId();
    await this.request<Record<string, unknown>>('POST', `/contacts/${contactId}/tags`, {
      locationId,
      tags,
    });
  }

  async searchOpportunities(
    filter: SearchOpportunitiesFilter & { locationId?: string }
  ): Promise<{ opportunities: Opportunity[]; total: number }> {
    const locationId = filter.locationId ?? this.requireLocationId();
    const response = await this.request<{
      opportunities?: Opportunity[];
      data?: Opportunity[];
      total?: number;
    }>('POST', '/opportunities/search', {
      locationId,
      ...(filter.pipelineId && { pipelineId: filter.pipelineId }),
      ...(filter.pipelineStageId && { pipelineStageId: filter.pipelineStageId }),
      ...(filter.contactId && { contactId: filter.contactId }),
      page: filter.page ?? 1,
      limit: filter.limit ?? 100,
      ...(filter.pageLimit && { pageLimit: filter.pageLimit }),
    });

    const rows = response.opportunities ?? response.data ?? [];
    return { opportunities: rows, total: response.total ?? rows.length };
  }

  async sendMessage(data: SendMessageRequest): Promise<{ id: string; status: string }> {
    if (this.usesLeadConnector && (data.conversationId || data.replyToMessageId)) {
      const response = await this.sendConversationMessage({
        contactId: data.contactId,
        conversationId: data.conversationId,
        replyToMessageId: data.replyToMessageId,
        message: data.message,
        channel: data.channel,
        templateId: data.templateId,
        variables: data.variables,
      });

      return {
        id: response.id,
        status: response.status,
      };
    }

    if (this.usesLeadConnector && data.channel !== 'email') {
      const conversation = await this.findConversationByContactId(data.contactId);
      if (conversation?.id) {
        const response = await this.sendConversationMessage({
          contactId: data.contactId,
          conversationId: conversation.id,
          message: data.message,
          channel: data.channel,
          templateId: data.templateId,
          variables: data.variables,
        });

        return {
          id: response.id,
          status: response.status,
        };
      }
    }

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
