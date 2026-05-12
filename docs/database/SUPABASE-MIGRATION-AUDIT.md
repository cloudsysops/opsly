---
status: audit-report
owner: devops
date: 2026-05-08T04:00:00Z
severity: high
---

# Supabase Migration Audit Report

## Summary

- **Total migrations:** 50 (0001 → 0050)
- **Status:** ⚠️ INCONSISTENT (gaps + duplicates)
- **Critical tables:** 7
- **RLS policies:** 23
- **Indexes:** 104

---

## Issues Found

### 🔴 CRITICAL: Duplicate Migration Numbers

**Duplicates detected:**
```
0047_tenant_memberships_and_service_accounts.sql
0047_validation_metrics.sql

0048_agent_execution_patterns.sql
0048_defense_platform_schema.sql
```

**Impact:**
- Supabase will process BOTH files in same numbered slot
- Order is non-deterministic (filesystem-dependent)
- Can cause schema conflicts or missing tables

**Fix required:**
```bash
# Rename to sequential numbering
0047_validation_metrics.sql     → 0051_validation_metrics.sql
0048_agent_execution_patterns.sql → 0052_agent_execution_patterns.sql
0048_defense_platform_schema.sql  → 0053_defense_platform_schema.sql
0049_technician_local_services.sql → 0054_technician_local_services.sql
0050_shield_alert_config.sql     → 0055_shield_alert_config.sql
```

**Est. time:** 15 minutes (rename + test)

---

### 🟡 IMPORTANT: Migration Gaps

**Gap 1: 0029 missing**
```
0028_hermes_tables.sql
0030_tenant_insights.sql  ← jumps from 28 to 30
0031_tenant_context_profile.sql
```

**Gap 2: 0044-0045 missing**
```
0043_shield_score_and_secret_findings.sql
0046_local_services_core.sql  ← jumps from 43 to 46
```

**Why:**
- Possibly deleted files not in git
- OR someone manually numbered migrations
- OR merge conflict resolution gone wrong

**Check:**
```bash
git log --all --full-history -- 'supabase/migrations/0029*.sql'
git log --all --full-history -- 'supabase/migrations/004[45]*.sql'
```

**Action:**
1. Check git history for deleted migrations
2. If intentional, document why (comment in 0030 + 0046)
3. If accidental, recover from history or create patch migration

---

## Validation Results

### ✅ Passing

- **Base schema exists:** 0001_platform_schema.sql
- **RLS coverage:** 23 migrations with policies
- **Indexes:** 104 created across migrations
- **Critical tables:** All 7 have migrations

### ⚠️ Warning

- Gaps suggest incomplete migration history
- Duplicates WILL cause issues on fresh db restore
- No migration ordering documentation

---

## Critical Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| tenants | 0002 | Multi-tenant org |
| port_allocations | 0003 | Service port mgmt |
| api_keys | 0005 | Auth tokens |
| conversions | 0006 | Analytics metrics |
| platform_sprints | 0021 | Planning |
| billing_invoices | 0036 | Stripe |
| billing_subscriptions | 0037 | Usage metering |

---

## RLS Policies Coverage

**Migrations with policies:**
```
0007_rls_policies.sql (main)
0010_feedback_system.sql
0012_llm_feedback_conversations_fk.sql
0014_llm_semantic_cache_and_usage_quality.sql
0018_subscriptions_invoice_tracking.sql
0019_agent_sessions.sql
0021_platform_sprints.sql
0022_opsly_admin_dashboard.sql
0025_admin_agent_oversight_ledger.sql
0026_metrics_aggregation.sql
0027_similarity_search_approval_metrics.sql
0028_hermes_tables.sql
0030_tenant_insights.sql
0031_tenant_context_profile.sql
0035_oar_agent_episode_logs.sql
0036_billing_invoices.sql
0037_billing_subscriptions_metering.sql
0038_usage_events_attribution.sql
0042_n8n_marketplace_installs.sql
0043_shield_score_and_secret_findings.sql
0047_validation_metrics.sql
0048_defense_platform_schema.sql
0050_shield_alert_config.sql
```

**Concern:** Tables without explicit RLS need review (may have inherited policies)

---

## Testing Recommendations

### 1. Fresh Database Restore Test

```bash
# On staging VPS:
docker exec opsly_platform_db \
  pg_dump -U postgres > /tmp/pre-dup-dump.sql

# Fix duplicates, then rebuild:
npm run supabase:reset

# Compare schema
docker exec opsly_platform_db \
  pg_dump -U postgres > /tmp/post-fix-dump.sql

diff /tmp/pre-dup-dump.sql /tmp/post-fix-dump.sql
```

**Expected:** Only numbering changes, no schema diffs

### 2. Production Validation

```bash
# On prod, check migration history
SELECT * FROM supabase_migrations_db.schema_migrations
ORDER BY version;
```

