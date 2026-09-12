# Health & Travel Colombia — Launch Blueprint

This blueprint turns Opsly into a coordination and revenue layer for international travel + health journeys in Colombia.

## Clone a tenant

```bash
./scripts/provisioning/clone-vertical-launch.sh \
  --vertical health-travel-colombia \
  --slug <slug> \
  --business-name "<brand>" \
  --domain <slug>.op-sly.com \
  --email owner@example.com \
  --dry-run
```

## Canonical product boundary

Opsly owns:
- lead intake;
- partner/provider registry references;
- provider shortlist workflow;
- consultation booking coordination;
- quotes and follow-up references;
- travel/lodging/transport coordination;
- attribution/referrals/commissions;
- Mission Control journey state.

Opsly does not own clinical decision-making or a medical record.

## Journey

```text
lead
→ qualified
→ provider shortlist
→ consultation scheduled
→ quote
→ booked
→ travel confirmed
→ in Colombia
→ follow-up
→ completed
```

Cancellation can occur from any stage.

## Provider scoring

Provider matching should eventually use:
- specialty/service fit;
- verified credential state;
- availability;
- language;
- location;
- response SLA;
- traveler requirements;
- quality/review evidence;
- price transparency.

Commission may be displayed separately but must not be the sole ranking factor.

## Revenue linkage

Each journey may link to:
- one `revenue_attributions.attribution_key`;
- one or more `revenue_referrals`;
- append-only `revenue_commission_events`;
- payout state after actual partner settlement.

## Launch gates

Before a provider becomes active:
1. identity/business verification;
2. credential/contract review appropriate to provider type;
3. approved service catalog;
4. commission/referral terms reviewed;
5. response SLA;
6. escalation contact;
7. privacy/data boundary acknowledged.

## MVP

Start with a narrow service category and city. Do not launch a broad medical marketplace on day one.

Recommended first operational shape:
- Medellín;
- one or two elective/planned service categories;
- bilingual concierge;
- approved transport/lodging partners;
- manual provider shortlist approval;
- human approval before outbound offers.
