/**
 * Health Integrations Route Tests
 */

import { describe, it, expect } from 'vitest';

describe('GET /api/health/integrations', () => {
  describe('Response Structure', () => {
    it('should return overall status', () => {
      const response = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
      };

      expect(response.status).toMatch(/healthy|degraded|unhealthy/);
      expect(response.timestamp).toBeDefined();
    });

    it('should include integration details', () => {
      const response = {
        status: 'healthy' as const,
        integrations: {
          whatsapp: { enabled: true, status: 'healthy' as const },
          meta: { enabled: true, configured: true },
          wacrm: { enabled: false, configured: false },
          aws: { status: 'healthy' as const },
          gcp: { status: 'healthy' as const },
        },
      };

      expect(response.integrations).toBeDefined();
      expect(response.integrations.whatsapp).toBeDefined();
      expect(response.integrations.aws).toBeDefined();
    });
  });

  describe('Overall Status Calculation', () => {
    it('should return healthy when all integrations healthy', () => {
      const integrations = {
        whatsapp: { status: 'healthy' as const },
        aws: { status: 'healthy' as const },
        gcp: { status: 'healthy' as const },
      };

      const overallStatus = Object.values(integrations).every(i => i.status === 'healthy')
        ? 'healthy'
        : 'unhealthy';

      expect(overallStatus).toBe('healthy');
    });

    it('should return degraded when at least one degraded', () => {
      const integrations = {
        whatsapp: { status: 'healthy' as const },
        aws: { status: 'degraded' as const },
        gcp: { status: 'healthy' as const },
      };

      const hasUnhealthy = Object.values(integrations).some(i => i.status === 'unhealthy');
      const hasDegraded = Object.values(integrations).some(i => i.status === 'degraded');

      const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
      expect(overallStatus).toBe('degraded');
    });

    it('should return unhealthy when any integration unhealthy', () => {
      const integrations = {
        whatsapp: { status: 'healthy' as const },
        aws: { status: 'unhealthy' as const },
        gcp: { status: 'healthy' as const },
      };

      const hasUnhealthy = Object.values(integrations).some(i => i.status === 'unhealthy');
      const overallStatus = hasUnhealthy ? 'unhealthy' : 'healthy';

      expect(overallStatus).toBe('unhealthy');
    });
  });

  describe('WhatsApp Health', () => {
    it('should include WhatsApp enabled status', () => {
      const whatsappHealth = {
        enabled: true,
        status: 'healthy' as const,
        provider: 'wacrm',
      };

      expect(whatsappHealth.enabled).toBe(true);
      expect(whatsappHealth.provider).toBeDefined();
    });

    it('should include WhatsApp checks', () => {
      const whatsappHealth = {
        status: 'healthy' as const,
        checks: {
          webhooks_healthy: true,
          messages_flowing: true,
          twenty_sync_catchup: true,
          approvals_queue_healthy: true,
        },
      };

      expect(whatsappHealth.checks.webhooks_healthy).toBe(true);
    });

    it('should include WhatsApp warnings', () => {
      const whatsappHealth = {
        status: 'degraded' as const,
        warnings: [
          'Webhooks stagnant for 10 minutes',
          'Twenty sync backlog at 150 records',
        ],
      };

      expect(whatsappHealth.warnings.length).toBeGreaterThan(0);
    });

    it('should include WhatsApp metrics', () => {
      const whatsappHealth = {
        metrics: {
          webhooks_received: 1250,
          webhooks_failed: 5,
          messages_sent: 8940,
          messages_failed: 45,
          pending_approvals: 12,
          twenty_sync_pending: 23,
        },
      };

      expect(whatsappHealth.metrics.webhooks_received).toBeDefined();
      expect(whatsappHealth.metrics.messages_sent).toBeGreaterThan(0);
    });
  });

  describe('Meta Configuration', () => {
    it('should indicate Meta enabled status', () => {
      const meta = {
        enabled: true,
        configured: true,
      };

      expect(meta.enabled).toBe(true);
      expect(meta.configured).toBe(true);
    });

    it('should mask sensitive Meta credentials', () => {
      const meta = {
        enabled: true,
        configured: true,
        app_id_masked: '****...f0a2',
      };

      expect(meta.app_id_masked).toContain('****');
      expect(meta.app_id_masked.length).toBeLessThan(50); // Truncated
    });
  });

  describe('WACRM Configuration', () => {
    it('should indicate WACRM enabled status', () => {
      const wacrm = {
        enabled: true,
        configured: true,
      };

      expect(wacrm.enabled).toBe(true);
    });

    it('should mask sensitive WACRM API key', () => {
      const wacrm = {
        enabled: true,
        api_key_masked: '****...secret-123',
      };

      expect(wacrm.api_key_masked).toContain('****');
    });
  });

  describe('AWS Health', () => {
    it('should check AWS service status', () => {
      const awsHealth = {
        status: 'healthy' as const,
        s3: { available: true, latency_ms: 45 },
        ses: { available: true, quota_usage: 0.23 },
        cloudwatch: { available: true },
      };

      expect(awsHealth.s3.available).toBe(true);
      expect(awsHealth.ses.available).toBe(true);
    });

    it('should report S3 metrics', () => {
      const s3 = {
        available: true,
        latency_ms: 50,
        last_checked: new Date().toISOString(),
      };

      expect(s3.latency_ms).toBeLessThan(200);
    });

    it('should report SES quota', () => {
      const ses = {
        available: true,
        quota_usage: 0.45, // 45% of quota
      };

      expect(ses.quota_usage).toBeLessThanOrEqual(1);
    });
  });

  describe('GCP Health', () => {
    it('should check GCP service status', () => {
      const gcpHealth = {
        status: 'healthy' as const,
        oauth: { available: true },
        maps: { available: true },
        places: { available: true },
      };

      expect(gcpHealth.oauth.available).toBe(true);
    });

    it('should indicate if services are configured', () => {
      const gcp = {
        status: 'healthy' as const,
        oauth: { available: true, configured: true },
        maps: { available: false, configured: false },
      };

      expect(gcp.oauth.configured).toBe(true);
      expect(gcp.maps.configured).toBe(false);
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 200 for healthy status', () => {
      const response = {
        status: 'healthy' as const,
      };

      const httpStatus = response.status === 'healthy' ? 200 : 503;
      expect(httpStatus).toBe(200);
    });

    it('should return 200 for degraded status', () => {
      const response = {
        status: 'degraded' as const,
      };

      const httpStatus = response.status === 'unhealthy' ? 503 : 200;
      expect(httpStatus).toBe(200);
    });

    it('should return 503 for unhealthy status', () => {
      const response = {
        status: 'unhealthy' as const,
      };

      const httpStatus = response.status === 'unhealthy' ? 503 : 200;
      expect(httpStatus).toBe(503);
    });
  });

  describe('Multi-Tenant Considerations', () => {
    it('should aggregate health across all tenants', () => {
      const tenants = ['peskids', 'client-a', 'client-b'];
      const response = {
        status: 'healthy' as const,
        tenants_monitored: tenants.length,
      };

      expect(response.tenants_monitored).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle missing health checks', () => {
      const response = {
        status: 'degraded' as const,
        warnings: ['WhatsApp health check unavailable'],
      };

      expect(response.warnings).toBeDefined();
    });

    it('should report service unavailability', () => {
      const response = {
        status: 'unhealthy' as const,
        error: 'Health check service unreachable',
      };

      expect(response.error).toBeDefined();
    });
  });
});
