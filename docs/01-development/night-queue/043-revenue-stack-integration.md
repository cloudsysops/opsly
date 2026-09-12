---
id: revenue-stack-integration-043
status: pending
owner: opencode-builder
created: 2026-09-12
requires_pr: true
risk: medium
autonomy: supervised
---

# Revenue stack integration

## Goal
Turn registered external services into a governed Opsly revenue capability without duplicating their products.

## Phase 1 — contracts
- define partner/provider registry
- define referral/attribution/commission event contracts
- define RevenueAgent task intents
- no money movement
- no medical diagnosis
- no autonomous outbound messages

## Phase 2 — adapters
- Twenty opportunities
- Shlink click attribution
- Cal.com booking events
- Chatwoot conversation references
- listmonk approved campaigns

## Phase 3 — commerce/deals
- Medusa product/offer adapter
- changedetection event adapter
- approved sources only

## Phase 4 — Mission Control
Show:
- leads
- qualified opportunities
- pipeline value
- attributed conversions
- expected commissions
- paid commissions
- agent activity
- partner/provider performance

## Invariants
- one Opsly control plane
- external services are capabilities, not orchestrators
- AgentTaskEnvelopeV1 for AI work
- approval-first outbound
- no paid infrastructure without explicit approval
- no trading/betting execution in this workpack
- health vertical stores coordination/commercial data only until compliance architecture is separately approved
