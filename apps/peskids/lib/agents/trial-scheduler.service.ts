import type { GoHighLevelClient } from '@intcloudsysops/services';
import { resolveGoHighLevelPeskidsEnv } from '@intcloudsysops/services';
import { isPeskidsGhlEnabled } from '@intcloudsysops/services';
import {
  createSupabaseTrialSchedulingStore,
  slotPartsFromIso,
  type TrialSchedulingStore,
} from '@/lib/agents/trial-scheduling-store';

export const GOHIGHLEVEL_CALENDAR_API_VERSION = '2021-04-15';

export interface TrialSchedulingResult {
  scheduled: boolean;
  appointmentId?: string;
  calendarId?: string;
  slot?: { start: string; end: string };
  message?: string;
  manualSchedulingRequired?: boolean;
}

export interface TrialScheduleInput {
  leadId: string;
  parentName: string;
  preferredDay?: string;
  modality?: 'llanogrande' | 'domicilio';
  /** Legacy GHL contact id — optional messaging channel only */
  crmMessagingContactId?: string | null;
}

export interface TrialSchedulerDeps {
  store?: TrialSchedulingStore;
  ghlClient?: GoHighLevelClient | null;
  tenantId?: string;
  /** Opt-in legacy GHL Calendar API fallback when local slots are empty */
  ghlCalendarEnabled?: boolean;
  trialCalendarName?: string;
  baseUrl?: string;
  calendarApiVersion?: string;
}

interface GhlFreeSlot {
  start: string;
  end: string;
}

interface GhlCalendar {
  id: string;
  name: string;
}

/**
 * Schedules trial classes from Peskids/Supabase first.
 * GHL Calendar API is an optional fallback; GHL messaging only when a legacy contact id exists.
 */
export class TrialSchedulerService {
  private readonly store: TrialSchedulingStore;
  private readonly ghlClient: GoHighLevelClient | null;
  private readonly tenantId: string;
  private readonly ghlCalendarEnabled: boolean;
  private apiKey: string;
  private baseUrl: string;
  private locationId: string;
  private calendarApiVersion: string;
  private trialCalendarName: string;

  constructor(deps: TrialSchedulerDeps = {}) {
    this.store = deps.store ?? createSupabaseTrialSchedulingStore();
    this.ghlClient = deps.ghlClient ?? null;
    this.tenantId = deps.tenantId ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids';
    this.ghlCalendarEnabled =
      deps.ghlCalendarEnabled ?? (isPeskidsGhlEnabled() && Boolean(this.ghlClient));

    const env = resolveGoHighLevelPeskidsEnv();
    this.apiKey = env.apiKey;
    this.locationId = env.locationId;
    this.baseUrl = (deps.baseUrl ?? env.baseUrl ?? 'https://services.leadconnectorhq.com').replace(
      /\/$/,
      ''
    );
    this.calendarApiVersion =
      deps.calendarApiVersion ?? GOHIGHLEVEL_CALENDAR_API_VERSION;
    this.trialCalendarName = deps.trialCalendarName ?? 'Trial Class';
  }

