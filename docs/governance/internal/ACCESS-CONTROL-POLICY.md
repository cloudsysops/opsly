# Access Control Policy

**Version:** 1.0 | **Effective:** 2026-05-25 | **Owner:** Cristian Botero  
**Review:** Quarterly | **Policy ID:** ops-access-v1

---

## 1. Purpose

Define how access to Opsly systems, infrastructure, and customer data is granted, reviewed, and revoked to maintain least-privilege principles and prevent unauthorized access.

## 2. Scope

All Opsly systems: Supabase, Doppler, Vercel, VPS (100.120.151.91), GitHub, Cloudflare, Resend, Stripe, Anthropic.

## 3. Principles

- **Least privilege:** Grant only the minimum permissions required for the role
- **Need to know:** Access to customer data only when required to fulfill a support or engineering task
- **MFA required:** All systems with MFA capability must have it enabled
- **No shared credentials:** Each person/service has a unique credential

## 4. Access Tiers

| Tier | Description | Examples |
|------|-------------|---------|
| T0 — Production admin | Full write access to prod | Supabase service_role, Doppler prd write |
| T1 — Production read | Read-only prod access | Supabase anon key, Doppler prd read |
| T2 — Staging/dev | Full write to non-prod | Doppler dev, Supabase staging |
| T3 — CI/CD | Service account, automated | GitHub Actions OIDC tokens |

## 5. Access Provisioning

1. Request via GitHub issue tagged `access-request`
2. Approval by Cristian Botero (owner)
3. Credentials issued via Doppler; never via Slack/email
4. Document the grant in the access log (GitHub issue, not a spreadsheet)

## 6. MFA Requirements

| System | MFA Required |
|--------|-------------|
| GitHub | ✅ Enforced |
| Supabase dashboard | ✅ Required |
| Vercel | ✅ Required |
| Cloudflare | ✅ Required |
| Stripe dashboard | ✅ Required |
| Doppler | ✅ Required |

## 7. Service Accounts

- Service accounts use Doppler secrets only, never hardcoded
- Service accounts are scoped to one service (no shared API keys across apps)
- Rotate service account keys on suspected compromise

## 8. Access Review

- Quarterly review of all T0/T1 access holders
- Deactivate accounts that have been unused for 90+ days

## 9. Offboarding

See EMPLOYEE-LIFECYCLE-POLICY.md §4. Summary: revoke all access within 24 hours of departure.
