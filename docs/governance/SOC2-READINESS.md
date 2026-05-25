# SOC 2 Readiness Assessment — Opsly

**Assessment date:** 2026-05-25  
**Scope:** Opsly Platform (multi-tenant SaaS)  
**Trust Service Criteria:** Security (CC) + Availability (A) — Type II target  
**Assessor:** Self-assessment (pre-audit)  
**Target certification:** Q4 2026  

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Present and documented |
| 🔶 | Partial — in place but not formally documented |
| ❌ | Missing — needs to be implemented |

---

## Common Criteria (CC) — Security

### CC1 — Control Environment

| Criteria | Status | Notes |
|----------|--------|-------|
| CC1.1 COSO principle: commitment to competence | 🔶 | No formal org chart; solo founder |
| CC1.2 Board oversight of internal controls | ❌ | No board; founder oversight only |
| CC1.3 Management's philosophy and operating style | 🔶 | Documented in VISION.md |
| CC1.4 Org structure and reporting | ❌ | No formal org structure doc |
| CC1.5 Commitment to attract/retain/develop competent individuals | ❌ | No HR policy; see docs/governance/internal/ |

### CC2 — Communication & Information

| Criteria | Status | Notes |
|----------|--------|-------|
| CC2.1 Information quality objectives | 🔶 | Implicit in AGENTS.md |
| CC2.2 Internal communication of control responsibilities | 🔶 | CLAUDE.md, AGENTS.md |
| CC2.3 External communication with customers | 🔶 | Legal pages published (Phase 2); no trust page yet |

### CC3 — Risk Assessment

| Criteria | Status | Notes |
|----------|--------|-------|
| CC3.1 Risk identification objectives | 🔶 | Security runbooks, SECURITY.md |
| CC3.2 Risk identification process | ❌ | No formal risk register |
| CC3.3 Fraud risk assessment | ❌ | Not documented |
| CC3.4 Change management risk identification | 🔶 | PR review required; see GIT-WORKFLOW.md |

### CC4 — Monitoring Activities

| Criteria | Status | Notes |
|----------|--------|-------|
| CC4.1 Ongoing and separate evaluations | 🔶 | Uptime monitoring; no formal control evaluation |
| CC4.2 Evaluate and communicate deficiencies | 🔶 | Discord alerts; no formal deficiency tracking |

### CC5 — Control Activities

| Criteria | Status | Notes |
|----------|--------|-------|
| CC5.1 Select and develop control activities | 🔶 | RLS policies, audit logs, rate limiting |
| CC5.2 Technology controls | ✅ | Supabase RLS, Doppler secrets, audit trail (0016_audit_trail.sql) |
| CC5.3 Deploy controls through policies | 🔶 | CLAUDE.md has absolute rules; no formal policy docs |

### CC6 — Logical and Physical Access

| Criteria | Status | Notes |
|----------|--------|-------|
| CC6.1 Logical access security measures | ✅ | Supabase Auth + JWT, RBAC via app_metadata |
| CC6.2 Prior to issuing system credentials | 🔶 | Tenant invitations system; no formal access provisioning doc |
| CC6.3 Access based on authorized need | ✅ | Multi-tenant RLS; service_role only in API |
| CC6.4 Access restricted to authorized users | ✅ | Portal auth guards; admin requires platform_admin role |
| CC6.5 Access modifications on job change | ❌ | No offboarding runbook |
| CC6.6 Access from outside the entity | 🔶 | Tailscale VPN for VPS; SSH key-only |
| CC6.7 Transmission integrity and confidentiality | ✅ | HTTPS enforced (Vercel + Cloudflare) |
| CC6.8 Data assets against unauthorized access | ✅ | Encryption at rest (Supabase), transit (TLS 1.3) |

### CC7 — System Operations

| Criteria | Status | Notes |
|----------|--------|-------|
| CC7.1 Detect and monitor vulnerabilities | 🔶 | Opsly Shield secret scanning; no CVE feed |
| CC7.2 Monitor infrastructure for anomalies | 🔶 | Uptime Kuma; no SIEM |
| CC7.3 Evaluate identified anomalies | 🔶 | Discord alerts; no formal escalation process |
| CC7.4 Respond to identified security incidents | 🔶 | INCIDENT runbooks exist; see docs/runbooks/ |
| CC7.5 Identify and disclose disclosure breaches | 🔶 | governance.breach_log table; notification workflow TBD |

### CC8 — Change Management

| Criteria | Status | Notes |
|----------|--------|-------|
| CC8.1 Authorize, design, develop, test, approve changes | 🔶 | PR workflow + pre-commit hooks; no formal CAB |

### CC9 — Risk Mitigation

| Criteria | Status | Notes |
|----------|--------|-------|
| CC9.1 Risk mitigation activities | 🔶 | Vendor DPAs needed; see SUB-PROCESSORS.md |
| CC9.2 Business disruption risks | ❌ | No formal BCP/DR plan |

---

## Availability (A) Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| A1.1 Availability commitments and service agreements | 🔶 | SLA page drafted (Phase 2); uptime targets TBD |
| A1.2 Availability performance metrics | 🔶 | Uptime Kuma tracks uptime; no formal SLA reporting |
| A1.3 Address risks to availability | 🔶 | Multi-region Supabase; Vercel edge; no DR runbook |

---

## Gap Summary

| Priority | Gap | Owner | Target |
|----------|-----|-------|--------|
| P0 | Formal risk register | Cristian | Q3 2026 |
| P0 | Business continuity / DR plan | Cristian | Q3 2026 |
| P0 | Employee lifecycle policy (offboarding) | Cristian | Q3 2026 |
| P1 | Vendor DPA collection (see SUB-PROCESSORS.md) | Cristian | Q3 2026 |
| P1 | Breach notification workflow (automate discord alert) | Engineering | Q3 2026 |
| P1 | Formal SLA metrics / reporting | Engineering | Q3 2026 |
| P2 | External penetration test | External vendor | Q4 2026 |
| P2 | SIEM / log aggregation | Engineering | Q4 2026 |
| P3 | Board or advisory oversight documentation | Cristian | Q4 2026 |

---

## Next Steps Toward Certification

1. **Engage audit firm** (Prescient Assurance, Johanson Group, or Schellman) for Type I pre-assessment
2. **Complete P0 gaps** (risk register, BCP, offboarding policy)
3. **Collect vendor DPAs** for all 9 Opsly sub-processors
4. **12-month evidence collection window** begins after controls are in place
5. **Type I audit** (point-in-time): target Q1 2027
6. **Type II audit** (12-month period): target Q4 2027
