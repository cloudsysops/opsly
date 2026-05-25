---
type: governance
status: active
owner: operations
last_review: 2026-05-24
---

# Data Classification Matrix

Four tiers: P0 (highest risk) → P3 (public).

## Tiers

| Tier | Label | Description | Handling |
|------|-------|-------------|---------|
| **P0** | Critical / Minors | PII of children under 18; parental authorization required | AES-256 at rest + in transit; access restricted to service_role; retention ≤ 24 months inactive; DPIA required |
| **P1** | Confidential | PII of adult individuals (guardians, staff, customers) | Encrypted at rest; RLS enforced; logged access; retention policy per category |
| **P2** | Internal | Business data without PII (analytics aggregates, configs, logs) | Internal access only; no special encryption beyond transport |
| **P3** | Public | Marketing content, published documentation, pricing | No restrictions |

---

## Peskids — Data Inventory

| Field | Table | Tier | Legal basis (Ley 1581) | Retention | Notes |
|-------|-------|------|----------------------|-----------|-------|
| `full_name` (guardian) | `leads` | P1 | Autorización libre e informada | 24 months from last contact | Required for service |
| `email` (guardian) | `leads` | P1 | Autorización libre e informada | 24 months from last contact | |
| `phone` (guardian) | `leads` | P1 | Autorización libre e informada | 24 months | Optional |
| `neighborhood` | `leads` | P1 | Legítimo interés (coord. servicio) | 24 months | Location sensitivity — minimize if domicilio not requested |
| `grade_interested` (age range of child) | `leads` | P0 | Autorización parental expresa | 24 months | Indirect minor data |
| `parent.name`, `parent.email` | `parents` | P1 | Relación contractual | Duration of enrollment + 12 months | |
| `student.name`, `student.grade` | `students` | P0 | Autorización parental expresa | Duration of enrollment + 12 months | Minor PII |
| `student.date_of_birth` (if collected) | `students` | P0 | Autorización parental expresa | Duration of enrollment + 12 months | Minimize — use age range instead |
| Chat message content | `chat_sessions` / MCP | P1 | Autorización libre e informada | 90 days | May contain sensitive parenting questions |
| Webhook logs | `webhook_logs` | P2 | Legítimo interés operacional | 90 days | Strip PII before retention |
| Audit logs | `audit_log` | P2 | Obligación legal | 5 years | Tamper-evident |

---

## Opsly Platform — Data Inventory

| Field | Tier | Legal basis | Retention |
|-------|------|-------------|-----------|
| Tenant admin PII (name, email) | P1 | Relación contractual | Duration of contract + 36 months |
| End-user PII (via tenant apps) | P1 | Delegated — tenant is data controller | Per DPA agreement with tenant |
| Billing / Stripe customer data | P1 | Obligación contractual | 7 years (tax records) |
| API access logs | P2 | Legítimo interés (security) | 90 days rolling |
| Audit trail | P2 | Seguridad y cumplimiento | 5 years |
| Aggregated usage metrics | P3 | Legítimo interés (producto) | Indefinite (no PII) |

---

## Sub-processor data flows

See `docs/governance/SUB-PROCESSORS.md` for full list of where each tier flows.
