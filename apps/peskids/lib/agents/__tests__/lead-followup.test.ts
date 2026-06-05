import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LeadFollowupService } from '../lead-followup.service';
import type { GoHighLevelClient, Contact, ListResponse } from '@intcloudsysops/services/gohighlevel';

function createMockClient(): GoHighLevelClient {
  return {
    getContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    sendMessage: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getTasks: vi.fn(),
    getAppointments: vi.fn(),
    updateOpportunityStageForContact: vi.fn(),
  } as unknown as GoHighLevelClient;
}

function makeContact(overrides: Partial<Contact> & { id: string }): Contact {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Test Contact',
    email: overrides.email,
    phone: overrides.phone,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    source: overrides.source,
    status: overrides.status ?? 'New Lead',
    customFields: overrides.customFields,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt,
  };
}

describe('LeadFollowupService', () => {
  let mockClient: GoHighLevelClient;
  let service: LeadFollowupService;

  beforeEach(() => {
    mockClient = createMockClient();
    service = new LeadFollowupService(mockClient);
  });

  describe('findStaleLeads', () => {
    it('returns only contacts older than the threshold', async () => {
      const now = Date.now();
      const oldContact = makeContact({
        id: 'c1',
        name: 'Maria',
        createdAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      });
      const recentContact = makeContact({
        id: 'c2',
        name: 'Juan',
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      });

      const mockResponse: ListResponse<Contact> = {
        data: [oldContact, recentContact],
        total: 2,
      };

      vi.mocked(mockClient.getContacts).mockResolvedValue(mockResponse);

      const stale = await service.findStaleLeads(24);

      expect(stale).toHaveLength(1);
      expect(stale[0].id).toBe('c1');
    });

    it('returns empty when all leads are recent', async () => {
      const now = Date.now();
      const recent = makeContact({
        id: 'c3',
        createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      });

      vi.mocked(mockClient.getContacts).mockResolvedValue({
        data: [recent],
        total: 1,
      });

      const stale = await service.findStaleLeads(24);
      expect(stale).toHaveLength(0);
    });

    it('filters contacts by New Lead status', async () => {
      vi.mocked(mockClient.getContacts).mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findStaleLeads(24);

      expect(mockClient.getContacts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'New Lead' })
      );
    });

    it('handles contacts without createdAt gracefully', async () => {
      const noDate = makeContact({ id: 'c4', createdAt: undefined });

      vi.mocked(mockClient.getContacts).mockResolvedValue({
        data: [noDate],
        total: 1,
      });

      const stale = await service.findStaleLeads(24);
      expect(stale).toHaveLength(0);
    });
  });

  describe('escalateToHuman', () => {
    it('creates a high-priority task with description', async () => {
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-1',
        title: '',
        status: 'open',
        priority: 'high',
      });

      await service.escalateToHuman('c1', 'No response after 48 hours');

      expect(mockClient.createTask).toHaveBeenCalledWith({
        title: 'Lead sin respuesta — seguimiento humano requerido',
        description: 'No response after 48 hours',
        contactId: 'c1',
        priority: 'high',
      });
    });
  });

  describe('sendFollowup', () => {
    it('returns true on successful send', async () => {
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-1',
        status: 'sent',
      });

      const result = await service.sendFollowup(
        'c1',
        'Hola!',
        'whatsapp'
      );

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        contactId: 'c1',
        message: 'Hola!',
        channel: 'whatsapp',
      });
    });

    it('returns false when send fails', async () => {
      vi.mocked(mockClient.sendMessage).mockRejectedValue(
        new Error('API error')
      );

      const result = await service.sendFollowup('c1', 'Hola!', 'sms');
      expect(result).toBe(false);
    });
  });

  describe('generateFollowupMessage', () => {
    it('builds fallback message when LLM Gateway is unreachable', async () => {
      const contact = makeContact({
        id: 'c1',
        name: 'Maria Rodriguez',
        customFields: { child_name: 'Mateo' },
      });

      const message = await service.generateFollowupMessage(
        contact,
        'http://localhost:1'
      );

      expect(message).toContain('Maria');
      expect(message).toContain('Mateo');
      expect(message).toContain('Peskids');
    });

    it('returns fallback when LLM returns empty', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }))
      );

      const contact = makeContact({ id: 'c1', name: 'Ana' });
      const message = await service.generateFollowupMessage(
        contact,
        'http://gateway:3010'
      );

      expect(message).toContain('Ana');
      mockFetch.mockRestore();
    });
  });

  describe('executeFollowupCycle', () => {
    it('processes stale leads and returns counts', async () => {
      const now = Date.now();
      const stale = makeContact({
        id: 'c-stale',
        name: 'Pedro',
        createdAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      });

      vi.mocked(mockClient.getContacts).mockResolvedValue({
        data: [stale],
        total: 1,
      });

      vi.spyOn(service, 'generateFollowupMessage').mockResolvedValue(
        'Hola Pedro, ¿te gustaría agendar una clase de prueba?'
      );

      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-ok',
        status: 'sent',
      });
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-1',
        title: '',
        status: 'open',
        priority: 'high',
      });

      const result = await service.executeFollowupCycle({
        hoursThreshold: 24,
        channel: 'sms',
      });

      expect(result.followed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('counts failures when send fails', async () => {
      const now = Date.now();
      const stale = makeContact({
        id: 'c-fail',
        name: 'Luis',
        createdAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      });

      vi.mocked(mockClient.getContacts).mockResolvedValue({
        data: [stale],
        total: 1,
      });

      vi.spyOn(service, 'generateFollowupMessage').mockResolvedValue('Test message');
      vi.mocked(mockClient.sendMessage).mockRejectedValue(new Error('Send failed'));

      const result = await service.executeFollowupCycle();

      expect(result.followed).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});
