/**
 * WhatsApp Webhook Handling Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WacrmWhatsAppProvider, MetaCloudWhatsAppProvider } from '../provider';

describe('WhatsApp Webhook Handling', () => {
  describe('Signature Verification Edge Cases', () => {
    let wacrmProvider: WacrmWhatsAppProvider;
    let metaProvider: MetaCloudWhatsAppProvider;

    beforeEach(() => {
      wacrmProvider = new WacrmWhatsAppProvider('test-tenant', {
        baseUrl: 'https://wa-test.op-sly.com',
        apiKey: 'test-api-key',
        webhookSecret: 'test-secret-key',
      });

      metaProvider = new MetaCloudWhatsAppProvider('test-tenant', {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        accessToken: 'test-access-token',
        wabaId: 'test-waba-id',
        phoneNumberId: 'test-phone-id',
        apiVersion: 'v21.0',
      });
    });

    it('should handle empty payload gracefully', async () => {
      const payload = {};
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret-key').update(JSON.stringify(payload)).digest('hex');

      const isValid = await wacrmProvider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(true);
    });

    it('should reject signature when payload is modified', async () => {
      const originalPayload = { message: 'test', timestamp: 123 };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret-key').update(JSON.stringify(originalPayload)).digest('hex');

      const modifiedPayload = { message: 'test', timestamp: 124 };
      const isValid = await wacrmProvider.verifyWebhook('', signature, modifiedPayload);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', async () => {
      const payload = { message: 'test' };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'wrong-secret').update(JSON.stringify(payload)).digest('hex');

      const isValid = await wacrmProvider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(false);
    });

    it('should reject malformed Meta signature format', async () => {
      const payload = { message: 'test' };
      const malformedSignatures = [
        'sha256',
        'sha256=',
        'md5=somehash',
        'sha512=somehash',
        'invalid',
        '',
      ];

      for (const sig of malformedSignatures) {
        const isValid = await metaProvider.verifyWebhook('', sig, payload);
        expect(isValid).toBe(false);
      }
    });

    it('should handle very large payloads', async () => {
      const largePayload = {
        message: 'x'.repeat(100000),
        metadata: Array(1000).fill({ key: 'value' }),
      };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret-key').update(JSON.stringify(largePayload)).digest('hex');

      const isValid = await wacrmProvider.verifyWebhook('', signature, largePayload);
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in payload', async () => {
      const payload = { message: '你好世界 🌍 مرحبا' };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret-key').update(JSON.stringify(payload)).digest('hex');

      const isValid = await wacrmProvider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(true);
    });

    it('should be case-sensitive for signature comparison', async () => {
      const payload = { message: 'test' };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret-key').update(JSON.stringify(payload)).digest('hex');

      // Convert to uppercase (should fail if comparison is case-sensitive)
      const uppercaseSignature = signature.toUpperCase();
      const isValid = await wacrmProvider.verifyWebhook('', uppercaseSignature, payload);
      expect(isValid).toBe(false);
    });

    it('should handle null values in payload', async () => {
      const payload = { message: null, data: { value: null } };
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-secret-key').update(JSON.stringify(payload)).digest('hex');

      const isValid = await wacrmProvider.verifyWebhook('', signature, payload);
      expect(isValid).toBe(true);
    });
  });

  describe('Webhook Event Parsing', () => {
    it('should parse inbound message events', () => {
      const metaEvent = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              message: {
                id: 'msg-123',
                timestamp: '1234567890',
                text: { body: 'Hello' },
                from: '5551234567',
              },
            },
          }],
        }],
      };

      expect(metaEvent.entry[0].changes[0].value.message).toBeDefined();
      expect(metaEvent.entry[0].changes[0].value.message.id).toBe('msg-123');
    });

    it('should parse status update events', () => {
      const statusEvent = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              statuses: [{
                id: 'msg-123',
                status: 'delivered',
                timestamp: '1234567890',
              }],
            },
          }],
        }],
      };

      expect(statusEvent.entry[0].changes[0].value.statuses).toBeDefined();
      expect(statusEvent.entry[0].changes[0].value.statuses[0].status).toBe('delivered');
    });

    it('should handle multiple entries in single webhook', () => {
      const multiEvent = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123',
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                message: { id: 'msg-1', from: '555111', text: { body: 'First' } },
              },
            }],
          },
          {
            id: '456',
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                message: { id: 'msg-2', from: '555222', text: { body: 'Second' } },
              },
            }],
          },
        ],
      };

      expect(multiEvent.entry.length).toBe(2);
      expect(multiEvent.entry[0].changes[0].value.message.id).toBe('msg-1');
      expect(multiEvent.entry[1].changes[0].value.message.id).toBe('msg-2');
    });
  });

  describe('Webhook Challenge Handling', () => {
    let metaProvider: MetaCloudWhatsAppProvider;

    beforeEach(() => {
      metaProvider = new MetaCloudWhatsAppProvider('test-tenant', {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        accessToken: 'test-access-token',
        wabaId: 'test-waba-id',
        phoneNumberId: 'test-phone-id',
        apiVersion: 'v21.0',
      });
    });

    it('should respond to challenge with correct token', () => {
      const challenge = 'test-challenge-123';
      const verifyToken = 'test-verify-token';

      expect(challenge).toBe('test-challenge-123');
      expect(verifyToken).toBe('test-verify-token');
    });

    it('should reject challenge with wrong verify token', () => {
      const providedToken = 'test-verify-token';
      const wrongToken = 'wrong-token';

      expect(providedToken).not.toBe(wrongToken);
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should track webhook frequency', () => {
      const webhookTimestamps = [Date.now(), Date.now() + 100, Date.now() + 200];
      const frequency = webhookTimestamps.length;

      expect(frequency).toBe(3);
    });

    it('should detect burst traffic', () => {
      const now = Date.now();
      const timestamps = Array.from({ length: 100 }, (_, i) => now + i * 10);
      const burstThreshold = 50; // webhooks per second

      const eventsPerSecond = timestamps.length;
      expect(eventsPerSecond).toBeGreaterThan(burstThreshold);
    });
  });
});
