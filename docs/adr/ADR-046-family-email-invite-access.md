# ADR-046: Family access via email invite and approved reservation gate

## Status
Accepted

## Date
2026-05-26

## Context
Peskids families were using Google OAuth as the visible entry point for the family portal. That exposed an unnecessary third-party dependency and made the portal feel open-ended, even though backend access was still gated by tenant and parent email.

We need a family access model that:
- keeps the public portal smaller and safer
- sends a secure link to the family email already associated with a student or an accepted reservation
- remains tenant-scoped and reusable for future tenants
- does not share the staff login flow with families

## Decision
Replace the public family login CTA with an email-based access request flow:
- the family enters an email
- the server checks whether that email is already associated with a student or an enrolled lead for the Peskids tenant
- if eligible, Peskids sends a secure Supabase auth link to that email
- the auth callback keeps the family on `/familias/submissions`

Families no longer use Google OAuth as the default entry path.

## Alternatives Considered

### Keep Google OAuth for families
- Pros: familiar to some users
- Cons: third-party dependency, more confusing surface, unnecessary public login affordance
- Rejected: not aligned with the tighter security and tenant-scoped access model

### Send links to any entered email
- Pros: simpler UX
- Cons: invites email enumeration and can create unwanted spam or access attempts
- Rejected: the email must already be tied to a student or an enrolled lead

### Keep staff and family in one login surface
- Pros: fewer routes
- Cons: role confusion and higher blast radius if the flow drifts
- Rejected: families, staff, teachers and support stay separated

## Consequences
- Families get a clearer, safer login flow
- Support can ask for the registered email and trigger the portal access without exposing Google
- Peskids now has a reusable pattern for future tenants that need email-gated family access
- The server must keep the eligibility gate in sync with student and lead records
