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
import { GoHighLevelClient } from './client.js';
import { resolveGoHighLevelEnv, resolveGoHighLevelPeskidsEnv } from './env-config.js';

const PESKIDS_TENANT_ID = 'peskids';

interface TenantConfig {
  apiKey: string;
  accountId?: string;
  locationId?: string;
}

export class GoHighLevelService {
  private clients: Map<string, GoHighLevelClient> = new Map();
  private configs: Map<string, TenantConfig> = new Map();
  private defaultApiKey: string;

  constructor(defaultApiKey?: string) {
    this.defaultApiKey = defaultApiKey || process.env.GOHIGHLEVEL_API_KEY || '';
  }

  registerTenant(tenantId: string, config: TenantConfig): void {
    this.configs.set(tenantId, config);
    this.clients.delete(tenantId);
  }

  private getClient(tenantId: string): GoHighLevelClient {
    if (!this.clients.has(tenantId)) {
      const config = this.configs.get(tenantId);
      const apiKey = config?.apiKey || this.defaultApiKey;

      if (!apiKey) {
        throw new Error(
          `GoHighLevel API key not configured for tenant ${tenantId}. Register tenant config or set GOHIGHLEVEL_API_KEY env var.`
        );
      }

      const envConfig = resolveGoHighLevelEnv();
      const locationId = config?.locationId || envConfig.locationId;
      const client = new GoHighLevelClient(apiKey, envConfig.baseUrl, {
        locationId,
        apiVersion: envConfig.apiVersion,
      });
      this.clients.set(tenantId, client);
    }

    return this.clients.get(tenantId)!;
  }

  async getContacts(tenantId: string, filter?: ListContactsFilter): Promise<ListResponse<Contact>> {
    const client = this.getClient(tenantId);
    return client.getContacts(filter);
  }

  async searchContacts(tenantId: string, filter?: Record<string, unknown>): Promise<ListResponse<Contact>> {
    const client = this.getClient(tenantId);
    return client.searchContacts(filter);
  }

  async getContact(tenantId: string, contactId: string): Promise<Contact> {
    const client = this.getClient(tenantId);
    return client.getContact(contactId);
  }

  async createContact(tenantId: string, data: CreateContactRequest): Promise<Contact> {
    const client = this.getClient(tenantId);
    return client.createContact(data);
  }

  async updateContact(
    tenantId: string,
    contactId: string,
    data: UpdateContactRequest
  ): Promise<Contact> {
    const client = this.getClient(tenantId);
    return client.updateContact(contactId, data);
  }

  async listTags(tenantId: string): Promise<Tag[]> {
    const client = this.getClient(tenantId);
    return client.listTags();
  }

  async createTag(tenantId: string, data: CreateTagRequest): Promise<Tag> {
    const client = this.getClient(tenantId);
    return client.createTag(data);
  }

  async updateTag(tenantId: string, tagId: string, data: UpdateTagRequest): Promise<Tag> {
    const client = this.getClient(tenantId);
    return client.updateTag(tagId, data);
  }

  async deleteTag(tenantId: string, tagId: string): Promise<{ success: boolean }> {
    const client = this.getClient(tenantId);
    return client.deleteTag(tagId);
  }

  async listCustomFields(tenantId: string, model?: CustomFieldModel): Promise<CustomField[]> {
    const client = this.getClient(tenantId);
    return client.listCustomFields(model);
  }

  async createCustomField(tenantId: string, data: CreateCustomFieldRequest): Promise<CustomField> {
    const client = this.getClient(tenantId);
    return client.createCustomField(data);
  }

  async getOpportunity(tenantId: string, opportunityId: string): Promise<Opportunity> {
    const client = this.getClient(tenantId);
    return client.getOpportunity(opportunityId);
  }

  async createOpportunity(tenantId: string, data: CreateOpportunityRequest): Promise<Opportunity> {
    const client = this.getClient(tenantId);
    return client.createOpportunity(data);
  }

  async updateOpportunity(
    tenantId: string,
    opportunityId: string,
    data: UpdateOpportunityRequest
  ): Promise<Opportunity> {
    const client = this.getClient(tenantId);
    return client.updateOpportunity(opportunityId, data);
  }

  async deleteOpportunity(tenantId: string, opportunityId: string): Promise<{ success: boolean }> {
    const client = this.getClient(tenantId);
    return client.deleteOpportunity(opportunityId);
  }

  async searchOpportunities(
    tenantId: string,
    filter?: SearchOpportunitiesFilter
  ): Promise<ListResponse<Opportunity>> {
    const client = this.getClient(tenantId);
    return client.searchOpportunities(filter);
  }

  async getCalendars(tenantId: string, filter?: Record<string, unknown>): Promise<Calendar[]> {
    const client = this.getClient(tenantId);
    return client.getCalendars(filter);
  }

  async createCalendar(tenantId: string, data: CreateCalendarRequest): Promise<Calendar> {
    const client = this.getClient(tenantId);
    return client.createCalendar(data);
  }

  async getTasks(tenantId: string, contactId?: string): Promise<Task[]> {
    const client = this.getClient(tenantId);
    return client.getTasks(contactId);
  }

  async createTask(tenantId: string, data: CreateTaskRequest): Promise<Task> {
    const client = this.getClient(tenantId);
    return client.createTask(data);
  }

  async updateTask(
    tenantId: string,
    taskId: string,
    data: Partial<CreateTaskRequest>
  ): Promise<Task> {
    const client = this.getClient(tenantId);
    return client.updateTask(taskId, data);
  }

  async getAppointments(tenantId: string, contactId?: string): Promise<Appointment[]> {
    const client = this.getClient(tenantId);
    return client.getAppointments(contactId);
  }

  async sendMessage(tenantId: string, data: SendMessageRequest): Promise<{ id: string; status: string }> {
    const client = this.getClient(tenantId);
    return client.sendMessage(data);
  }

  async updateOpportunityStage(
    tenantId: string,
    opportunityId: string,
    stageId: string
  ): Promise<{ success: boolean }> {
    const client = this.getClient(tenantId);
    return client.updateOpportunityStage(opportunityId, stageId);
  }
}

// Singleton instance
let instance: GoHighLevelService | null = null;

export function getGoHighLevelService(): GoHighLevelService {
  if (!instance) {
    instance = new GoHighLevelService();
    const peskidsEnv = resolveGoHighLevelPeskidsEnv();
    if (peskidsEnv.apiKey) {
      instance.registerTenant(PESKIDS_TENANT_ID, {
        apiKey: peskidsEnv.apiKey,
        locationId: peskidsEnv.locationId,
      });
    }
  }
  return instance;
}
