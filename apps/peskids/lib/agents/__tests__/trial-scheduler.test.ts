import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  TrialSchedulerService,
  GOHIGHLEVEL_CALENDAR_API_VERSION,
} from '../trial-scheduler.service';
import type { GoHighLevelClient } from '@intcloudsysops/services/gohighlevel';
import type { Mock } from 'vitest';

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

function mockSuccessResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockErrorResponse(status = 500, message = 'API error'): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TrialSchedulerService', () => {
  let mockClient: GoHighLevelClient;
  let service: TrialSchedulerService;
  let fetchSpy: Mock;

  beforeEach(() => {
    mockClient = createMockClient();
    service = new TrialSchedulerService(mockClient, {
      baseUrl: 'https://services.leadconnectorhq.com',
      calendarApiVersion: GOHIGHLEVEL_CALENDAR_API_VERSION,
    });
    fetchSpy = vi.spyOn(globalThis, 'fetch') as unknown as Mock;
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
    it('returns slots from GHL Calendar API when available', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockSuccessResponse({
            calendars: [
              { id: 'cal-1', name: 'Trial Class' },
              { id: 'cal-2', name: 'Assessment' },
            ],
          })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({
            freeSlots: [
              { start: '2026-06-05T14:00:00Z', end: '2026-06-05T15:00:00Z' },
              { start: '2026-06-06T10:00:00Z', end: '2026-06-06T11:00:00Z' },
            ],
          })
        );

      const slots = await service.findAvailableSlots();

      expect(slots).toHaveLength(2);
      expect(slots[0].start).toBe('2026-06-05T14:00:00Z');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('falls back to generated slots when Calendar API returns empty', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockSuccessResponse({ calendars: [{ id: 'cal-1', name: 'Trial Class' }] })
        )
        .mockResolvedValueOnce(mockSuccessResponse({ freeSlots: [] }));

      const slots = await service.findAvailableSlots();
      expect(slots.length).toBeGreaterThanOrEqual(1);
      expect(slots.length).toBeLessThanOrEqual(5);
    });

    it('falls back to generated slots when Calendar API is unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const slots = await service.findAvailableSlots();
      expect(slots.length).toBeGreaterThanOrEqual(1);
      expect(slots.length).toBeLessThanOrEqual(5);
    });

    it('falls back to generated slots when no Trial Class calendar found', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockSuccessResponse({ calendars: [{ id: 'cal-2', name: 'Assessment' }] })
      );

      const slots = await service.findAvailableSlots();
      expect(slots.length).toBeGreaterThanOrEqual(1);
    });

    it('returns only weekday slots in generated fallback', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const slots = await service.findAvailableSlots();
      for (const slot of slots) {
        const day = new Date(slot.start).getDay();
        expect(day).not.toBe(0); // not Sunday
        expect(day).not.toBe(6); // not Saturday
      }
    });

    it('returns at most 5 slots', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const slots = await service.findAvailableSlots();
      expect(slots.length).toBeLessThanOrEqual(5);
    });

    it('returns generated slots when Calendar API returns 500', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockSuccessResponse({ calendars: [{ id: 'cal-1', name: 'Trial Class' }] })
        )
        .mockResolvedValueOnce(mockErrorResponse(500));

      const slots = await service.findAvailableSlots();
      expect(slots.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('scheduleTrial', () => {
    it('returns existing appointment without double-booking', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([
        {
          id: 'apt-existing',
          title: 'Trial Class — Test',
          startTime: '2026-06-10T14:00:00Z',
          endTime: '2026-06-10T15:00:00Z',
          contactId: 'contact-1',
          status: 'scheduled',
        },
      ]);

      const result = await service.scheduleTrial('contact-1', 'Maria');

      expect(result.scheduled).toBe(true);
      expect(result.appointmentId).toBe('apt-existing');
      expect(result.message).toContain('Ya tienes');
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('schedules and confirms when no existing appointment', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([]);
      vi.mocked(mockClient.getContact).mockResolvedValue({
        id: 'contact-1',
        name: 'Maria Rodriguez',
        firstName: 'Maria',
      });

      fetchSpy
        .mockResolvedValueOnce(
          mockSuccessResponse({ calendars: [{ id: 'cal-1', name: 'Trial Class' }] })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({
            freeSlots: [
              { start: '2026-06-10T14:00:00Z', end: '2026-06-10T15:00:00Z' },
            ],
          })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({
            appointment: { id: 'apt-new' },
          })
        );

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

      const result = await service.scheduleTrial('contact-1', 'Maria');

      expect(result.scheduled).toBe(true);
      expect(result.appointmentId).toBe('apt-new');
      expect(result.slot).toBeDefined();
      expect(result.message).toContain('agendada');

      // Confirmation sent
      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        contactId: 'contact-1',
        message: expect.stringContaining('Maria'),
        channel: 'sms',
      });

      // Reminder task created
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Recordatorio'),
          contactId: 'contact-1',
          priority: 'high',
        })
      );
    });

    it('respects preferredDay when filtering slots', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([]);
      vi.mocked(mockClient.getContact).mockResolvedValue({
        id: 'contact-1',
        name: 'Pedro',
      });

      fetchSpy
        .mockResolvedValueOnce(
          mockSuccessResponse({ calendars: [{ id: 'cal-1', name: 'Trial Class' }] })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({
            freeSlots: [
              { start: '2026-06-10T14:00:00Z', end: '2026-06-10T15:00:00Z' },
              { start: '2026-06-11T10:00:00Z', end: '2026-06-11T11:00:00Z' },
            ],
          })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({ appointment: { id: 'apt-3' } })
        );

      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-ok',
        status: 'sent',
      });
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-2',
        title: '',
        status: 'open',
        priority: 'high',
      });

      const result = await service.scheduleTrial(
        'contact-1',
        'Pedro',
        '2026-06-11'
      );

      expect(result.scheduled).toBe(true);
      expect(result.slot?.start).toContain('2026-06-11');
    });

    it('uses fallback slots when Calendar API has no calendars', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([]);

      fetchSpy
        .mockResolvedValueOnce(mockSuccessResponse({ calendars: [] }))
        .mockResolvedValueOnce(
          mockSuccessResponse({ appointment: { id: 'apt-fallback' } })
        );

      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-fb',
        status: 'sent',
      });
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-fb',
        title: '',
        status: 'open',
        priority: 'high',
      });

      const result = await service.scheduleTrial('contact-1', 'Ana');

      expect(result.scheduled).toBe(true);
      expect(result.slot).toBeDefined();
      expect(result.message).toContain('agendada');
    });

    it('handles GHL API failure during appointment read gracefully', async () => {
      vi.mocked(mockClient.getAppointments).mockRejectedValue(
        new Error('GHL API unavailable')
      );

      const result = await service.scheduleTrial('contact-1', 'Luis');

      expect(result.scheduled).toBe(false);
      expect(result.message).toContain('Error');
    });

    it('confirmation send failure is non-blocking', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([]);
      vi.mocked(mockClient.getContact).mockResolvedValue({
        id: 'contact-1',
        name: 'Sofia',
      });

      fetchSpy
        .mockResolvedValueOnce(
          mockSuccessResponse({ calendars: [{ id: 'cal-1', name: 'Trial Class' }] })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({
            freeSlots: [
              { start: '2026-06-12T14:00:00Z', end: '2026-06-12T15:00:00Z' },
            ],
          })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({ appointment: { id: 'apt-4' } })
        );

      vi.mocked(mockClient.sendMessage).mockRejectedValue(
        new Error('Send failed')
      );
      vi.mocked(mockClient.createTask).mockResolvedValue({
        id: 'task-3',
        title: '',
        status: 'open',
        priority: 'high',
      });

      const result = await service.scheduleTrial('contact-1', 'Sofia');

      expect(result.scheduled).toBe(true);
      expect(result.appointmentId).toBe('apt-4');
      expect(result.message).toContain('agendada');
    });
  });

  describe('sendReminder', () => {
    it('sends reminder for a valid upcoming appointment', async () => {
      const tomorrow = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      vi.mocked(mockClient.getAppointments).mockResolvedValue([
        {
          id: 'apt-remind',
          title: 'Trial Class',
          startTime: tomorrow,
          endTime: new Date(
            Date.now() + 25 * 60 * 60 * 1000
          ).toISOString(),
          contactId: 'contact-1',
          status: 'scheduled',
        },
      ]);
      vi.mocked(mockClient.getContact).mockResolvedValue({
        id: 'contact-1',
        name: 'Carlos',
      });
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-remind',
        status: 'sent',
      });

      const ok = await service.sendReminder('apt-remind');

      expect(ok).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 'contact-1',
          channel: 'sms',
        })
      );
    });

    it('returns false when appointment not found', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([]);
      const ok = await service.sendReminder('apt-nonexistent');
      expect(ok).toBe(false);
    });

    it('returns false when appointment has no contactId', async () => {
      vi.mocked(mockClient.getAppointments).mockResolvedValue([
        {
          id: 'apt-no-contact',
          title: 'Trial Class',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          status: 'scheduled',
        },
      ]);
      const ok = await service.sendReminder('apt-no-contact');
      expect(ok).toBe(false);
    });

    it('returns false when sendMessage fails', async () => {
      const tomorrow = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      vi.mocked(mockClient.getAppointments).mockResolvedValue([
        {
          id: 'apt-fail',
          title: 'Trial Class',
          startTime: tomorrow,
          endTime: new Date(
            Date.now() + 25 * 60 * 60 * 1000
          ).toISOString(),
          contactId: 'contact-1',
          status: 'scheduled',
        },
      ]);
      vi.mocked(mockClient.getContact).mockResolvedValue({
        id: 'contact-1',
        name: 'Ana',
      });
      vi.mocked(mockClient.sendMessage).mockRejectedValue(
        new Error('GHL down')
      );

      const ok = await service.sendReminder('apt-fail');
      expect(ok).toBe(false);
    });
  });

  describe('executeReminderCycle', () => {
    it('sends reminders for all upcoming trial appointments', async () => {
      const now = new Date();
      const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
      const in12h = new Date(
        now.getTime() + 12 * 60 * 60 * 1000
      ).toISOString();

      vi.mocked(mockClient.getAppointments).mockResolvedValue([
        {
          id: 'apt-1',
          title: 'Trial Class — Maria',
          startTime: in6h,
          endTime: new Date(
            now.getTime() + 7 * 60 * 60 * 1000
          ).toISOString(),
          contactId: 'contact-1',
          status: 'scheduled',
        },
        {
          id: 'apt-2',
          title: 'Trial Class — Pedro',
          startTime: in12h,
          endTime: new Date(
            now.getTime() + 13 * 60 * 60 * 1000
          ).toISOString(),
          contactId: 'contact-2',
          status: 'scheduled',
        },
      ]);

      vi.mocked(mockClient.getContact).mockResolvedValueOnce({
        id: 'contact-1',
        name: 'Maria',
      });
      vi.mocked(mockClient.getContact).mockResolvedValueOnce({
        id: 'contact-2',
        name: 'Pedro',
      });
      vi.mocked(mockClient.sendMessage).mockResolvedValue({
        id: 'msg-ok',
        status: 'sent',
      });

      const result = await service.executeReminderCycle();

      expect(result.reminded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('skips appointments that are not trial classes', async () => {
      const now = new Date();
      const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

      vi.mocked(mockClient.getAppointments).mockResolvedValue([
        {
          id: 'apt-non-trial',
          title: 'Assessment',
          startTime: in6h,
          endTime: new Date(
            now.getTime() + 7 * 60 * 60 * 1000
          ).toISOString(),
          contactId: 'contact-1',
          status: 'scheduled',
        },
      ]);

      const result = await service.executeReminderCycle();
      expect(result.reminded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('handles total API failure gracefully', async () => {
      vi.mocked(mockClient.getAppointments).mockRejectedValue(
        new Error('GHL completely down')
      );

      const result = await service.executeReminderCycle();
      expect(result.reminded).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});
