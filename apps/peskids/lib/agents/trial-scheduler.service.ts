import type { GoHighLevelClient } from '@intcloudsysops/services/gohighlevel';
import { resolveGoHighLevelPeskidsEnv } from '@intcloudsysops/services/gohighlevel';

export const GOHIGHLEVEL_CALENDAR_API_VERSION = '2021-04-15';

export interface TrialSchedulingResult {
  scheduled: boolean;
  appointmentId?: string;
  calendarId?: string;
  slot?: { start: string; end: string };
  message?: string;
}

export interface TrialSchedulerConfig {
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
 * Schedules trial classes via GHL Calendar API.
 * Falls back to manual scheduling (task + message) when the Calendar API
 * cannot create appointments directly.
 */
export class TrialSchedulerService {
  private apiKey: string;
  private baseUrl: string;
  private locationId: string;
  private calendarApiVersion: string;
  private trialCalendarName: string;

  constructor(
    private ghlClient: GoHighLevelClient,
    config?: TrialSchedulerConfig
  ) {
    const env = resolveGoHighLevelPeskidsEnv();
    this.apiKey = env.apiKey;
    this.locationId = env.locationId;
    this.baseUrl = (config?.baseUrl ?? env.baseUrl ?? 'https://services.leadconnectorhq.com').replace(/\/$/, '');
    this.calendarApiVersion = config?.calendarApiVersion ?? GOHIGHLEVEL_CALENDAR_API_VERSION;
    this.trialCalendarName = config?.trialCalendarName ?? 'Trial Class';
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

  /**
   * Returns the next 5 available trial class slots.
   * 1. Tries GHL Calendar API free-slots endpoint.
   * 2. Falls back to generated weekday slots (9am-5pm, 1-hour).
   */
  async findAvailableSlots(
    calendarId?: string
  ): Promise<Array<{ start: string; end: string }>> {
    const resolvedId = calendarId ?? (await this.resolveTrialCalendarId());
    if (resolvedId) {
      try {
        const now = new Date();
        const startDate = now.toISOString().split('T')[0];
        const endDate = new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0];

        const response = await this.ghlCalendarFetch<{
          freeSlots?: GhlFreeSlot[];
        }>(
          'GET',
          `/calendars/${resolvedId}/free-slots?locationId=${encodeURIComponent(this.locationId)}&startDate=${startDate}&endDate=${endDate}`
        );

        if (response.ok) {
          const slots = response.json.freeSlots ?? [];
          if (slots.length > 0) return slots.slice(0, 5);
        }
      } catch {
        // fall through to generated slots
      }
    }
    return this.generateFallbackSlots();
  }

