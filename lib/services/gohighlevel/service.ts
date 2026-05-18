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
import { GoHighLevelClient } from './client.js';

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
    this.clients.delete(tenantId); // Clear cached client
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

      const baseUrl = process.env.GOHIGHLEVEL_API_URL || 'https://api.gohighlevel.com';
      const client = new GoHighLevelClient(apiKey, baseUrl);
      this.clients.set(tenantId, client);
    }

    return this.clients.get(tenantId)!;
  }

  async getContacts(tenantId: string, filter?: ListContactsFilter): Promise<ListResponse<Contact>> {
    const client = this.getClient(tenantId);
    return client.getContacts(filter);
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
}

// Singleton instance
let instance: GoHighLevelService | null = null;

export function getGoHighLevelService(): GoHighLevelService {
  if (!instance) {
    instance = new GoHighLevelService();
  }
  return instance;
}
