# Vendor Management Policy

**Version:** 1.0 | **Effective:** 2026-05-25 | **Owner:** Cristian Botero  
**Review:** Annually | **Policy ID:** ops-vendor-v1

---

## 1. Purpose

Define requirements for onboarding, monitoring, and offboarding third-party vendors and sub-processors that handle Opsly or Peskids customer data.

## 2. Vendor Tiers

| Tier | Criteria | Review Frequency |
|------|----------|-----------------|
| Critical | Processes PII or provides auth/payments | Annual + on incident |
| Standard | Provides supporting services (monitoring, CI) | Annual |
| Low risk | No customer data (analytics, docs tools) | Bi-annual |

## 3. Onboarding Requirements

Before adding a new vendor that processes personal data:

1. **Risk assessment:** Document in a GitHub issue
2. **DPA review:** Obtain and review vendor's Data Processing Agreement
3. **SUB-PROCESSORS.md:** Add vendor with legal name, jurisdiction, data transferred, DPA URL
4. **Customer notice:** Update legal pages (Privacy Policy, Sub-Processors list) before go-live
5. **Security review:** Verify SOC 2 Type II or ISO 27001 certification; if absent, document risk

## 4. DPA Requirements

All critical vendors must have a signed DPA before processing data. Key clauses required:
- Processing only on documented instructions
- Confidentiality obligations
- Sub-processor notification
- Data return/deletion on termination
- Audit rights

## 5. Current Sub-Processor Status

See `docs/governance/SUB-PROCESSORS.md` for current inventory.

**Pending DPAs (priority):**
- [ ] Jelou — DPA required (processes Peskids minor data via WhatsApp)
- [ ] Anthropic — DPA review required (AI processing of chat data; verify no training use)

## 6. Vendor Offboarding

When removing a vendor:
1. Revoke API keys/access (via Doppler)
2. Request data deletion confirmation in writing
3. Update SUB-PROCESSORS.md and Privacy Policy within 5 business days
4. Archive the vendor's DPA in `docs/governance/vendor-dpas/`

## 7. Annual Review

Each year: re-verify all critical vendors' security certifications and review DPA terms for changes.