  private async ghlCalendarFetch<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ ok: boolean; status: number; json: T }> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: this.calendarApiVersion,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json: T;
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = { raw: text } as T;
    }
    return { ok: response.ok, status: response.status, json };
  }

  private async resolveTrialCalendarId(): Promise<string | undefined> {
    if (!this.ghlCalendarEnabled || !this.ghlClient) {
      return undefined;
    }

    try {
      const response = await this.ghlCalendarFetch<{
        calendars?: GhlCalendar[];
      }>('GET', `/calendars/?locationId=${encodeURIComponent(this.locationId)}`);
      if (!response.ok) return undefined;
      const calendars = response.json.calendars ?? [];
      const trial = calendars.find(
        (c) => c.name === this.trialCalendarName || c.name.toLowerCase().includes('trial')
      );
      return trial?.id;
    } catch {
      return undefined;
    }
  }

  private generateLocalSlots(): Array<{ start: string; end: string }> {
    const slots: Array<{ start: string; end: string }> = [];
    const now = new Date();
    const cursor = new Date(now);

    if (cursor.getHours() >= 17) {
      cursor.setDate(cursor.getDate() + 1);
    }
    cursor.setHours(9, 0, 0, 0);

    while (slots.length < 14) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        for (let hour = 9; hour < 17 && slots.length < 14; hour++) {
          const start = new Date(cursor);
          start.setHours(hour, 0, 0, 0);
          const end = new Date(cursor);
          end.setHours(hour + 1, 0, 0, 0);
          if (start > now) {
            slots.push({
              start: start.toISOString(),
              end: end.toISOString(),
            });
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return slots;
  }

  private async filterSlotsByLocalCapacity(
    slots: Array<{ start: string; end: string }>
  ): Promise<Array<{ start: string; end: string }>> {
    const capacity = await this.store.getDefaultCapacity(this.tenantId);
    const available: Array<{ start: string; end: string }> = [];

    for (const slot of slots) {
      const { scheduledDate, scheduledTime } = slotPartsFromIso(slot.start);
      const booked = await this.store.countTrialsAtSlot(
        this.tenantId,
        scheduledDate,
        scheduledTime
      );
      if (booked < capacity) {
        available.push(slot);
      }
      if (available.length >= 5) break;
    }

    return available;
  }

  private async findGhlCalendarSlots(
    calendarId?: string
  ): Promise<Array<{ start: string; end: string }>> {
    const resolvedId = calendarId ?? (await this.resolveTrialCalendarId());
    if (!resolvedId) return [];

    try {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await this.ghlCalendarFetch<{
        freeSlots?: GhlFreeSlot[];
      }>(
        'GET',
        `/calendars/${resolvedId}/free-slots?locationId=${encodeURIComponent(this.locationId)}&startDate=${startDate}&endDate=${endDate}`
      );

      if (response.ok) {
        return (response.json.freeSlots ?? []).slice(0, 5);
      }
    } catch {
      return [];
    }

    return [];
  }

  /**
   * Returns the next available trial slots from local Supabase capacity first.
   * GHL Calendar API is only consulted when enabled and local capacity yields no slots.
   */
  async findAvailableSlots(calendarId?: string): Promise<Array<{ start: string; end: string }>> {
    const local = await this.filterSlotsByLocalCapacity(this.generateLocalSlots());
    if (local.length > 0) {
      return local;
    }

    if (this.ghlCalendarEnabled) {
      const ghlSlots = await this.findGhlCalendarSlots(calendarId);
      if (ghlSlots.length > 0) {
        return ghlSlots;
      }
    }

    return [];
  }

  async scheduleTrial(input: TrialScheduleInput): Promise<TrialSchedulingResult> {
    try {
      const existing = await this.store.findScheduledTrialForLead(input.leadId, this.tenantId);
      if (existing) {
        return {
          scheduled: true,
          appointmentId: existing.id,
          message: `Ya tienes una clase de prueba agendada para ${input.parentName}.`,
        };
      }

      const slots = await this.findAvailableSlots();
      const slot = input.preferredDay
        ? slots.find((s) => s.start.startsWith(input.preferredDay ?? '')) ?? slots[0]
        : slots[0];

      if (!slot) {
        await this.store.createPendingFollowup({
          tenantId: this.tenantId,
          leadId: input.leadId,
          type: 'call',
          notes:
            `Agendamiento manual de clase de prueba requerido para ${input.parentName}. ` +
            'No hay cupos locales disponibles en los próximos días.',
        });

        return {
          scheduled: false,
          manualSchedulingRequired: true,
          message:
            'No hay horarios automáticos disponibles. El equipo debe contactar a la familia para agendar manualmente.',
        };
      }

      const { scheduledDate, scheduledTime } = slotPartsFromIso(slot.start);
      const trial = await this.store.createLocalTrial({
        tenantId: this.tenantId,
        leadId: input.leadId,
        scheduledDate,
        scheduledTime,
        modality: input.modality ?? 'llanogrande',
        notes: 'Agendado automáticamente desde TrialSchedulerService',
      });

      const displayDate = this.formatDisplayDate(slot.start);
      const displayTime = this.formatDisplayTime(slot.start);
      const crmContactId = input.crmMessagingContactId?.trim() || null;

      if (crmContactId && this.ghlClient) {
        await this.sendConfirmation(crmContactId, input.parentName, displayDate, displayTime);
        await this.createReminderTask(
          crmContactId,
          input.parentName,
          displayDate,
          displayTime,
          slot.start
        );
      }

      return {
        scheduled: true,
        appointmentId: trial.id,
        slot,
        message: `Clase de prueba agendada para ${displayDate} a las ${displayTime}.`,
      };
    } catch (err) {
      return {
        scheduled: false,
        message: `Error al agendar: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async sendConfirmation(
    contactId: string,
    parentName: string,
    date: string,
    time: string
  ): Promise<void> {
    if (!this.ghlClient) return;

    const message = `Hola ${parentName}! Tu clase de prueba en Peskids ha sido agendada para el ${date} a las ${time}. Te esperamos!`;
    try {
      await this.ghlClient.sendMessage({
        contactId,
        message,
        channel: 'sms',
      });
    } catch {
      // non-blocking: confirmation best-effort
    }
  }

  private async createReminderTask(
    contactId: string,
    parentName: string,
    date: string,
    time: string,
    startIso: string
  ): Promise<void> {
    if (!this.ghlClient) return;

    const reminderDate = new Date(new Date(startIso).getTime() - 24 * 60 * 60 * 1000).toISOString();

    await this.ghlClient.createTask({
      title: 'Recordatorio clase de prueba — 24h antes',
      description: `Enviar recordatorio a ${parentName} sobre su clase de prueba del ${date} a las ${time}.`,
      contactId,
      dueDate: reminderDate,
      priority: 'high',
    });
  }

  /** Send 24h reminder for a local trial class id. */
  async sendReminder(trialClassId: string): Promise<boolean> {
    try {
      const appointment = await this.store.findTrialById(trialClassId, this.tenantId);
      if (!appointment) return false;

      const lead = await this.store.getLeadContact(appointment.lead_id, this.tenantId);
      if (!lead) return false;

      const parentName = lead.name || 'familia';
      const startIso = `${appointment.scheduled_date}T${appointment.scheduled_time}`;
      const date = this.formatDisplayDate(startIso);
      const time = this.formatDisplayTime(startIso);
      const message = `Recordatorio Peskids: ${parentName}, tu clase de prueba es mañana ${date} a las ${time}. Te esperamos!`;

      const crmContactId = lead.ghl_contact_id?.trim() || null;
      if (!crmContactId || !this.ghlClient) {
        await this.store.createPendingFollowup({
          tenantId: this.tenantId,
          leadId: appointment.lead_id,
          type: 'sms',
          notes: `Recordatorio manual requerido: ${message}`,
        });
        return false;
      }

      await this.ghlClient.sendMessage({
        contactId: crmContactId,
        message,
        channel: 'sms',
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Process upcoming local trial classes and send reminders when possible. */
  async executeReminderCycle(): Promise<{ reminded: number; failed: number }> {
    const result = { reminded: 0, failed: 0 };
    try {
      const upcoming = await this.store.listUpcomingTrials(this.tenantId, 24);

      for (const trial of upcoming) {
        const ok = await this.sendReminder(trial.id);
        if (ok) result.reminded++;
        else result.failed++;
      }
    } catch {
      result.failed++;
    }
    return result;
  }

  private formatDisplayDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
    });
  }

  private formatDisplayTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