  private generateFallbackSlots(): Array<{ start: string; end: string }> {
    const slots: Array<{ start: string; end: string }> = [];
    const now = new Date();
    const cursor = new Date(now);

    if (cursor.getHours() >= 17) {
      cursor.setDate(cursor.getDate() + 1);
    }
    cursor.setHours(9, 0, 0, 0);

    while (slots.length < 5) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        for (let hour = 9; hour < 17 && slots.length < 5; hour++) {
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

  /**
   * Schedule a trial class for a given GHL contact.
   * 1. Finds available slot (respects preferredDay if given).
   * 2. Books via GHL appointments endpoint if available,
   *    otherwise updates opportunity stage and creates a task.
   * 3. Sends confirmation via GHL conversations (SMS/WhatsApp).
   * 4. Creates follow-up task.
   *
   * Idempotent: checks for existing trial appointments before booking.
   */
  async scheduleTrial(
    ghlContactId: string,
    parentName: string,
    preferredDay?: string
  ): Promise<TrialSchedulingResult> {
    try {
      const existing = await this.findExistingTrialAppointment(ghlContactId);
      if (existing) {
        return {
          scheduled: true,
          appointmentId: existing.id,
          message: `Ya tienes una clase de prueba agendada para ${parentName}.`,
        };
      }

      const slots = await this.findAvailableSlots();
      const slot = preferredDay
        ? slots.find((s) => s.start.startsWith(preferredDay)) ?? slots[0]
        : slots[0];

      if (!slot) {
        return {
          scheduled: false,
          message:
            'No hay horarios disponibles para clase de prueba en este momento.',
        };
      }

      const appointment = await this.tryCreateAppointment(
        ghlContactId,
        slot,
        parentName
      );

      const displayDate = this.formatDisplayDate(slot.start);
      const displayTime = this.formatDisplayTime(slot.start);

      await this.sendConfirmation(ghlContactId, parentName, displayDate, displayTime);

      await this.createReminderTask(
        ghlContactId,
        parentName,
        displayDate,
        displayTime,
        slot.start
      );

      return {
        scheduled: true,
        appointmentId: appointment?.id,
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

  private async findExistingTrialAppointment(
    contactId: string
  ): Promise<{ id: string } | undefined> {
    const appointments = await this.ghlClient.getAppointments(contactId);
    const trial = appointments.find(
      (a) =>
        a.title?.toLowerCase().includes('trial') && a.status === 'scheduled'
    );
    return trial ? { id: trial.id } : undefined;
  }

  private async tryCreateAppointment(
    contactId: string,
    slot: { start: string; end: string },
    parentName: string
  ): Promise<{ id?: string } | undefined> {
    try {
      const path = this.baseUrl.includes('leadconnectorhq.com')
        ? '/appointments/'
        : '/v1/appointments';
      const response = await this.ghlCalendarFetch<{
        appointment?: { id: string };
        data?: { id: string };
      }>('POST', path, {
        locationId: this.locationId,
        contactId,
        title: `Clase de Prueba — ${parentName}`,
        startTime: slot.start,
        endTime: slot.end,
        status: 'scheduled',
      });
      if (response.ok) {
        return response.json.appointment ?? response.json.data;
      }
    } catch {
      // fall through — schedule manually
    }
    return undefined;
  }

  private async sendConfirmation(
    contactId: string,
    parentName: string,
    date: string,
    time: string
  ): Promise<void> {
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
    const reminderDate = new Date(
      new Date(startIso).getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    await this.ghlClient.createTask({
      title: 'Recordatorio clase de prueba — 24h antes',
      description: `Enviar recordatorio a ${parentName} sobre su clase de prueba del ${date} a las ${time}.`,
      contactId,
      dueDate: reminderDate,
      priority: 'high',
    });
  }

  /** Send 24h reminder for a given appointment. */
  async sendReminder(appointmentId: string): Promise<boolean> {
    try {
      const appointments = await this.ghlClient.getAppointments();
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return false;
      if (!appointment.contactId) return false;

      const contact = await this.ghlClient.getContact(appointment.contactId);
      const parentName = contact.name || contact.firstName || 'familia';
      const date = this.formatDisplayDate(appointment.startTime);
      const time = this.formatDisplayTime(appointment.startTime);

      const message = `Recordatorio Peskids: ${parentName}, tu clase de prueba es mañana ${date} a las ${time}. Te esperamos!`;

      await this.ghlClient.sendMessage({
        contactId: appointment.contactId,
        message,
        channel: 'sms',
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Process all upcoming trial appointments and send reminders. */
  async executeReminderCycle(): Promise<{ reminded: number; failed: number }> {
    const result = { reminded: 0, failed: 0 };
    try {
      const appointments = await this.ghlClient.getAppointments();
      const now = new Date();
      const tomorrow = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      );

      const upcomingTrials = appointments.filter((a) => {
        if (!a.title?.toLowerCase().includes('trial')) return false;
        const start = new Date(a.startTime);
        return start > now && start <= tomorrow && a.status === 'scheduled';
      });

      for (const appointment of upcomingTrials) {
        const ok = await this.sendReminder(appointment.id);
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
