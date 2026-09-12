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


## Provider scoring contract

Provider selection is policy-driven, not commission-driven.

Hard gates:
- approved provider;
- active contract;
- reviewed credentials;
- requested service fit;
- destination fit.

Weighted score:
- service fit 25%;
- credential quality 20%;
- availability 15%;
- language 10%;
- logistics 10%;
- price transparency 10%;
- response SLA 5%;
- verified quality evidence 5%.

Commercial terms are shown separately. They may never override a failed hard gate.

Canonical policy:
`config/vertical-blueprints/health-travel-colombia.provider-scoring.json`

## Intake contract

The commercial intake explicitly excludes diagnosis/history/labs/imaging/prescriptions/genetic data.

Canonical contract:
`config/vertical-blueprints/health-travel-colombia.intake-schema.json`

## Travel source policy

Travel/lodging/transport offers prefer official APIs, approved affiliate feeds and contracted local providers. Prices must be current and cancellation terms visible; no automatic booking.

Canonical policy:
`config/vertical-blueprints/health-travel-colombia.travel-source-policy.json`
