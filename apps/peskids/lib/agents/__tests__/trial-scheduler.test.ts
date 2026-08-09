import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  TrialSchedulerService,
  GOHIGHLEVEL_CALENDAR_API_VERSION,
} from '../trial-scheduler.service';
import type { GoHighLevelClient } from '@intcloudsysops/services';
import type { TrialSchedulingStore } from '../trial-scheduling-store';

const LEAD_ID = '11111111-1111-4111-8111-111111111111';

function createMockStore(): TrialSchedulingStore {
  return {
    findScheduledTrialForLead: vi.fn(),
    countTrialsAtSlot: vi.fn(),
    getDefaultCapacity: vi.fn(),
    createLocalTrial: vi.fn(),
    createPendingFollowup: vi.fn(),
    listUpcomingTrials: vi.fn(),
    findTrialById: vi.fn(),
    getLeadContact: vi.fn(),
  };
}

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

describe('TrialSchedulerService', () => {
  let mockStore: TrialSchedulingStore;
  let mockClient: GoHighLevelClient;
  let service: TrialSchedulerService;

  beforeEach(() => {
    mockStore = createMockStore();
    mockClient = createMockClient();
    vi.mocked(mockStore.getDefaultCapacity).mockResolvedValue(4);
    vi.mocked(mockStore.countTrialsAtSlot).mockResolvedValue(0);
    service = new TrialSchedulerService({
      store: mockStore,
      ghlClient: mockClient,
      tenantId: 'peskids',
      ghlCalendarEnabled: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GOHIGHLEVEL_CALENDAR_API_VERSION', () => {
    it('uses 2021-04-15 as the Calendar API version', () => {
      expect(GOHIGHLEVEL_CALENDAR_API_VERSION).toBe('2021-04-15');
    });
  });

  describe('findAvailableSlots', () => {
    it('returns local weekday slots without calling GHL calendar', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const slots = await service.findAvailableSlots();

      expect(slots.length).toBeGreaterThanOrEqual(1);
      expect(slots.length).toBeLessThanOrEqual(5);
      expect(fetchSpy).not.toHaveBeenCalled();
      for (const slot of slots) {
        const day = new Date(slot.start).getDay();
        expect(day).not.toBe(0);
        expect(day).not.toBe(6);
      }
    });

    it('respects local capacity when filtering slots', async () => {
      vi.mocked(mockStore.getDefaultCapacity).mockResolvedValue(1);
      vi.mocked(mockStore.countTrialsAtSlot).mockResolvedValue(1);

      const slots = await service.findAvailableSlots();
      expect(slots).toHaveLength(0);
      expect(mockStore.countTrialsAtSlot).toHaveBeenCalled();
    });
  });

  describe('scheduleTrial', () => {
    it('returns existing local trial without double-booking', async () => {
      vi.mocked(mockStore.findScheduledTrialForLead).mockResolvedValue({
        id: 'trial-existing',
        lead_id: LEAD_ID,
        scheduled_date: '2026-06-10',
        scheduled_time: '14:00:00',
        status: 'scheduled',
      });

      const result = await service.scheduleTrial({
        leadId: LEAD_ID,
        parentName: 'Maria',
      });

      expect(result.scheduled).toBe(true);
      expect(result.appointmentId).toBe('trial-existing');
      expect(result.message).toContain('Ya tienes');
      expect(mockStore.createLocalTrial).not.toHaveBeenCalled();
    });

    it('creates local trial and confirms via GHL when crm contact id exists', async () => {
      vi.mocked(mockStore.findScheduledTrialForLead).mockResolvedValue(null);
      vi.mocked(mockStore.createLocalTrial).mockResolvedValue({
        id: 'trial-new',
        lead_id: LEAD_ID,
        scheduled_date: '2026-06-10',
        scheduled_time: '14:00:00',
        status: 'scheduled',
      });
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-1',
        status: 'sent',
      });
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-1',
        title: '',
        status: 'open',
        priority: 'high',
      });

      const result = await service.scheduleTrial({
        leadId: LEAD_ID,
        parentName: 'Maria',
        crmMessagingContactId: 'ghl-contact-1',
      });

      expect(result.scheduled).toBe(true);
      expect(result.appointmentId).toBe('trial-new');
      expect(result.message).toContain('agendada');
      expect(mockStore.createLocalTrial).toHaveBeenCalled();
      expect(mockClient.sendMessage).toHaveBeenCalled();
      expect(mockClient.createTask).toHaveBeenCalled();
    });

    it('queues manual followup when no local slots are available', async () => {
      vi.mocked(mockStore.findScheduledTrialForLead).mockResolvedValue(null);
      vi.mocked(mockStore.getDefaultCapacity).mockResolvedValue(1);
      vi.mocked(mockStore.countTrialsAtSlot).mockResolvedValue(99);
      vi.mocked(mockStore.createPendingFollowup).mockResolvedValue({ id: 'followup-1' });

      const result = await service.scheduleTrial({
        leadId: LEAD_ID,
        parentName: 'Ana',
      });

      expect(result.scheduled).toBe(false);
      expect(result.manualSchedulingRequired).toBe(true);
      expect(result.message).toContain('manual');
      expect(mockStore.createPendingFollowup).toHaveBeenCalled();
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('books locally without GHL messaging when crm contact id is missing', async () => {
      vi.mocked(mockStore.findScheduledTrialForLead).mockResolvedValue(null);
      vi.mocked(mockStore.createLocalTrial).mockResolvedValue({
        id: 'trial-local',
        lead_id: LEAD_ID,
        scheduled_date: '2026-06-12',
        scheduled_time: '10:00:00',
        status: 'scheduled',
      });

      const result = await service.scheduleTrial({
        leadId: LEAD_ID,
        parentName: 'Sofia',
      });

      expect(result.scheduled).toBe(true);
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
      expect(mockClient.createTask).not.toHaveBeenCalled();
    });
  });

  describe('sendReminder', () => {
    it('sends reminder via GHL when legacy contact id exists', async () => {
      vi.mocked(mockStore.findTrialById).mockResolvedValue({
        id: 'trial-remind',
        lead_id: LEAD_ID,
        scheduled_date: '2026-06-10',
        scheduled_time: '14:00:00',
        status: 'scheduled',
      });
      vi.mocked(mockStore.getLeadContact).mockResolvedValue({
        name: 'Carlos',
        ghl_contact_id: 'ghl-contact-carlos',
      });
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-remind',
        status: 'sent',
      });

      const ok = await service.sendReminder('trial-remind');

      expect(ok).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalled();
    });

    it('queues manual followup when lead has no ghl_contact_id', async () => {
      vi.mocked(mockStore.findTrialById).mockResolvedValue({
        id: 'trial-manual',
        lead_id: LEAD_ID,
        scheduled_date: '2026-06-10',
        scheduled_time: '14:00:00',
        status: 'scheduled',
      });
      vi.mocked(mockStore.getLeadContact).mockResolvedValue({
        name: 'Laura',
        ghl_contact_id: null,
      });
      vi.mocked(mockStore.createPendingFollowup).mockResolvedValue({ id: 'followup-2' });

      const ok = await service.sendReminder('trial-manual');

      expect(ok).toBe(false);
      expect(mockStore.createPendingFollowup).toHaveBeenCalled();
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('executeReminderCycle', () => {
    it('processes upcoming local trials', async () => {
      vi.mocked(mockStore.listUpcomingTrials).mockResolvedValue([
        {
          id: 'trial-1',
          lead_id: LEAD_ID,
          scheduled_date: '2026-06-10',
          scheduled_time: '14:00:00',
          status: 'scheduled',
        },
      ]);
      vi.mocked(mockStore.findTrialById).mockResolvedValue({
        id: 'trial-1',
        lead_id: LEAD_ID,
        scheduled_date: '2026-06-10',
        scheduled_time: '14:00:00',
        status: 'scheduled',
      });
      vi.mocked(mockStore.getLeadContact).mockResolvedValue({
        name: 'Maria',
        ghl_contact_id: 'ghl-1',
      });
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-ok',
        status: 'sent',
      });

      const result = await service.executeReminderCycle();

      expect(result.reminded).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockClient.getAppointments).not.toHaveBeenCalled();
    });
  });
});
