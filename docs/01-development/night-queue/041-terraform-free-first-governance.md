---
id: terraform-free-first-governance-041
status: pending
owner: opencode-builder
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Terraform free-first governance

## Goal
Turn Opsly cloud provisioning into a cost-gated IaC workflow where free resources can be automated and any possible spend requires explicit approval.

## Deliver
- reusable Terraform module conventions for labels/tags:
  - owner
  - purpose
  - environment
  - cost_class
  - ttl
  - expires_at
- plan metadata generation
- policy check using `config/cloud-cost-policy.json`
- CI step that blocks paid/unknown plans before apply
- no automatic apply to production
- deterministic destroy command per ephemeral stack
- post-destroy verification
- examples for Cloudflare/GCP/Oracle/DigitalOcean
- tests for free, unknown-cost, non-zero-cost and missing-TTL cases

## Required behavior

### Free resources
May proceed automatically only when:
- cost_class is free/free_with_quota
- estimated cost is 0
- quota assumptions are documented
- architecture policy passes

### Paid or unknown
Must stop with:
`APPROVAL_REQUIRED`

### Ephemeral
Must define TTL + destroy path and verify teardown.

## Guardrails
No secrets in Terraform state where avoidable. No direct auto-apply to production. No second orchestrator/queue/control plane.
