# Incident Response Policy

**Version:** 1.0 | **Effective:** 2026-05-25 | **Owner:** Cristian Botero  
**Review:** Annually | **Policy ID:** ops-incident-v1

---

## 1. Purpose

Establish a repeatable process for detecting, responding to, and learning from security incidents and personal data breaches affecting Opsly and Peskids.

## 2. Incident Classification

| Severity | Description | Example | Response SLA |
|----------|-------------|---------|-------------|
| P0 — Critical | Data breach confirmed, service down | RLS bypass exposing all tenant data | < 1 hour |
| P1 — High | Suspected breach, significant service degradation | Unauthorized API access, prod DB unreachable | < 4 hours |
| P2 — Medium | Security event, partial service impact | Leaked API key (rotated), single-tenant outage | < 24 hours |
| P3 — Low | Anomaly, no confirmed impact | Unusual login, spike in 4xx errors | < 72 hours |

## 3. Incident Response Phases

### 3.1 Detection & Triage (0–1 hour for P0/P1)
- Alert sources: Uptime Kuma, Discord #ops-alerts, Opsly Shield, manual report
- Acknowledge the alert; open incident channel in Discord: `#incident-YYYY-MM-DD`
- Assign severity; identify affected systems and data categories

### 3.2 Containment
- Isolate affected service (pause VPS container, revoke API key, enable maintenance mode)
- Preserve logs before rolling back or restarting: `docker logs <container> > incident-YYYYMMDD.log`
- Do NOT delete evidence

### 3.3 Eradication & Recovery
- Patch root cause or apply mitigation
- Rotate all potentially compromised credentials via Doppler
- Deploy to staging first, validate, then prod
- Resume normal operations; monitor for 24 hours

### 3.4 Notification

**Personal data breach (Peskids — Ley 1581 Colombia):**
- Notify SIC via Ventanilla Única (https://ventanilla.sic.gov.co/) within 15 business days
- Notify affected titulares via email within 15 business days if breach is likely to cause harm
- Record in `governance.breach_log`

**Personal data breach (Opsly — CCPA / contractual):**
- Notify affected tenants within 72 hours of confirmed breach
- Include: what data, when discovered, what was done, what the customer should do
- Record in `governance.breach_log`

### 3.5 Post-Incident Review
- Within 5 business days of resolution: post-mortem document in `docs/runbooks/postmortem-YYYYMMDD.md`
- Root cause analysis (5 Whys)
- Action items tracked in GitHub Issues

## 4. Runbooks

Existing runbooks that extend this policy:
- `docs/runbooks/INCIDENT-CONTAINMENT.md`
- `docs/runbooks/INCIDENT-RECOVERY.md`
- `docs/runbooks/INCIDENT-POSTMORTEM.md`

## 5. Communication Templates

**Customer breach notification template:**

> Subject: [Opsly] Security incident notification — [Date]
> 
> We are writing to inform you of a security incident that may have affected your account...
> [What happened] [What data was involved] [What we did] [What you should do]
> [Contact: security@opsly.io]
