import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LeadFollowupService } from '../lead-followup.service';
import type { FollowupLeadRecord, LeadFollowupStore } from '../lead-followup-store';
import type { PeskidsGoHighLevelThreadClient } from '@/lib/gohighlevel-thread-client';

function createMockStore(): LeadFollowupStore {
  return {
    findStaleLeads: vi.fn(),
    findReengagementCandidates: vi.fn(),
    createPendingFollowup: vi.fn(),
  };
}

function createMockClient(): PeskidsGoHighLevelThreadClient {
  return {
    getContacts: vi.fn(),
    getContact: vi.fn(),
    findConversationByContactId: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    sendMessage: vi.fn(),
    sendConversationMessage: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getTasks: vi.fn(),
    getAppointments: vi.fn(),
    updateOpportunityStageForContact: vi.fn(),
    addContactTags: vi.fn(),
  } as unknown as PeskidsGoHighLevelThreadClient;
}

function makeLead(overrides: Partial<FollowupLeadRecord> & { id: string }): FollowupLeadRecord {
  return {
    id: overrides.id,
    tenant_id: overrides.tenant_id ?? 'peskids',
    name: overrides.name ?? 'Test Lead',
    email: overrides.email ?? 'lead@example.com',
    phone: overrides.phone ?? null,
    grade_interested: overrides.grade_interested ?? '3ro',
    class_modality: overrides.class_modality ?? null,
    neighborhood: overrides.neighborhood ?? null,
    status: overrides.status ?? 'new',
    ghl_contact_id: overrides.ghl_contact_id ?? null,
    created_at:
      overrides.created_at ?? new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  };
}

