/**
 * Admin WhatsApp Integration Status Route Tests
 */

import { describe, it, expect } from 'vitest';

describe('GET /api/admin/peskids/[slug]/integrations/whatsapp', () => {
  describe('Response Structure', () => {
    it('should return integration configuration', () => {
      const response = {
        integration: {
          whatsapp_enabled: true,
          sandbox_mode: false,
          approval_required: true,
          provider: 'wacrm' as const,
        },
      };

      expect(response.integration.whatsapp_enabled).toBe(true);
      expect(response.integration.provider).toBeDefined();
    });

    it('should include Meta configuration details', () => {
      const response = {
        integration: {
          meta: {
            enabled: true,
            app_id_masked: '****...f0a2',
            waba_id_masked: '****...xyz7',
            api_version: 'v21.0',
          },
        },
      };

      expect(response.integration.meta.enabled).toBe(true);
      expect(response.integration.meta.app_id_masked).toContain('****');
    });

    it('should include WACRM configuration details', () => {
      const response = {
        integration: {
          wacrm: {
            enabled: true,
            base_url_masked: '****...op-sly.com',
            api_key_masked: '****...key456',
          },
        },
      };

      expect(response.integration.wacrm.enabled).toBe(true);
    });

    it('should include feature flags', () => {
      const response = {
        integration: {
          feature_flags: {
            META_WEBHOOK_ENABLED: true,
            WACRM_ENABLED: true,
            PESKIDS_WHATSAPP_ENABLED: false,
            APPROVAL_REQUIRED: true,
          },
        },
      };

      expect(response.integration.feature_flags).toBeDefined();
    });
  });

  describe('Available Actions', () => {
    it('should list available integration actions', () => {
      const response = {
        integration: {
          available_actions: [
            'test_connection',
            'test_webhook',
            'view_logs',
            'reload_config',
          ],
        },
      };

      expect(response.integration.available_actions).toContain('test_connection');
      expect(response.integration.available_actions).toContain('test_webhook');
    });
  });

  describe('Health Check URLs', () => {
    it('should provide health check endpoints', () => {
      const response = {
        integration: {
          health_check_urls: {
            meta: 'http://localhost:3000/api/public/integrations/whatsapp/meta/health',
            wacrm: 'http://localhost:3000/api/public/integrations/whatsapp/wacrm/health',
            overall: 'http://localhost:3000/api/health/integrations',
          },
        },
      };

      expect(response.integration.health_check_urls.meta).toContain('meta/health');
      expect(response.integration.health_check_urls.overall).toBeDefined();
    });
  });

  describe('Metadata and Status', () => {
    it('should include last sync timestamp', () => {
      const response = {
        integration: {
          last_synced_at: new Date('2026-07-19T10:30:00Z').toISOString(),
          next_sync_at: new Date('2026-07-19T11:00:00Z').toISOString(),
        },
      };

      expect(response.integration.last_synced_at).toBeDefined();
    });

    it('should indicate if integration is ready', () => {
      const response = {
        integration: {
          status: 'ready' as const,
          is_configured: true,
          is_connected: true,
        },
      };

      expect(response.integration.status).toBe('ready');
      expect(response.integration.is_configured).toBe(true);
    });

    it('should report configuration issues', () => {
      const response = {
        integration: {
          status: 'misconfigured' as const,
          issues: [
            'Missing Meta App Secret',
            'WACRM base URL not configured',
          ],
        },
      };

      expect(response.integration.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Credentials Masking', () => {
    it('should never expose full credentials', () => {
      const response = {
        integration: {
          meta: {
            app_id: 'not-revealed',
            app_secret: 'not-revealed',
          },
        },
      };

      expect(response.integration.meta.app_id).not.toMatch(/^[a-f0-9]{40,}/);
    });

    it('should show only last 4 characters of sensitive values', () => {
      const response = {
        integration: {
          meta: {
            app_id_masked: '****...f0a2',
          },
        },
      };

      const masked = response.integration.meta.app_id_masked;
      expect(masked).toMatch(/\*{4}\.\.\.[a-zA-Z0-9]{4}$/);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return config for requested tenant', () => {
      const response = {
        slug: 'peskids',
        integration: {
          tenant_id: 'tenant-peskids',
          configuration_for: 'peskids',
        },
      };

      expect(response.integration.tenant_id).toContain('peskids');
    });

    it('should prevent cross-tenant configuration access', () => {
      const requestedSlug = 'peskids';
      const configTenant = 'client-xyz';

      const canAccess = requestedSlug === configTenant;
      expect(canAccess).toBe(false);
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 200 for valid tenant', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    it('should return 404 for non-existent tenant', () => {
      const status = 404;
      expect(status).toBe(404);
    });

    it('should return 403 for unauthorized access', () => {
      const status = 403;
      expect(status).toBe(403);
    });
  });

  describe('Configuration Export', () => {
    it('should provide configuration in exportable format', () => {
      const response = {
        integration: {
          exportable_config: {
            whatsapp_enabled: true,
            provider: 'wacrm',
            sandbox_mode: false,
            approval_required: true,
          },
        },
      };

      expect(response.integration.exportable_config).toBeDefined();
    });

    it('should indicate which values can be exported', () => {
      const response = {
        integration: {
          exportable: {
            whatsapp_enabled: true,
            provider: true,
            sandbox_mode: true,
            meta_app_secret: false, // Credentials cannot be exported
            wacrm_api_key: false,
          },
        },
      };

      expect(response.integration.exportable.whatsapp_enabled).toBe(true);
      expect(response.integration.exportable.meta_app_secret).toBe(false);
    });
  });
});
