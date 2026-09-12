# Opsly Free-First Terraform Governance — Execution Prompt

Implement issue/workpack for free-first cloud infrastructure governance.

## Non-negotiable policy
- default mode: FREE_ONLY
- any paid or unknown-cost infrastructure requires explicit human approval before apply
- production Terraform apply is never automatic
- every ephemeral resource must have TTL/expiry metadata and a deterministic destroy path
- after destroy, verify no ephemeral managed resources remain
- unknown price == approval required
- credits do not count as permanently free
- no secrets may be printed or committed

## Reuse
- ADR-008 Terraform plan-before-apply
- ADR-023 Approval Gate concepts
- existing infra/terraform layout
- Doppler as canonical secret source

## Implement
1. inspect current Terraform modules and CI;
2. add reusable metadata/tag conventions;
3. generate machine-readable plan metadata;
4. run cloud-cost-policy-check before apply;
5. block non-free/unknown plans with APPROVAL_REQUIRED;
6. support TTL/destroy verification for ephemeral stacks;
7. add tests;
8. update runbook with exact plan/apply/destroy commands.

## Required PR evidence
- terraform fmt/validate result
- tests
- sample FREE_ONLY pass
- sample PAID_REQUIRES_APPROVAL block
- sample missing-TTL block
- exact rollback/destroy commands
- confirmation that no paid resource was created during implementation
