import Bottleneck from 'bottleneck';
import type {
  TCAppointment,
  TCClient,
  TCContractor,
  TCInvoice,
  TCPaginatedResponse,
  TCInstance,
} from './types';

// Rate limiter: TutorCruncher allows 3600 requests/hour (1/second)
const limiter = new Bottleneck({
  minTime: 1000, // Minimum 1 second between requests
  maxConcurrent: 1, // One request at a time
});

// Exponential backoff with jitter
async function delay(attempt: number): Promise<void> {
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
  const jitter = Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}

// TutorCruncher API client
export class TutorCruncherClient {
  private baseUrl: string;
  private token: string;
  private instanceId: string;

  constructor(instance: TCInstance) {
    this.baseUrl = instance.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = instance.token;
    this.instanceId = instance.id;
  }

  // Make authenticated request with rate limiting and retries
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const makeRequest = async (): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `token ${this.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `TutorCruncher API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return response.json();
    };

    // Wrap in rate limiter
    return limiter.schedule(async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          return await makeRequest();
        } catch (error) {
          lastError = error as Error;

          // Check if we should retry
          const isRateLimited =
            error instanceof Error && error.message.includes('429');
          const isTimeout =
            error instanceof Error &&
            (error.message.includes('timeout') ||
              error.message.includes('ETIMEDOUT'));
          const isServerError =
            error instanceof Error &&
            (error.message.includes('500') || error.message.includes('503'));

          if (isRateLimited || isTimeout || isServerError) {
            if (attempt < retries - 1) {
              console.log(
                `[TC:${this.instanceId}] Retrying request to ${endpoint} (attempt ${attempt + 1}/${retries})`
              );
              await delay(attempt);
              continue;
            }
          }

          throw error;
        }
      }

      throw lastError;
    });
  }

  // Paginate through all results
  private async *paginate<T>(
    endpoint: string
  ): AsyncGenerator<T[], void, unknown> {
    let url: string | null = endpoint;

    while (url) {
      // Handle full URL or relative endpoint
      const currentUrl: string = url.startsWith('http')
        ? url.replace(this.baseUrl, '')
        : url;
      const response = await this.request<TCPaginatedResponse<T>>(currentUrl);

      yield response.results;

      // Get next page URL
      url = response.next;
    }
  }

  // Collect all results from pagination
  private async fetchAll<T>(endpoint: string): Promise<T[]> {
    const results: T[] = [];
    for await (const page of this.paginate<T>(endpoint)) {
      results.push(...page);
    }
    return results;
  }

  // ===========================
  // Appointments (Lessons)
  // ===========================

  // Get appointments in a date range
  async getAppointments(
    startDate: Date,
    endDate: Date
  ): Promise<TCAppointment[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return this.fetchAll<TCAppointment>(
      `/appointments/?start_gte=${start}&start_lte=${end}&page_size=100`
    );
  }

  // Get completed appointments in a date range
  async getCompletedAppointments(
    startDate: Date,
    endDate: Date
  ): Promise<TCAppointment[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return this.fetchAll<TCAppointment>(
      `/appointments/?start_gte=${start}&start_lte=${end}&status=complete&page_size=100`
    );
  }

  // Get a single appointment
  async getAppointment(id: number): Promise<TCAppointment> {
    return this.request<TCAppointment>(`/appointments/${id}/`);
  }

  // ===========================
  // Clients
  // ===========================

  // Get all live clients
  async getLiveClients(): Promise<TCClient[]> {
    return this.fetchAll<TCClient>('/clients/?status=live&page_size=100');
  }

  // Get all clients
  async getAllClients(): Promise<TCClient[]> {
    return this.fetchAll<TCClient>('/clients/?page_size=100');
  }

  // Get a single client
  async getClient(id: number): Promise<TCClient> {
    return this.request<TCClient>(`/clients/${id}/`);
  }

  // ===========================
  // Contractors (Tutors)
  // ===========================

  // Get all live contractors
  async getLiveTutors(): Promise<TCContractor[]> {
    return this.fetchAll<TCContractor>(
      '/contractors/?status=live&page_size=100'
    );
  }

  // Get all contractors
  async getAllTutors(): Promise<TCContractor[]> {
    return this.fetchAll<TCContractor>('/contractors/?page_size=100');
  }

  // Get a single contractor
  async getTutor(id: number): Promise<TCContractor> {
    return this.request<TCContractor>(`/contractors/${id}/`);
  }

  // ===========================
  // Invoices
  // ===========================

  // Get invoices in a date range
  async getInvoices(startDate: Date, endDate: Date): Promise<TCInvoice[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return this.fetchAll<TCInvoice>(
      `/invoices/?date_sent_gte=${start}&date_sent_lte=${end}&page_size=100`
    );
  }

  // Get paid invoices in a date range
  async getPaidInvoices(startDate: Date, endDate: Date): Promise<TCInvoice[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return this.fetchAll<TCInvoice>(
      `/invoices/?date_sent_gte=${start}&date_sent_lte=${end}&status=paid&page_size=100`
    );
  }

  // ===========================
  // Health Check
  // ===========================

  // Simple health check to verify credentials
  async healthCheck(): Promise<boolean> {
    try {
      await this.request<TCPaginatedResponse<unknown>>(
        '/contractors/?page_size=1'
      );
      return true;
    } catch {
      return false;
    }
  }
}

// Create client from environment variables
export function createTCClient(instanceId: string): TutorCruncherClient | null {
  const instanceKey = instanceId.toUpperCase().replace(/-/g, '_');
  const baseUrl = process.env[`TC_${instanceKey}_BASE_URL`];
  const token = process.env[`TC_${instanceKey}_TOKEN`];

  if (!baseUrl || !token) {
    console.warn(
      `TutorCruncher credentials not found for instance: ${instanceId}`
    );
    return null;
  }

  return new TutorCruncherClient({
    id: instanceId,
    name: instanceId,
    baseUrl,
    token,
  });
}

// Create client from FranchiseeAccount credentials
export function createTCClientFromAccount(
  accountId: string,
  baseUrl: string,
  token: string
): TutorCruncherClient {
  return new TutorCruncherClient({
    id: accountId,
    name: accountId,
    baseUrl,
    token,
  });
}
