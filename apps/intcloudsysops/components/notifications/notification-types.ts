// Shared notification types — used by bell and preferences components

export type NotificationType =
  | 'submission_reviewed'
  | 'submission_observation'
  | 'submission_reassigned'
  | 'followup_due'
  | 'weekly_report';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  inapp_enabled: boolean;
  events: string[];
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkReadResponse {
  updated: number;
}

export const EVENT_LABELS: Record<string, string> = {
  submission_reviewed: 'Entrega revisada',
  submission_observation: 'Observaciones de docente',
  submission_reassigned: 'Entrega reasignada',
  followup_due: 'Recordatorio de seguimiento',
  weekly_report: 'Reporte semanal',
};

export const ALL_EVENT_TYPES: string[] = [
  'submission_reviewed',
  'submission_observation',
  'submission_reassigned',
  'followup_due',
  'weekly_report',
];
