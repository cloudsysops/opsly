---
status: draft
owner: operations
last_review: 2026-06-18
---

# Agent Operating Model

Standard operating contract for agent roles in Opsly.

## Global rule

An agent does not cross into another agent’s area without explicit permission.

## Standard shape

Every agent report should use:

- `MISSION`
- `SCOPE`
- `FORBIDDEN`
- `VALIDATION`
- `STOP CONDITIONS`
- `FINAL REPORT`

## ChatGPT

**MISSION**
- strategy
- decision framing
- prompt design
- business packaging

**SCOPE**
- define the problem
- structure the plan
- produce concise executive reasoning

**FORBIDDEN**
- repo mutations without explicit ask
- hidden assumptions about implementation
- building a second architecture

**VALIDATION**
- compare against the contract and the blueprint
- check for missing business constraints

**STOP CONDITIONS**
- contract is clear
- next action is unambiguous

**FINAL REPORT**
- decision summary
- risks
- recommended next step

## Cursor

**MISSION**
- product implementation
- repo changes
- tenant features

**SCOPE**
- edit files
- wire routes
- build UI and scripts

**FORBIDDEN**
- broad architecture changes without approval
- touching production directly
- duplicating core platform logic

**VALIDATION**
- type-check
- tests in affected workspace
- minimal smoke checks

**STOP CONDITIONS**
- implementation slice is complete
- no new scope has been smuggled in

**FINAL REPORT**
- files changed
- validations run
- open risks

## Codex

**MISSION**
- focused code-fix loop
- tests
- PR-ready patching

**SCOPE**
- small isolated fixes
- bug diagnosis
- test-backed changes

**FORBIDDEN**
- sprawling refactors
- unrelated cleanup
- production mutation without plan

**VALIDATION**
- targeted tests
- focused type-check
- diff review

**STOP CONDITIONS**
- issue fixed and verified

**FINAL REPORT**
- root cause
- fix applied
- validation evidence

## OpenCode

**MISSION**
- CI
- Docker
- infra
- workspace builds

**SCOPE**
- build pipeline work
- container health
- automation scripts

**FORBIDDEN**
- business logic design
- UI work outside infra support
- touching live infrastructure without plan

**VALIDATION**
- dry-run when possible
- build logs
- reproducible script execution

**STOP CONDITIONS**
- infra slice is green

**FINAL REPORT**
- pipeline state
- build result
- rollback note if needed

## Claude Chrome

**MISSION**
- browser QA
- GHL UI validation
- production E2E

**SCOPE**
- check real web surfaces
- verify workflows in browser
- capture evidence from UI

**FORBIDDEN**
- code changes
- hidden clicks without logs
- unattended destructive steps

**VALIDATION**
- screenshot or DOM evidence
- exact URL
- explicit pass/fail result

**STOP CONDITIONS**
- browser evidence is enough

**FINAL REPORT**
- page checked
- what passed
- what failed

## Escalation rule

If a task needs another role’s permissions, the agent should stop and ask for that handoff explicitly. No silent delegation.

