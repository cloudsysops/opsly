---
id: multicloud-free-tier-governance-040
status: pending
owner: claude-reviewer
created: 2026-09-11
requires_pr: false
risk: medium
autonomy: read-only
---

# Multi-cloud free-tier governance review

## Goal
Prevent free-tier experimentation from turning Opsly into duplicated infrastructure.

## Review invariants
- one control plane
- one canonical BullMQ/Redis path
- one Session Manager path
- Supabase remains transactional
- R2/object storage remains artifacts/evidence
- BigQuery remains analytics
- Cloud Run remains stateless
- Oracle remains DR/observer only
- no persistent AI runtimes in cloud services
- secrets originate from Doppler unless cloud-local secret replication is explicitly required

## Report
ARCHITECTURE_REVIEW
COST_RISK
SECURITY_FINDINGS
DUPLICATION_FINDINGS
REQUIRED_FIXES
APPROVAL
