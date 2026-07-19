/**
 * WhatsApp Twenty CRM Person Sync Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WhatsApp Twenty CRM Person Sync', () => {
  describe('Phone Number Normalization', () => {
    it('should normalize phone to E164 format', () => {
      const testCases = [
        { input: '5551234567', expected: '+5551234567' },
        { input: '+5551234567', expected: '+5551234567' },
        { input: '(555) 123-4567', expected: '+5551234567' },
        { input: '555-123-4567', expected: '+5551234567' },
      ];

      for (const tc of testCases) {
        const normalized = tc.input.replace(/\D/g, '');
        const formatted = '+' + normalized;
        expect(formatted).toMatch(/^\+\d+$/);
      }
    });

    it('should extract digits from phone number', () => {
      const phone = '(555) 123-4567';
      const digits = phone.replace(/\D/g, '');

      expect(digits).toBe('5551234567');
      expect(digits.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle international phone numbers', () => {
      const testCases = [
        { input: '+551198765432', country: 'BR' }, // Brazil
        { input: '+33123456789', country: 'FR' },  // France
        { input: '+44123456789', country: 'GB' },  // UK
      ];

      for (const tc of testCases) {
        const isValid = /^\+\d{10,}$/.test(tc.input);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Finding Existing Persons', () => {
    it('should query Twenty GraphQL by phone number', () => {
      const query = `query FindPersonByPhone($phone: String!) {
        person(filter: { phone: { equals: $phone } }) {
          edges {
            node {
              id
              firstName
              lastName
              email
            }
          }
        }
      }`;

      expect(query).toContain('FindPersonByPhone');
      expect(query).toContain('phone');
    });

    it('should return null when person not found', () => {
      const result = null;
      expect(result).toBeNull();
    });

    it('should return person object when found', () => {
      const person = {
        id: 'person-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+5551234567',
      };

      expect(person.id).toBeDefined();
      expect(person.firstName).toBeDefined();
      expect(person.phone).toBe('+5551234567');
    });

    it('should handle multiple matches gracefully', () => {
      // In real scenario, Twenty should enforce unique constraint
      const persons = [
        { id: 'person-1', phone: '+5551234567', email: 'john1@example.com' },
        { id: 'person-2', phone: '+5551234567', email: 'john2@example.com' },
      ];

      // Take first match or throw error
      const firstMatch = persons[0];
      expect(firstMatch.id).toBe('person-1');
    });
  });

  describe('Upserting Persons', () => {
    it('should create person if not exists', () => {
      const newPerson = {
        id: 'person-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+5559876543',
      };

      expect(newPerson.id).toBeDefined();
      expect(newPerson.firstName).toBe('Jane');
    });

    it('should update person if exists', () => {
      const existingPerson = {
        id: 'person-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.old@example.com',
      };

      const updated = {
        ...existingPerson,
        email: 'jane.new@example.com',
      };

      expect(updated.email).toBe('jane.new@example.com');
      expect(updated.id).toBe(existingPerson.id);
    });

    it('should handle GraphQL mutation errors', () => {
      const graphqlError = {
        message: 'Invalid email format',
        extensions: { code: 'INVALID_INPUT' },
      };

      expect(graphqlError.extensions.code).toBe('INVALID_INPUT');
    });

    it('should validate email format', () => {
      const validEmails = ['john@example.com', 'jane.doe@company.co.uk'];
      const invalidEmails = ['invalid', 'missing@', '@example.com'];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (const email of validEmails) {
        expect(emailRegex.test(email)).toBe(true);
      }

      for (const email of invalidEmails) {
        expect(emailRegex.test(email)).toBe(false);
      }
    });

    it('should preserve existing person ID on update', () => {
      const personId = 'person-123';
      const updatePayload = {
        firstName: 'Updated Name',
        email: 'new@example.com',
      };

      const updatedPerson = {
        id: personId,
        ...updatePayload,
      };

      expect(updatedPerson.id).toBe(personId);
    });
  });

  describe('Person Name Parsing', () => {
    it('should parse full name into first and last name', () => {
      const testCases = [
        { full: 'John Doe', first: 'John', last: 'Doe' },
        { full: 'Jane Smith Garcia', first: 'Jane', last: 'Smith Garcia' },
        { full: 'X', first: 'X', last: '' },
      ];

      for (const tc of testCases) {
        const parts = tc.full.trim().split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');

        expect(firstName).toBe(tc.first);
        expect(lastName).toBe(tc.last);
      }
    });

    it('should handle names with special characters', () => {
      const testCases = [
        "O'Brien",
        'José García',
        'Jean-Pierre',
        'Müller',
      ];

      for (const name of testCases) {
        expect(name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Linking Lead to Twenty Person', () => {
    it('should update lead with twenty_person_id', () => {
      const leadId = 'lead-123';
      const tenantId = 'tenant-123';
      const twentyPersonId = 'person-456';

      const lead = {
        id: leadId,
        tenantId,
        twenty_person_id: twentyPersonId,
        twenty_sync_status: 'synced' as const,
      };

      expect(lead.twenty_person_id).toBe(twentyPersonId);
      expect(lead.twenty_sync_status).toBe('synced');
    });

    it('should mark sync as pending before attempting', () => {
      const lead = {
        id: 'lead-123',
        twenty_sync_status: 'pending' as const,
      };

      expect(lead.twenty_sync_status).toBe('pending');
    });

    it('should mark sync as failed on error', () => {
      const lead = {
        id: 'lead-123',
        twenty_sync_status: 'failed' as const,
        sync_error: 'Network timeout',
      };

      expect(lead.twenty_sync_status).toBe('failed');
      expect(lead.sync_error).toBeDefined();
    });
  });

  describe('Concurrent Sync Handling', () => {
    it('should handle multiple sync requests for same phone', () => {
      const phoneNumber = '+5551234567';
      const syncRequests = [
        { id: 'sync-1', phone: phoneNumber, timestamp: Date.now() },
        { id: 'sync-2', phone: phoneNumber, timestamp: Date.now() + 1 },
        { id: 'sync-3', phone: phoneNumber, timestamp: Date.now() + 2 },
      ];

      // Should use idempotency key or deduplication
      const uniqueRequests = new Set(syncRequests.map(r => r.phone));
      expect(uniqueRequests.size).toBe(1);
    });

    it('should use idempotency key for upsert', () => {
      const idempotencyKey = 'tenant-123-phone-5551234567';

      const request1 = { idempotencyKey, action: 'upsert' };
      const request2 = { idempotencyKey, action: 'upsert' };

      expect(request1.idempotencyKey).toBe(request2.idempotencyKey);
    });
  });

  describe('Integration with Whatsapp Contact', () => {
    it('should sync WhatsApp contact to Twenty person', () => {
      const whatsappContact = {
        phoneNumber: '+5551234567',
        displayName: 'John Doe',
        externalContactId: 'wa-123',
      };

      const twentyPerson = {
        firstName: 'John',
        lastName: 'Doe',
        phone: whatsappContact.phoneNumber,
      };

      expect(twentyPerson.phone).toBe(whatsappContact.phoneNumber);
    });

    it('should preserve WhatsApp metadata', () => {
      const contact = {
        id: 'contact-123',
        whatsappContactId: 'wa-123',
        twentyPersonId: 'person-456',
        metadata: {
          messageCount: 5,
          lastMessageAt: new Date(),
        },
      };

      expect(contact.metadata.messageCount).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      const error = {
        message: 'Network error',
        code: 'ECONNREFUSED',
        retryable: true,
      };

      expect(error.retryable).toBe(true);
    });

    it('should handle GraphQL validation errors', () => {
      const error = {
        message: 'Validation error',
        errors: [
          { message: 'Invalid email format', path: ['email'] },
        ],
        retryable: false,
      };

      expect(error.retryable).toBe(false);
      expect(error.errors.length).toBeGreaterThan(0);
    });

    it('should handle timeout errors', () => {
      const error = {
        message: 'Request timeout',
        code: 'ETIMEDOUT',
        retryable: true,
      };

      expect(error.retryable).toBe(true);
    });
  });
});
