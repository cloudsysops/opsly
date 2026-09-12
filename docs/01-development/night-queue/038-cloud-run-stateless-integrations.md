---
id: cloud-run-stateless-integrations-038
status: pending
owner: cursor-builder
created: 2026-09-11
requires_pr: true
risk: low
autonomy: supervised
---

# GCP Cloud Run — stateless integration worker

## Goal
Define the smallest Cloud Run deployment pattern for stateless Opsly integrations that should not live permanently on the VPS.

## Good candidates
- webhook normalization
- lightweight signed callbacks
- analytics transforms
- bounded scheduled/stateless jobs

## Deliver
- one minimal reference service
- container build/deploy manifest or script
- auth strategy for private invocation where applicable
- health endpoint
- environment/secret contract
- cost guardrails / min instances = 0 unless explicitly justified
- tests
- operator runbook

## Guardrails
- do not move BullMQ control plane to Cloud Run
- no persistent AI runtimes
- no second orchestrator
- no production DB admin credentials
- no stateful workflow engine

## Acceptance
- deploys as scale-to-zero stateless service
- signed/authenticated invocation works
- service failure is isolated from Opsly control plane
