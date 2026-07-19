/**
 * WhatsApp Provider Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WacrmWhatsAppProvider, MetaCloudWhatsAppProvider } from '../provider';

describe('WhatsAppProvider', () => {
  describe('WacrmWhatsAppProvider', () => {
    let provider: WacrmWhatsAppProvider;

    beforeEach(() => {
      provider = new WacrmWhatsAppProvider('peskids', {
        baseUrl: 'https://wa-peskids.op-sly.com',
        apiKey: 'test-api-key',
        webhookSecret: 'test-secret',
      });
    });

    it('should verify valid webhook signature', async () => {
      const payload = { message: 'test' };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret').update(JSON.stringify(payload)).digest('hex');

      const isValid = await provider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', async () => {
      const payload = { message: 'test' };
      const invalidSignature = 'invalid-signature';

      const isValid = await provider.verifyWebhook('', invalidSignature, payload);
      expect(isValid).toBe(false);
    });

    it('should check health', async () => {
      const health = await provider.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
    });
  });

  describe('MetaCloudWhatsAppProvider', () => {
    let provider: MetaCloudWhatsAppProvider;

    beforeEach(() => {
      provider = new MetaCloudWhatsAppProvider('peskids', {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        accessToken: 'test-access-token',
        wabaId: 'test-waba-id',
        phoneNumberId: 'test-phone-id',
        apiVersion: 'v21.0',
      });
    });

    it('should verify Meta webhook signature (sha256 format)', async () => {
      const payload = { message: 'test' };
      const crypto = require('crypto');
      const hash = crypto.createHmac('sha256', 'test-app-secret').update(JSON.stringify(payload)).digest('hex');
      const signature = `sha256=${hash}`;

      const isValid = await provider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(true);
    });

    it('should reject invalid algorithm', async () => {
      const payload = { message: 'test' };
      const signature = 'md5=somehash';

      const isValid = await provider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(false);
    });
  });
});
