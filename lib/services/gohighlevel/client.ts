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
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  CustomField,
  CreateCustomFieldRequest,
  CustomFieldModel,
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  SearchOpportunitiesFilter,
  Calendar,
  CreateCalendarRequest,
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
  private locationAccessToken: string | null = null;

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

  private async getBearerToken(): Promise<string> {
    return this.locationAccessToken ?? this.apiKey;
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

  private async requestWithToken<T>(
    authToken: string,
    method: string,
    path: string,
    body?: unknown,
    contentType = 'application/json',
    allowLocationTokenRefresh = true
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const maxRateLimitRetries = 3;

    for (let attempt = 0; attempt <= maxRateLimitRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const headers: Record<string, string> = {
          'Content-Type': contentType,
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        };
        if (this.usesLeadConnector) {
          headers.Version = this.apiVersion;
        }

        const response = await fetch(url, {
          method,
          headers,
          body:
            body === undefined
              ? undefined
              : typeof body === 'string'
                ? body
                : JSON.stringify(body),
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

          if (
            allowLocationTokenRefresh &&
            this.usesLeadConnector &&
            response.status >= 401 &&
            response.status < 404 &&
            authToken === this.apiKey
          ) {
            try {
              const locationAccessToken = await this.deriveLocationAccessToken();
              return this.requestWithToken<T>(
                locationAccessToken,
                method,
                path,
                body,
                contentType,
                false
              );
            } catch {
              // Fall through to the original auth error.
            }
          }

          throw new Error(errorMessage);
        }

        const responseText = await response.text();
        if (!responseText) {
          return {} as T;
        }

        try {
          return JSON.parse(responseText) as T;
        } catch {
          return {} as T;
        }
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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    return this.requestWithToken<T>(await this.getBearerToken(), method, path, body);
  }

  private async deriveLocationAccessToken(): Promise<string> {
    if (this.locationAccessToken) {
      return this.locationAccessToken;
    }

    const locationId = this.requireLocationId();
    const locationResponse = await this.requestWithToken<{
      location?: { companyId?: string };
      data?: { companyId?: string };
      companyId?: string;
    }>(this.apiKey, 'GET', `/locations/${locationId}`, undefined, 'application/json', false);

    const companyId =
      locationResponse.location?.companyId ?? locationResponse.data?.companyId ?? locationResponse.companyId;

    if (!companyId) {
      throw new Error(`Unable to resolve companyId for location ${locationId}`);
    }

    const exchangeResponse = await this.requestWithToken<{
      access_token?: string;
      accessToken?: string;
    }>(
      this.apiKey,
      'POST',
      '/oauth/locationToken',
      new URLSearchParams({ companyId, locationId }).toString(),
      'application/x-www-form-urlencoded',
      false
    );

    const accessToken = exchangeResponse.access_token ?? exchangeResponse.accessToken;
    if (!accessToken) {
      throw new Error(`Failed to derive location access token for ${locationId}`);
    }

    this.locationAccessToken = accessToken;
    return accessToken;
  }

  private requireLocationId(): string {
    if (!this.locationId) {
      throw new Error('GOHIGHLEVEL_LOCATION_ID is required for LeadConnector API calls');
    }
    return this.locationId;
  }

  private normalizeListResponse<T>(
    response: { data?: T[]; contacts?: T[]; total?: number; count?: number; limit?: number; offset?: number },
    fallback: T[] = []
  ): ListResponse<T> {
    const rows = response.contacts ?? response.data ?? fallback;
    return {
      data: rows,
      total: response.total ?? response.count ?? rows.length,
      limit: response.limit,
      offset: response.offset,
    };
  }

  private applyLocationId<T extends Record<string, unknown>>(data: T): T & { locationId?: string } {
    if (!this.usesLeadConnector) {
      return data;
    }
    return {
      ...data,
      locationId: this.requireLocationId(),
    };
  }

  async searchContacts(filter: Record<string, unknown> = {}): Promise<ListResponse<Contact>> {
    const path = this.usesLeadConnector ? '/contacts/search' : '/v1/contacts/search';
    const response = await this.request<{
      data?: Contact[];
      contacts?: Contact[];
      count?: number;
      total?: number;
      limit?: number;
      offset?: number;
    }>('POST', path, filter);

    return this.normalizeListResponse<Contact>(response);
  }

  async getContacts(filter?: ListContactsFilter): Promise<ListResponse<Contact>> {
    const searchFilter: Record<string, unknown> = {};
    if (filter?.status) {
      searchFilter.status = filter.status;
    }
    if (filter?.source) {
      searchFilter.source = filter.source;
    }
    if (filter?.search) {
      searchFilter.query = filter.search;
    }
    if (filter?.limit !== undefined) {
      searchFilter.limit = filter.limit;
    }
    if (filter?.offset !== undefined) {
      searchFilter.offset = filter.offset;
    }
    return this.searchContacts(searchFilter);
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

  async listTags(): Promise<Tag[]> {
    const path = this.usesLeadConnector
      ? `/locations/${encodeURIComponent(this.requireLocationId())}/tags`
      : `/v1/tags`;
    const response = await this.request<{ tags?: Tag[]; data?: Tag[] }>('GET', path);
    return response.tags ?? response.data ?? [];
  }

  async createTag(data: CreateTagRequest): Promise<Tag> {
    const path = this.usesLeadConnector
      ? `/locations/${encodeURIComponent(this.requireLocationId())}/tags`
      : '/v1/tags';
    const response = await this.request<{ tag?: Tag; data?: Tag }>('POST', path, data);
    const tag = response.tag ?? response.data;
    if (!tag) {
      throw new Error('Failed to create tag');
    }
    return tag;
  }

  async updateTag(tagId: string, data: UpdateTagRequest): Promise<Tag> {
    const path = this.usesLeadConnector
      ? `/locations/${encodeURIComponent(this.requireLocationId())}/tags/${tagId}`
      : `/v1/tags/${tagId}`;
    const response = await this.request<{ tag?: Tag; data?: Tag }>('PUT', path, data);
    const tag = response.tag ?? response.data;
    if (!tag) {
      throw new Error(`Failed to update tag ${tagId}`);
    }
    return tag;
  }

  async deleteTag(tagId: string): Promise<{ success: boolean }> {
    const path = this.usesLeadConnector
      ? `/locations/${encodeURIComponent(this.requireLocationId())}/tags/${tagId}`
      : `/v1/tags/${tagId}`;
    const response = await this.request<{ succeded?: boolean; succeeded?: boolean; success?: boolean }>(
      'DELETE',
      path
    );
    return {
      success: response.success ?? response.succeded ?? response.succeeded ?? true,
    };
  }

  async listCustomFields(model?: CustomFieldModel): Promise<CustomField[]> {
    const params = new URLSearchParams();
    if (model && model !== 'all') {
      params.append('model', model);
    }
    const path = this.usesLeadConnector
      ? `/locations/${encodeURIComponent(this.requireLocationId())}/customFields${params.toString() ? `?${params.toString()}` : ''}`
      : `/v1/customFields${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<{ customFields?: CustomField[]; data?: CustomField[] }>('GET', path);
    return response.customFields ?? response.data ?? [];
  }

  async createCustomField(data: CreateCustomFieldRequest): Promise<CustomField> {
    const path = this.usesLeadConnector
      ? `/locations/${encodeURIComponent(this.requireLocationId())}/customFields`
      : '/v1/customFields';
    const response = await this.request<{ customField?: CustomField; customFields?: CustomField[]; data?: CustomField }>(
      'POST',
      path,
      data
    );
    const customField = response.customField ?? response.data ?? response.customFields?.[0];
    if (!customField) {
      throw new Error('Failed to create custom field');
    }
    return customField;
  }

  async getOpportunity(opportunityId: string): Promise<Opportunity> {
    const path = this.usesLeadConnector
      ? `/opportunities/${opportunityId}`
      : `/v1/opportunities/${opportunityId}`;
    const response = await this.request<{ opportunity?: Opportunity; data?: Opportunity }>('GET', path);
    const opportunity = response.opportunity ?? response.data;
    if (!opportunity) {
      throw new Error(`Opportunity ${opportunityId} not found`);
    }
    return opportunity;
  }

  async createOpportunity(data: CreateOpportunityRequest): Promise<Opportunity> {
    const path = this.usesLeadConnector ? '/opportunities/' : '/v1/opportunities';
    const payload = this.usesLeadConnector
      ? this.applyLocationId({
          ...data,
          customFields: data.customFields,
        })
      : data;
    const response = await this.request<{ opportunity?: Opportunity; data?: Opportunity }>('POST', path, payload);
    const opportunity = response.opportunity ?? response.data;
    if (!opportunity) {
      throw new Error('Failed to create opportunity');
    }
    return opportunity;
  }

  async updateOpportunity(opportunityId: string, data: UpdateOpportunityRequest): Promise<Opportunity> {
    const path = this.usesLeadConnector
      ? `/opportunities/${opportunityId}`
      : `/v1/opportunities/${opportunityId}`;
    const payload = this.usesLeadConnector ? this.applyLocationId({ ...data }) : data;
    const response = await this.request<{ opportunity?: Opportunity; data?: Opportunity }>('PUT', path, payload);
    const opportunity = response.opportunity ?? response.data;
    if (!opportunity) {
      throw new Error(`Failed to update opportunity ${opportunityId}`);
    }
    return opportunity;
  }

  async deleteOpportunity(opportunityId: string): Promise<{ success: boolean }> {
    const path = this.usesLeadConnector
      ? `/opportunities/${opportunityId}`
      : `/v1/opportunities/${opportunityId}`;
    const response = await this.request<{ succeded?: boolean; succeeded?: boolean; success?: boolean }>(
      'DELETE',
      path
    );
    return {
      success: response.success ?? response.succeded ?? response.succeeded ?? true,
    };
  }

  async searchOpportunities(filter: SearchOpportunitiesFilter = {}): Promise<ListResponse<Opportunity>> {
    const path = this.usesLeadConnector ? '/opportunities/search' : '/v1/opportunities/search';
    const payload = this.usesLeadConnector ? this.applyLocationId({ ...filter }) : filter;
    const response = await this.request<{
      opportunities?: Opportunity[];
      data?: Opportunity[];
      total?: number;
      count?: number;
      limit?: number;
      offset?: number;
    }>('POST', path, payload);
    return this.normalizeListResponse<Opportunity>(
      {
        data: response.data ?? response.opportunities,
        total: response.total,
        count: response.count,
        limit: response.limit,
        offset: response.offset,
      },
      []
    );
  }

  async getCalendars(
    filter?: Record<string, unknown> & { groupId?: string; showDrafted?: boolean }
  ): Promise<Calendar[]> {
    const params = new URLSearchParams();
    if (this.usesLeadConnector) {
      params.append('locationId', this.requireLocationId());
    }
    if (filter?.groupId) {
      params.append('groupId', String(filter.groupId));
    }
    if (filter?.showDrafted !== undefined) {
      params.append('showDrafted', String(filter.showDrafted));
    }

    const path = this.usesLeadConnector
      ? `/calendars/${params.toString() ? `?${params.toString()}` : ''}`
      : `/v1/calendars${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<{ calendars?: Calendar[]; data?: Calendar[] }>('GET', path);
    return response.calendars ?? response.data ?? [];
  }

  async createCalendar(data: CreateCalendarRequest): Promise<Calendar> {
    const path = this.usesLeadConnector ? '/calendars/' : '/v1/calendars';
    const payload = this.usesLeadConnector ? this.applyLocationId({ ...data }) : data;
    const response = await this.request<{ calendar?: Calendar; data?: Calendar; calendars?: Calendar[] }>(
      'POST',
      path,
      payload
    );
    const calendar = response.calendar ?? response.data ?? response.calendars?.[0];
    if (!calendar) {
      throw new Error('Failed to create calendar');
    }
    return calendar;
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

  async updateOpportunityStage(
    opportunityId: string,
    stageId: string
  ): Promise<{ success: boolean }> {
    const path = this.usesLeadConnector
      ? `/opportunities/${opportunityId}/stage?locationId=${encodeURIComponent(this.requireLocationId())}`
      : `/v1/opportunities/${opportunityId}/stage`;

    const response = await this.request<{ success?: boolean }>(
      'PATCH',
      path,
      { stageId }
    );

    return { success: response.success ?? true };
  }
}
