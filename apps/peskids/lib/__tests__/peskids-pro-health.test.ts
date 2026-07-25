import { describe, expect, it } from 'vitest';
import { buildPeskidsProObservability } from '../observability/peskids-pro-health';

describe('buildPeskidsProObservability', () => {
  it('reports flags off and bus missing by default', () => {
    const snapshot = buildPeskidsProObservability({});
    expect(snapshot.event_bus_configured).toBe(false);
    expect(snapshot.contact_sla_hours).toBe(48);
    expect(snapshot.flags.hot_lead_alerts).toBe(false);
    expect(snapshot.flags.daily_digest).toBe(false);
    expect(snapshot.flags.auto_create_followup).toBe(false);
    expect(snapshot.flags.lead_confirmation).toBe(false);
    expect(snapshot.flags.family_access_email).toBe(false);
    expect(snapshot.flags.attendance_risk_alert).toBe(false);
    expect(snapshot.attendance_risk_threshold).toBe(3);
  });

  it('detects configured event bus and enabled flags without exposing values', () => {
    const snapshot = buildPeskidsProObservability({
      OPSLY_EVENT_BUS_URL: 'https://example.invalid/events',
      PESKIDS_HOT_LEAD_ALERTS_ENABLED: 'true',
      PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED: '1',
      PESKIDS_LEAD_CONFIRMATION_ENABLED: 'true',
      PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED: 'true',
      PESKIDS_CONTACT_SLA_HOURS: '24',
      PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED: 'true',
      PESKIDS_ATTENDANCE_RISK_THRESHOLD: '4',
    });
    expect(snapshot.event_bus_configured).toBe(true);
    expect(snapshot.contact_sla_hours).toBe(24);
    expect(snapshot.flags.hot_lead_alerts).toBe(true);
    expect(snapshot.flags.auto_create_followup).toBe(true);
    expect(snapshot.flags.lead_confirmation).toBe(true);
    expect(snapshot.flags.family_access_email).toBe(true);
    expect(snapshot.flags.attendance_risk_alert).toBe(true);
    expect(snapshot.attendance_risk_threshold).toBe(4);
    expect(JSON.stringify(snapshot)).not.toContain('example.invalid');
  });
});
