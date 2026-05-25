---
type: governance
status: active
owner: operations
last_review: 2026-05-24
---

# Policy Registry

Single index of all published and draft policies across Peskids and Opsly.

## How to update

1. Create or update the policy file under `docs/legal/{tenant}/`.
2. Add a row here with the new version and effective date.
3. Bump `version` field in the policy's frontmatter.
4. PR → `main` triggers re-render of legal pages.

---

## Peskids

| Policy ID | Title | Version | Status | Effective | Source |
|-----------|-------|---------|--------|-----------|--------|
| `pk-privacy-v1` | Política de Privacidad y Tratamiento de Datos | 1.0 | published | 2026-05-24 | `docs/legal/peskids/privacy.md` |
| `pk-terms-v1` | Términos y Condiciones de Uso | 1.0 | published | 2026-05-24 | `docs/legal/peskids/terms.md` |
| `pk-parental-v1` | Aviso y Autorización Parental | 1.0 | published | 2026-05-24 | `docs/legal/peskids/aviso-parental.md` |
| `pk-cookies-v1` | Política de Cookies y Almacenamiento Local | 1.0 | published | 2026-05-24 | `docs/legal/peskids/cookies.md` |
| `pk-dsar-v1` | Derechos del Titular (DSAR) | 1.0 | published | 2026-05-24 | `docs/legal/peskids/dsar.md` |

## Opsly Platform

| Policy ID | Title | Version | Status | Effective | Source |
|-----------|-------|---------|--------|-----------|--------|
| `ops-privacy-v1` | Privacy Policy / Política de Privacidad | 1.0 | draft | — | `docs/legal/opsly/privacy.md` |
| `ops-terms-v1` | Master Services Agreement | 1.0 | draft | — | `docs/legal/opsly/terms.md` |
| `ops-aup-v1` | Acceptable Use Policy | 1.0 | draft | — | `docs/legal/opsly/aup.md` |
| `ops-dpa-v1` | Data Processing Addendum | 1.0 | draft | — | `docs/legal/opsly/dpa.md` |
| `ops-sla-v1` | Service Level Agreement | 1.0 | draft | — | `docs/legal/opsly/sla.md` |
| `ops-cookies-v1` | Cookie Policy | 1.0 | draft | — | `docs/legal/opsly/cookies.md` |

---

## Consent versions tracked in DB

The `governance.consents` table (Fase 3) links `policy_id + version` from this registry
to each consent record, enabling rollback, re-consent on policy changes, and DSAR exports.