describe('LeadFollowupService', () => {
  let mockStore: LeadFollowupStore;
  let mockClient: PeskidsGoHighLevelThreadClient;
  let service: LeadFollowupService;

  beforeEach(() => {
    mockStore = createMockStore();
    mockClient = createMockClient();
    service = new LeadFollowupService({
      store: mockStore,
      ghlClient: mockClient,
      tenantId: 'peskids',
    });
  });

  describe('findStaleLeads', () => {
    it('reads stale leads from the store, not GHL', async () => {
      const staleLead = makeLead({ id: 'lead-1', name: 'Maria' });
      vi.mocked(mockStore.findStaleLeads).mockResolvedValue([staleLead]);

      const stale = await service.findStaleLeads(24);

      expect(stale).toHaveLength(1);
      expect(stale[0].id).toBe('lead-1');
      expect(mockStore.findStaleLeads).toHaveBeenCalledWith(24, 'peskids');
      expect(mockClient.getContacts).not.toHaveBeenCalled();
    });

    it('returns empty when store has no stale leads', async () => {
      vi.mocked(mockStore.findStaleLeads).mockResolvedValue([]);

      const stale = await service.findStaleLeads(24);
      expect(stale).toHaveLength(0);
    });
  });

  describe('findReengagementCandidates', () => {
    it('reads reengagement candidates from the store', async () => {
      const lead = makeLead({ id: 'lead-2', status: 'contacted' });
      vi.mocked(mockStore.findReengagementCandidates).mockResolvedValue([
        { lead, daysSinceContact: 14 },
      ]);

      const candidates = await service.findReengagementCandidates(7, 30);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].lead.id).toBe('lead-2');
      expect(mockStore.findReengagementCandidates).toHaveBeenCalledWith(7, 30, 'peskids');
      expect(mockClient.getContacts).not.toHaveBeenCalled();
    });
  });

  describe('escalateToHuman', () => {
    it('creates a high-priority task with description when GHL client is available', async () => {
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-1',
        title: '',
        status: 'open',
        priority: 'high',
      });

      await service.escalateToHuman('ghl-contact-1', 'No response after 48 hours');

      expect(mockClient.createTask).toHaveBeenCalledWith({
        title: 'Lead sin respuesta — seguimiento humano requerido',
        description: 'No response after 48 hours',
        contactId: 'ghl-contact-1',
        priority: 'high',
      });
    });
  });

  describe('sendFollowup', () => {
    it('returns true on successful send via legacy GHL messaging channel', async () => {
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-1',
        status: 'sent',
      });

      const result = await service.sendFollowup('ghl-contact-1', 'Hola!', 'whatsapp');

      expect(result).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        contactId: 'ghl-contact-1',
        message: 'Hola!',
        channel: 'whatsapp',
      });
    });

    it('returns false when send fails', async () => {
      vi.mocked(mockClient.sendMessage).mockRejectedValue(new Error('API error'));

      const result = await service.sendFollowup('ghl-contact-1', 'Hola!', 'sms');
      expect(result).toBe(false);
    });

    it('passes conversation id when available', async () => {
      vi.mocked(mockClient.sendConversationMessage).mockResolvedValue({
        id: 'msg-thread',
        status: 'pending',
      });

      const result = await service.sendFollowup('ghl-contact-1', 'Hola!', 'sms', {
        conversationId: 'conv-1',
      });

      expect(result).toBe(true);
      expect(mockClient.sendConversationMessage).toHaveBeenCalledWith({
        contactId: 'ghl-contact-1',
        conversationId: 'conv-1',
        message: 'Hola!',
        channel: 'sms',
      });
    });
  });

  describe('generateFollowupMessage', () => {
    it('builds fallback message when LLM Gateway is unreachable', async () => {
      const fetchStub = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
      vi.stubGlobal('fetch', fetchStub);
      const lead = makeLead({
        id: 'lead-1',
        name: 'Maria Rodriguez',
        grade_interested: 'Mateo',
      });

      const message = await service.generateFollowupMessage(lead, 'http://gateway:3010');

      expect(message).toContain('Maria');
      expect(message).toContain('Mateo');
      expect(message).toContain('Peskids');
      vi.unstubAllGlobals();
    });

    it('returns fallback when LLM returns empty', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }))
      );

      const lead = makeLead({ id: 'lead-1', name: 'Ana' });
      const message = await service.generateFollowupMessage(lead, 'http://gateway:3010');

      expect(message).toContain('Ana');
      mockFetch.mockRestore();
    });
  });

  describe('executeFollowupCycle', () => {
    it('sends followup via GHL when ghl_contact_id exists', async () => {
      const stale = makeLead({
        id: 'lead-stale',
        name: 'Pedro',
        ghl_contact_id: 'ghl-contact-pedro',
      });

      vi.mocked(mockStore.findStaleLeads).mockResolvedValue([stale]);
      vi.mocked(mockClient.findConversationByContactId).mockResolvedValue(null);
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
      expect(result.escalated).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockStore.createPendingFollowup).not.toHaveBeenCalled();
      expect(mockClient.sendMessage).toHaveBeenCalled();
    });

    it('queues manual followup when lead has no ghl_contact_id', async () => {
      const stale = makeLead({
        id: 'lead-manual',
        name: 'Laura',
        ghl_contact_id: null,
      });

      vi.mocked(mockStore.findStaleLeads).mockResolvedValue([stale]);
      vi.mocked(mockStore.createPendingFollowup).mockResolvedValue({ id: 'followup-1' });
      vi.spyOn(service, 'generateFollowupMessage').mockResolvedValue('Mensaje sugerido');

      const result = await service.executeFollowupCycle();

      expect(result.followed).toBe(0);
      expect(result.escalated).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
      expect(mockStore.createPendingFollowup).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'peskids',
          leadId: 'lead-manual',
          notes: expect.stringContaining('Seguimiento manual requerido'),
        })
      );
    });

    it('queues manual followup and counts failure when GHL send fails', async () => {
      const stale = makeLead({
        id: 'lead-fail',
        name: 'Luis',
        ghl_contact_id: 'ghl-contact-luis',
      });

      vi.mocked(mockStore.findStaleLeads).mockResolvedValue([stale]);
      vi.mocked(mockClient.findConversationByContactId).mockResolvedValue(null);
      vi.mocked(mockStore.createPendingFollowup).mockResolvedValue({ id: 'followup-2' });
      vi.spyOn(service, 'generateFollowupMessage').mockResolvedValue('Test message');
      vi.mocked(mockClient.sendMessage).mockRejectedValue(new Error('Send failed'));

      const result = await service.executeFollowupCycle();

      expect(result.followed).toBe(0);
      expect(result.escalated).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockStore.createPendingFollowup).toHaveBeenCalled();
    });
  });

  describe('sendReengagementSequence', () => {
    it('queues manual followup when lead has no ghl_contact_id', async () => {
      const lead = makeLead({
        id: 'lead-reengage',
        name: 'Sofia',
        ghl_contact_id: null,
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      });

      vi.mocked(mockStore.createPendingFollowup).mockResolvedValue({ id: 'followup-3' });

      const sent = await service.sendReengagementSequence(lead);

      expect(sent).toBe(false);
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
      expect(mockStore.createPendingFollowup).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-reengage',
          type: 'sms',
          notes: expect.stringContaining('Seguimiento manual requerido'),
        })
      );
    });

    it('sends via GHL when ghl_contact_id exists', async () => {
      const lead = makeLead({
        id: 'lead-ghl',
        name: 'Carlos',
        ghl_contact_id: 'ghl-contact-carlos',
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      });

      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-reengage',
        status: 'sent',
      });
      vi.mocked(mockClient.addContactTags).mockResolvedValue(undefined);

      const sent = await service.sendReengagementSequence(lead);

      expect(sent).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalled();
      expect(mockStore.createPendingFollowup).not.toHaveBeenCalled();
    });
  });
});
