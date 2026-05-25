# Employee & Contractor Lifecycle Policy

**Version:** 1.0 | **Effective:** 2026-05-25 | **Owner:** Cristian Botero  
**Review:** Annually | **Policy ID:** ops-employee-v1

---

## 1. Purpose

Define access provisioning and revocation procedures for employees, contractors, and agents (human and AI) to prevent unauthorized data access.

## 2. Scope

All individuals and service accounts with access to Opsly production systems.

## 3. Onboarding

### 3.1 Human (employees/contractors)
1. Sign NDA and acceptable use policy before access is granted
2. Provide access per ACCESS-CONTROL-POLICY.md tier appropriate to role
3. Enable MFA on all systems
4. Complete security awareness orientation (SECURITY.md + this policy)

### 3.2 AI Agents / Service Accounts
1. Create scoped Doppler service token (read-only unless write required)
2. Document purpose in AGENTS.md
3. Limit to minimum required permissions
4. No service account shares credentials with a human account

## 4. Offboarding

### 4.1 Immediate actions (within 24 hours of departure)

| System | Action |
|--------|--------|
| GitHub | Remove from org / revoke personal access tokens |
| Supabase | Deactivate dashboard user |
| Doppler | Revoke all tokens associated with the person |
| Vercel | Remove team member |
| Cloudflare | Remove account member |
| Stripe | Remove team member |
| Resend | Remove team member |
| VPS SSH | Remove SSH public key from `~/.ssh/authorized_keys` |

### 4.2 Follow-up (within 5 business days)
- Rotate any shared secrets that the departing person had access to
- Review audit logs for unusual activity in the 30 days prior to departure
- Confirm equipment return (if applicable)

### 4.3 AI Agent / Automated Systems
When decommissioning an agent:
1. Revoke Doppler service tokens
2. Remove from AGENTS.md active list
3. Document decommission reason and date

## 5. Access Review

Quarterly: verify the list of active human and service account holders matches
the expected roster. Deactivate any accounts that are no longer needed.
