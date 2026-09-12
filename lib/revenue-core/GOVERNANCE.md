# Revenue Core Governance

## Ownership

`@intcloudsysops/revenue-core` owns generic commercial attribution and commission primitives.

It does not own:
- CRM contacts/opportunities (Twenty)
- commerce catalog/orders (Medusa)
- inbox/conversations (Chatwoot)
- booking (Cal.com)
- payment execution
- bank transfers
- investment/trading execution

## Invariants

1. Every persisted row is tenant-scoped.
2. Commission calculations never fabricate tiered/manual terms.
3. Money movement is out of scope; payouts are ledger state only.
4. External systems are referenced by stable IDs/refs; Opsly does not mirror their whole domain.
5. Agent attribution uses `agent_task_request_id` when available.
6. Health/travel referrals store commercial coordination references only; clinical records do not belong here.
7. No commission is considered paid until an explicit `paid` event or received payout record exists.
8. Reversals must remain append-only events; do not rewrite history silently.

## Intended consumers

- Mission Control Revenue
- Revenue Agent
- Health & Travel Colombia
- Commerce & Deals
- Contractors/local services
- affiliate/referral integrations