**Expected:** 50 rows, no gaps, no duplicates

---

## Remediation Plan

### Phase 1: Immediate (Today)

- [ ] Fix duplicate migration numbers (0047-0050)
- [ ] Commit with `git rebase` to maintain history
- [ ] Test on local Supabase instance
- [ ] Test on staging

### Phase 2: Investigate (This week)

- [ ] Git history for deleted 0029, 0044-0045
- [ ] Contact author if recoverable
- [ ] Document decision (kept gap, recovered, or created patch)

### Phase 3: Document (Before next deploy)

- [ ] Add `supabase/migrations/README.md` with numbering rules
- [ ] Create migration naming checklist
- [ ] Add CI check: `no_gap_migrations()` validator

---

## Migration Naming Convention (Proposed)

```
Format: NNN_descriptive_name.sql

Rules:
1. Sequential: 001, 002, 003, ... (no gaps)
2. No duplicates: Use `git log` before committing
3. Date comment: /* Created 2026-05-08 by @user */
4. Table name: /* Adds table: tenants */

Good:
  ✅ 050_shield_alert_config.sql
  ✅ 051_new_analytics_table.sql

Bad:
  ❌ 050_part1.sql + 050_part2.sql (duplicate)
  ❌ 050_table_a.sql, 052_table_b.sql (gap)
  ❌ 0050_version.sql (leading zero without consistency)
```

---

## Owner Assignments

| Task | Owner | Est. Time |
|------|-------|-----------|
| Fix duplicates (rename) | @devops | 15m |
| Git history investigation | @architect | 30m |
| Fresh db test | @qa | 20m |
| Production validation | @devops | 10m |
| Update README + CI | @eng | 1h |

**Total:** ~2.5 hours to fully resolve

---

## Next Steps

1. **Run immediately:**
   ```bash
   supabase start
   npm run supabase:reset
   # Verify 50 migrations execute in order
   ```

2. **If tests pass:** Fix duplicates + commit

3. **If tests fail:** Check diffs, adjust naming, retest

4. **Escalate if:** Production has already migrated with duplicates (need backward-compatible patch)

---

## References

- Supabase CLI docs: https://supabase.com/docs/guides/cli/getting-started
- Migration best practices: `docs/DATABASE.md` (TODO: create)
- Migration files: `supabase/migrations/`

---

## Appendix: Full Migration List

```
 1. 0001_platform_schema.sql
 2. 0002_tenants_table.sql
 3. 0003_port_allocations.sql
 4. 0004_stripe_subscriptions.sql
 5. 0005_api_keys.sql
 6. 0006_conversion_metrics.sql
 7. 0007_rls_policies.sql
 8. 0008_pgvector.sql
 9. 0009_usage_events.sql
10. 0010_feedback_system.sql
11. 0011_feedback_system_rls.sql
12. 0012_llm_feedback_conversations_fk.sql
13. 0013_workspace_tables.sql
14. 0014_llm_semantic_cache_and_usage_quality.sql
15. 0015_tenant_limits.sql
16. 0016_audit_trail.sql
17. 0017_ai_agent_profiles.sql
18. 0018_subscriptions_invoice_tracking.sql
19. 0019_agent_sessions.sql
20. 0020_permissions_and_quotas.sql
21. 0021_platform_sprints.sql
22. 0022_opsly_admin_dashboard.sql
23. 0023_team_messaging.sql
24. 0024_context_builder_sessions.sql
25. 0025_admin_agent_oversight_ledger.sql
26. 0026_metrics_aggregation.sql
27. 0027_similarity_search_approval_metrics.sql
28. 0028_hermes_tables.sql
29. [GAP] 0029 missing
30. 0030_tenant_insights.sql
31. 0031_tenant_context_profile.sql
32. 0032_ai_guardrails_scoring.sql
33. 0033_agency_division_tables.sql
34. 0034_team_analytics.sql
35. 0035_oar_agent_episode_logs.sql
36. 0036_billing_invoices.sql
37. 0037_billing_subscriptions_metering.sql
38. 0038_usage_events_attribution.sql
39. 0039_workspace_governance.sql
40. 0040_research_artifacts.sql
41. 0041_evolution_governance.sql
42. 0042_n8n_marketplace_installs.sql
43. 0043_shield_score_and_secret_findings.sql
44. [GAP] 0044-0045 missing
45. [GAP]
46. 0046_local_services_core.sql
47. 0047_tenant_memberships_and_service_accounts.sql (DUPLICATE!)
47. 0047_validation_metrics.sql (DUPLICATE!)
48. 0048_agent_execution_patterns.sql (DUPLICATE!)
48. 0048_defense_platform_schema.sql (DUPLICATE!)
49. 0049_technician_local_services.sql
50. 0050_shield_alert_config.sql
```

Status: **RENUMBERING REQUIRED** before production use.
