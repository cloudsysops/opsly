import { promises as fsp } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface AgentService {
  enabled: boolean;
  url: string;
  type: 'http' | 'http_api';
  agent_role: string;
  capabilities: string[];
  timeout_ms: number;
  retry_attempts: number;
  retry_backoff_ms: number;
  health_check_interval_ms: number;
  description: string;
}

export interface AgentServicesConfig {
  services: Record<string, AgentService>;
  defaults: {
    default_agent: string;
    fallback_chain: string[];
  };
  environments?: Record<string, Record<string, string>>;
}

export class AgentServiceRegistry {
  private config: AgentServicesConfig | null = null;
  private configPath: string;
  private serviceHealthStatus: Map<string, boolean> = new Map();
  private lastHealthCheck: Map<string, number> = new Map();

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'agent-services.yaml');
  }

  /**
   * Load agent services configuration from YAML file
   */
  async loadConfig(): Promise<AgentServicesConfig> {
    try {
      const fileContent = await fsp.readFile(this.configPath, 'utf-8');
      this.config = yaml.load(fileContent) as AgentServicesConfig;
      console.log('[AgentServiceRegistry] ✅ Config loaded:', this.configPath);
      return this.config;
    } catch (err) {
      console.error('[AgentServiceRegistry] ❌ Error loading config:', err);
      throw new Error(`Failed to load agent services config from ${this.configPath}`);
    }
  }

  /**
   * Get configuration (lazy load if not already loaded)
   */
  async getConfig(): Promise<AgentServicesConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Get a specific service by name
   * Returns: { url, timeout_ms, retry_attempts, description }
   */
  async getService(serviceName: string): Promise<AgentService | null> {
    const config = await this.getConfig();
    const service = config.services[serviceName];

    if (!service) {
      console.warn(`[AgentServiceRegistry] Service not found: ${serviceName}`);
      return null;
    }

    if (!service.enabled) {
      console.warn(`[AgentServiceRegistry] Service disabled: ${serviceName}`);
      return null;
    }

    return service;
  }

  /**
   * Get service URL for making HTTP requests
   * Supports environment override
   */
  async getServiceUrl(serviceName: string, environment?: string): Promise<string | null> {
    const config = await this.getConfig();

    // Check environment override first
    if (environment && config.environments?.[environment]?.[serviceName]) {
      return config.environments[environment][serviceName];
    }

    // Fall back to service config
    const service = config.services[serviceName];
    if (service?.enabled) {
      return service.url;
    }

    return null;
  }

  /**
   * Get list of available services (enabled only)
   */
  async getAvailableServices(): Promise<string[]> {
    const config = await this.getConfig();
    return Object.entries(config.services)
      .filter(([_, service]) => service.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Get fallback chain from config
   * Used when primary service is unavailable
   */
  async getFallbackChain(): Promise<string[]> {
    const config = await this.getConfig();
    return config.defaults.fallback_chain;
  }

  /**
   * Check if a service is healthy (via HTTP HEAD request)
   * Implements caching to avoid spamming health checks
   */
  async isServiceHealthy(serviceName: string): Promise<boolean> {
    const service = await this.getService(serviceName);
    if (!service) return false;

    // Check if we've done a recent health check (within interval)
    const lastCheck = this.lastHealthCheck.get(serviceName) || 0;
    const now = Date.now();
    if (now - lastCheck < service.health_check_interval_ms) {
      return this.serviceHealthStatus.get(serviceName) ?? false;
    }

    try {
      // Attempt HEAD request to service endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), service.timeout_ms);

      const response = await fetch(`${service.url}/health`, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const isHealthy = response.ok;
      this.serviceHealthStatus.set(serviceName, isHealthy);
      this.lastHealthCheck.set(serviceName, now);

      if (isHealthy) {
        console.log(`[AgentServiceRegistry] ✅ ${serviceName} is healthy`);
      } else {
        console.warn(`[AgentServiceRegistry] ⚠️ ${serviceName} returned ${response.status}`);
      }

      return isHealthy;
    } catch (err) {
      console.error(`[AgentServiceRegistry] ❌ Health check failed for ${serviceName}:`, err);
      this.serviceHealthStatus.set(serviceName, false);
      this.lastHealthCheck.set(serviceName, now);
      return false;
    }
  }

  /**
   * Get a working service from fallback chain
   * Tries primary, then falls back through chain until one is healthy
   */
  async getWorkingService(preferredService?: string): Promise<{ name: string; service: AgentService } | null> {
    const config = await this.getConfig();
    const chain = preferredService
      ? [preferredService, ...config.defaults.fallback_chain.filter((s) => s !== preferredService)]
      : config.defaults.fallback_chain;

    for (const serviceName of chain) {
      const isHealthy = await this.isServiceHealthy(serviceName);
      if (isHealthy) {
        const service = config.services[serviceName];
        if (service?.enabled) {
          console.log(`[AgentServiceRegistry] 🎯 Using service: ${serviceName}`);
          return { name: serviceName, service };
        }
      }
    }

    console.error('[AgentServiceRegistry] ❌ No working services available in fallback chain');
    return null;
  }

  /**
   * List all services with their status
   */
  async listServices(): Promise<
    Array<{
      name: string;
      enabled: boolean;
      url: string;
      capabilities: string[];
      healthy?: boolean;
    }>
  > {
    const config = await this.getConfig();
    const services = [];

    for (const [name, service] of Object.entries(config.services)) {
      const healthy = await this.isServiceHealthy(name);
      services.push({
        name,
        enabled: service.enabled,
        url: service.url,
        capabilities: service.capabilities,
        healthy,
      });
    }

    return services;
  }

  /**
   * Update configuration at runtime (e.g., from operator)
   */
  async updateServiceUrl(serviceName: string, newUrl: string): Promise<void> {
    const config = await this.getConfig();
    if (config.services[serviceName]) {
      config.services[serviceName].url = newUrl;
      console.log(`[AgentServiceRegistry] ✅ Updated ${serviceName} URL to ${newUrl}`);
    } else {
      throw new Error(`Service ${serviceName} not found in config`);
    }
  }

  /**
   * Enable/disable a service at runtime
   */
  async setServiceEnabled(serviceName: string, enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    if (config.services[serviceName]) {
      config.services[serviceName].enabled = enabled;
      console.log(`[AgentServiceRegistry] Service ${serviceName} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      throw new Error(`Service ${serviceName} not found in config`);
    }
  }
}

// Singleton instance for use across orchestrator
let registryInstance: AgentServiceRegistry | null = null;

export function getAgentServiceRegistry(): AgentServiceRegistry {
  if (!registryInstance) {
    registryInstance = new AgentServiceRegistry();
  }
  return registryInstance;
}
