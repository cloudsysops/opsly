---
id: career-agent-mvp-028
status: pending
owner: opencode-builder
agent: opencode
created: 2026-09-11
requires_pr: true
risk: low
autonomy: supervised
---

# Opsly Career Agent MVP — discovery + scoring + evidence

## Mission

Create a minimal Career Agent blueprint for the founder without building a second platform.

Goal: Opsly discovers relevant jobs, scores fit, links claims to real CV/GitHub evidence, and prepares an application package for human approval.

## Architecture rule

Reuse:

`tenant/profile -> events -> agents -> approvals -> metrics`

Do not build a standalone job-board product.

## MVP modules

1. Career Profile
   - canonical CV facts
   - skills
   - experience
   - GitHub evidence references
   - location/work constraints
2. Job Discovery contract
   - normalized posting schema
   - source URL
   - company/title/location
   - salary if present
   - requirements
3. Job Fit Score
   - skill match
   - experience match
   - location/work mode
   - evidence coverage
   - explicit unknowns
4. Application Package
   - tailored CV deltas
   - recruiter message
   - cover-letter draft
   - interview brief
5. Approval gate
   - never auto-apply in MVP
   - status ends at READY_TO_APPLY
6. Job CRM states
   - discovered
   - shortlisted
   - ready_to_apply
   - applied
   - recruiter_reply
   - interview
   - offer
   - rejected

## Safety / truthfulness

- never invent experience;
- every technical claim must map to CV/GitHub evidence or be marked unsupported;
- no automated LinkedIn/Indeed submission;
- no credential scraping;
- no personal-data publication by default.

## Deliverable

Prefer schema/contracts + one thin service/CLI or API path, not UI-heavy work.

Return:

```
CAREER_AGENT_MVP

ARCHITECTURE:
PROFILE_SCHEMA:
JOB_SCHEMA:
SCORING:
EVIDENCE_LINKING:
APPROVAL_FLOW:
CRM_STATES:
FILES_CHANGED:
TESTS:
PR:
NEXT:
```
