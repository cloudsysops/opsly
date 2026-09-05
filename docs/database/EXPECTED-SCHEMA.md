---
status: generated
owner: devops
generated_by: tools/db-assurance/analyze.mjs
date: 2026-09-05
---

# EXPECTED Schema (replay ground truth)

> **Generated artifact — do not hand-edit.** Regenerate with
> `tools/db-assurance/run-audit.sh`.
>
> **Source of truth:** this describes the schema produced by replaying the
> committed migration chains (`supabase/migrations/` + `apps/peskids/migrations/`)
> into a clean, local, ephemeral Postgres. It is **not** a dump of staging or
> production. Nothing in this repository proves the live databases match it —
> confirming that requires dashboard/API access to Supabase project
> `jkwykpldnitavhmtuzmo`, which the audit that produced this file did not have.


## Summary

| Schema | Tables | RLS on | RLS off |
|---|---:|---:|---:|
| `defense` | 5 | 5 | 0 |
| `governance` | 5 | 5 | 0 |
| `panini_lab` | 11 | 11 | 0 |
| `peskids` | 29 | 23 | 6 |
| `platform` | 89 | 82 | 7 |
| `public` | 19 | 16 | 3 |
| `sandbox` | 5 | 2 | 3 |
| **total** | **163** | **144** | **19** |

---

## Schema `defense`

### `defense.audits`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `audits_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `audit_type` | `text` | YES |  |
| `framework` | `text` |  |  |
| `status` | `text` | YES | `'scheduled'::text` |
| `scheduled_at` | `timestamp with time zone` |  |  |
| `started_at` | `timestamp with time zone` |  |  |
| `completed_at` | `timestamp with time zone` |  |  |
| `scope` | `text` |  |  |
| `severity_level` | `integer` |  |  |
| `findings` | `jsonb` |  |  |
| `total_findings` | `integer` | YES | `0` |
| `critical_count` | `integer` | YES | `0` |
| `high_count` | `integer` | YES | `0` |
| `report_url` | `text` |  |  |
| `pdf_generated` | `boolean` | YES | `false` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `defense.compliance_requirements`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `compliance_requirements_responsible_user_fkey` → `auth.users`, `compliance_requirements_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `framework` | `text` | YES |  |
| `requirement_id` | `text` |  |  |
| `title` | `text` | YES |  |
| `description` | `text` |  |  |
| `status` | `text` | YES | `'not_assessed'::text` |
| `evidence` | `text` |  |  |
| `last_verified` | `timestamp with time zone` |  |  |
| `implementation_date` | `date` |  |  |
| `deadline` | `date` |  |  |
| `responsible_user` | `uuid` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `defense.pentest_results`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `pentest_results_audit_id_fkey` → `defense.audits`, `pentest_results_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `audit_id` | `uuid` |  |  |
| `tenant_id` | `uuid` | YES |  |
| `test_date` | `timestamp with time zone` |  |  |
| `tester_name` | `text` |  |  |
| `scope` | `text` |  |  |
| `vulnerabilities_found` | `integer` |  |  |
| `vulnerabilities_exploitable` | `integer` |  |  |
| `methodology` | `text` |  |  |
| `report_url` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `defense.security_events`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `security_events_actor_user_id_fkey` → `auth.users`, `security_events_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `event_type` | `text` | YES |  |
| `severity` | `text` | YES | `'info'::text` |
| `description` | `text` |  |  |
| `actor_user_id` | `uuid` |  |  |
| `actor_ip` | `text` |  |  |
| `affected_resource` | `text` |  |  |
| `status` | `text` | YES | `'logged'::text` |
| `investigation_notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `defense.vulnerabilities`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `vulnerabilities_assigned_to_fkey` → `auth.users`, `vulnerabilities_audit_id_fkey` → `defense.audits`, `vulnerabilities_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `audit_id` | `uuid` | YES |  |
| `tenant_id` | `uuid` | YES |  |
| `title` | `text` | YES |  |
| `description` | `text` |  |  |
| `cvss_score` | `numeric(3,1)` |  |  |
| `severity` | `text` |  |  |
| `affected_component` | `text` |  |  |
| `cve_id` | `text` |  |  |
| `cwe_id` | `text` |  |  |
| `status` | `text` | YES | `'open'::text` |
| `remediation` | `text` |  |  |
| `remediation_deadline` | `date` |  |  |
| `evidence` | `text` |  |  |
| `poc_url` | `text` |  |  |
| `assigned_to` | `uuid` |  |  |
| `priority` | `integer` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `fixed_at` | `timestamp with time zone` |  |  |

---

## Schema `governance`

### `governance.agreements`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `agreements_user_id_fkey` → `auth.users`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `user_id` | `uuid` |  |  |
| `document_id` | `text` | YES |  |
| `document_version` | `text` | YES |  |
| `accepted_at` | `timestamp with time zone` | YES | `now()` |
| `ip` | `text` |  |  |
| `user_agent` | `text` |  |  |

### `governance.breach_log`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `breach_log_reported_by_fkey` → `auth.users`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `title` | `text` | YES |  |
| `description` | `text` | YES |  |
| `discovered_at` | `timestamp with time zone` | YES |  |
| `reported_at` | `timestamp with time zone` | YES | `now()` |
| `status` | `text` | YES | `'detected'::text` |
| `severity` | `text` | YES |  |
| `affected_data_types` | `text[]` | YES | `'{}'::text[]` |
| `affected_subject_count` | `integer` |  |  |
| `root_cause` | `text` |  |  |
| `containment_actions` | `text` |  |  |
| `authority_notified_at` | `timestamp with time zone` |  |  |
| `authority_reference` | `text` |  |  |
| `subjects_notified_at` | `timestamp with time zone` |  |  |
| `notification_method` | `text` |  |  |
| `closed_at` | `timestamp with time zone` |  |  |
| `lessons_learned` | `text` |  |  |
| `reported_by` | `uuid` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `governance.consents`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `subject_email` | `text` |  |  |
| `policy_id` | `text` | YES |  |
| `policy_version` | `text` | YES |  |
| `consent_type` | `text` | YES |  |
| `granted_at` | `timestamp with time zone` | YES | `now()` |
| `revoked_at` | `timestamp with time zone` |  |  |
| `ip` | `text` |  |  |
| `user_agent` | `text` |  |  |
| `payload_hash` | `text` |  |  |
| `metadata` | `jsonb` |  |  |

### `governance.dsar_requests`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `dsar_requests_verification_token_key`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `subject_email` | `text` | YES |  |
| `request_type` | `text` | YES |  |
| `status` | `text` | YES | `'received'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `sla_deadline` | `timestamp with time zone` | YES |  |
| `fulfilled_at` | `timestamp with time zone` |  |  |
| `rejected_at` | `timestamp with time zone` |  |  |
| `rejection_reason` | `text` |  |  |
| `evidence_url` | `text` |  |  |
| `verification_token` | `text` |  |  |
| `verified_at` | `timestamp with time zone` |  |  |
| `notes` | `text` |  |  |

### `governance.retention_schedule`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `retention_schedule_tenant_id_schema_name_table_name_key`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `schema_name` | `text` | YES |  |
| `table_name` | `text` | YES |  |
| `date_column` | `text` | YES | `'created_at'::text` |
| `ttl_days` | `integer` | YES |  |
| `action` | `text` | YES | `'delete'::text` |
| `is_active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

---

## Schema `panini_lab`

### `panini_lab.affiliate_clicks`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `affiliate_clicks_market_id_fkey` → `panini_lab.polymarket_markets`, `affiliate_clicks_signal_id_fkey` → `panini_lab.value_signals`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `session_id` | `text` |  |  |
| `market_id` | `uuid` |  |  |
| `signal_id` | `uuid` |  |  |
| `ref_code` | `text` |  |  |
| `destination_url` | `text` |  |  |
| `ip_country` | `text` |  |  |
| `user_agent` | `text` |  |  |
| `clicked_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.collection_items`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `collection_items_tenant_slug_sticker_number_key`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'panini-lab'::text` |
| `sticker_number` | `integer` | YES |  |
| `status` | `text` | YES | `'owned'::text` |
| `notes` | `text` |  |  |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `country` | `text` |  |  |
| `player_name` | `text` |  |  |

### `panini_lab.conversation_events`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'panini-lab'::text` |
| `channel` | `text` | YES | `'webhook'::text` |
| `sender` | `text` |  |  |
| `raw_input` | `text` | YES |  |
| `intent` | `text` |  |  |
| `entities` | `jsonb` | YES | `'{}'::jsonb` |
| `opsly_events` | `jsonb` | YES | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.polymarket_markets`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `polymarket_markets_condition_id_key`
- **FK:** `polymarket_markets_fixture_id_fkey` → `panini_lab.wc_fixtures`, `polymarket_markets_player_id_fkey` → `panini_lab.wc_players`, `polymarket_markets_team_id_fkey` → `panini_lab.wc_teams`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `condition_id` | `text` | YES |  |
| `question` | `text` | YES |  |
| `category` | `text` |  |  |
| `fixture_id` | `uuid` |  |  |
| `team_id` | `uuid` |  |  |
| `player_id` | `uuid` |  |  |
| `outcome_yes_price` | `numeric(5,4)` |  |  |
| `outcome_no_price` | `numeric(5,4)` |  |  |
| `volume_usdc` | `numeric(18,2)` |  |  |
| `closes_at` | `timestamp with time zone` |  |  |
| `active` | `boolean` | YES | `true` |
| `fetched_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.value_signals`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `value_signals_market_id_fkey` → `panini_lab.polymarket_markets`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `market_id` | `uuid` |  |  |
| `our_prob` | `numeric(5,2)` |  |  |
| `market_implied` | `numeric(5,2)` |  |  |
| `edge` | `numeric(6,2)` |  |  |
| `signal` | `text` |  |  |
| `polymarket_url` | `text` |  |  |
| `computed_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.wc_fixtures`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `wc_fixtures_api_id_key`
- **FK:** `wc_fixtures_away_team_id_fkey` → `panini_lab.wc_teams`, `wc_fixtures_home_team_id_fkey` → `panini_lab.wc_teams`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `api_id` | `integer` |  |  |
| `home_team_id` | `uuid` |  |  |
| `away_team_id` | `uuid` |  |  |
| `stage` | `text` |  |  |
| `match_date` | `timestamp with time zone` |  |  |
| `venue` | `text` |  |  |
| `city` | `text` |  |  |
| `status` | `text` | YES | `'scheduled'::text` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.wc_match_predictions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `wc_match_predictions_fixture_id_key`
- **FK:** `wc_match_predictions_fixture_id_fkey` → `panini_lab.wc_fixtures`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `fixture_id` | `uuid` |  |  |
| `prob_home_win` | `numeric(5,2)` |  |  |
| `prob_draw` | `numeric(5,2)` |  |  |
| `prob_away_win` | `numeric(5,2)` |  |  |
| `predicted_home` | `integer` |  |  |
| `predicted_away` | `integer` |  |  |
| `model_version` | `text` | YES | `'v1-poisson'::text` |
| `collection_bonus_applied` | `boolean` | YES | `false` |
| `computed_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.wc_player_predictions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `wc_player_predictions_player_id_fixture_id_key`
- **FK:** `wc_player_predictions_fixture_id_fkey` → `panini_lab.wc_fixtures`, `wc_player_predictions_player_id_fkey` → `panini_lab.wc_players`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `player_id` | `uuid` |  |  |
| `fixture_id` | `uuid` |  |  |
| `prob_goal` | `numeric(5,2)` |  |  |
| `prob_assist` | `numeric(5,2)` |  |  |
| `prob_yellow` | `numeric(5,2)` |  |  |
| `prob_red` | `numeric(5,2)` |  |  |
| `model_version` | `text` | YES | `'v1-stats'::text` |
| `computed_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.wc_players`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `wc_players_api_id_key`
- **FK:** `wc_players_team_id_fkey` → `panini_lab.wc_teams`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `api_id` | `integer` |  |  |
| `team_id` | `uuid` |  |  |
| `name` | `text` | YES |  |
| `position` | `text` |  |  |
| `nationality` | `text` |  |  |
| `age` | `integer` |  |  |
| `jersey_number` | `integer` |  |  |
| `photo_url` | `text` |  |  |
| `goals` | `integer` | YES | `0` |
| `assists` | `integer` | YES | `0` |
| `yellow_cards` | `integer` | YES | `0` |
| `red_cards` | `integer` | YES | `0` |
| `minutes_played` | `integer` | YES | `0` |
| `shots_total` | `integer` | YES | `0` |
| `rating` | `numeric(4,2)` |  |  |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.wc_results`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `wc_results_fixture_id_key`
- **FK:** `wc_results_fixture_id_fkey` → `panini_lab.wc_fixtures`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `fixture_id` | `uuid` |  |  |
| `home_goals` | `integer` |  |  |
| `away_goals` | `integer` |  |  |
| `winner` | `text` |  |  |
| `home_goals_ht` | `integer` |  |  |
| `away_goals_ht` | `integer` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `panini_lab.wc_teams`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `wc_teams_api_id_key`, `wc_teams_name_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `api_id` | `integer` |  |  |
| `name` | `text` | YES |  |
| `short_name` | `text` |  |  |
| `iso` | `text` |  |  |
| `group_stage` | `text` |  |  |
| `continent` | `text` |  |  |
| `fifa_rank` | `integer` |  |  |
| `recent_form` | `numeric(5,2)` |  |  |
| `wc_wins` | `integer` | YES | `0` |
| `logo_url` | `text` |  |  |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

---

## Schema `peskids`

### `peskids.audit_log`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `actor_id` | `uuid` |  |  |
| `action` | `text` | YES |  |
| `resource_type` | `text` | YES |  |
| `resource_id` | `text` | YES |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `ip_address` | `text` |  |  |
| `user_agent` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `peskids.class_enrollments`

- **RLS:** enabled · **policies:** 3
- **PK:** `PRIMARY KEY (id)`
- **FK:** `class_enrollments_class_id_fkey` → `peskids.classes`, `class_enrollments_student_id_fkey` → `public.students`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `class_id` | `uuid` | YES |  |
| `student_id` | `uuid` | YES |  |
| `family_user_id` | `uuid` | YES |  |
| `status` | `text` | YES | `'reserved'::text` |
| `payment_status` | `text` | YES | `'pending'::text` |
| `attendance` | `text` |  |  |
| `joined_at` | `timestamp with time zone` | YES | `now()` |
| `cancelled_at` | `timestamp with time zone` |  |  |
| `stripe_checkout_session_id` | `text` |  |  |
| `payment_provider` | `text` | YES | `'stripe'::text` |
| `wompi_transaction_id` | `text` |  |  |

### `peskids.classes`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `classes_franchise_id_fkey` → `platform.peskids_franchises`, `classes_pool_id_fkey` → `peskids.pools`
- **CHECK:** 6 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `title` | `text` | YES |  |
| `level` | `smallint` | YES |  |
| `professor_user_id` | `uuid` | YES |  |
| `pool_id` | `uuid` | YES |  |
| `location` | `text` | YES |  |
| `starts_at` | `timestamp with time zone` | YES |  |
| `ends_at` | `timestamp with time zone` | YES |  |
| `capacity` | `integer` | YES |  |
| `price_cents` | `integer` | YES |  |
| `currency` | `text` | YES | `'cop'::text` |
| `status` | `text` | YES | `'scheduled'::text` |
| `cancelled_reason` | `text` |  |  |
| `series_id` | `uuid` |  |  |
| `created_by` | `uuid` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `session_notes` | `text` |  |  |
| `franchise_id` | `uuid` |  |  |

### `peskids.form_analytics`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `form_analytics_unique`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `form_id` | `text` | YES |  |
| `date` | `date` | YES |  |
| `submissions_count` | `integer` |  | `0` |
| `unique_users` | `integer` |  | `0` |
| `avg_completion_time_seconds` | `numeric` |  |  |
| `abandonment_rate` | `numeric` |  |  |
| `error_count` | `integer` |  | `0` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |

### `peskids.form_deliveries`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `form_deliveries_template_id_fkey` → `peskids.form_templates`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `template_id` | `uuid` | YES |  |
| `recipient_email` | `text` | YES |  |
| `recipient_phone` | `text` |  |  |
| `recipient_name` | `text` |  |  |
| `delivery_method` | `text` | YES |  |
| `sent_at` | `timestamp with time zone` |  |  |
| `delivery_status` | `text` | YES | `'pending'::text` |
| `form_link` | `text` |  |  |
| `expires_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.form_fields`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `form_fields_unique`
- **FK:** `form_fields_form_id_fkey` → `peskids.forms`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `form_id` | `uuid` | YES |  |
| `field_id` | `text` | YES |  |
| `field_type` | `text` | YES |  |
| `label` | `text` | YES |  |
| `placeholder` | `text` |  |  |
| `required` | `boolean` |  | `false` |
| `options` | `jsonb` |  |  |
| `validation` | `jsonb` |  |  |
| `order_index` | `integer` | YES | `0` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `peskids.form_responses`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `form_responses_delivery_id_fkey` → `peskids.form_deliveries`, `form_responses_template_id_fkey` → `peskids.form_templates`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `delivery_id` | `uuid` | YES |  |
| `template_id` | `uuid` | YES |  |
| `response_data` | `jsonb` | YES |  |
| `ip_address` | `text` |  |  |
| `submitted_at` | `timestamp with time zone` | YES | `now()` |
| `crm_synced_at` | `timestamp with time zone` |  |  |
| `crm_sync_status` | `text` |  | `'pending'::text` |
| `crm_contact_id` | `text` |  |  |
| `trial_class_scheduled_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.form_submissions`

- **RLS:** enabled · **policies:** 3
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `form_submissions_unique`
- **FK:** `form_submissions_form_id_fkey` → `peskids.forms`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `submission_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `form_id` | `uuid` | YES |  |
| `user_id` | `uuid` |  |  |
| `form_data` | `jsonb` | YES | `'{}'::jsonb` |
| `status` | `text` | YES | `'submitted'::text` |
| `score` | `integer` |  |  |
| `feedback` | `text` |  |  |
| `ip_address` | `inet` |  |  |
| `user_agent` | `text` |  |  |
| `started_at` | `timestamp with time zone` |  | `now()` |
| `completed_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `twenty_person_id` | `text` |  |  |
| `twenty_synced_at` | `timestamp with time zone` |  |  |

### `peskids.form_templates`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `name` | `text` | YES |  |
| `description` | `text` |  |  |
| `form_type` | `text` | YES |  |
| `fields` | `jsonb` | YES | `'[]'::jsonb` |
| `status` | `text` | YES | `'active'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.forms`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `forms_unique`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `form_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `title` | `text` | YES |  |
| `description` | `text` |  |  |
| `status` | `text` | YES | `'active'::text` |
| `settings` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |

### `peskids.notification_preferences`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `notification_preferences_user_id_tenant_slug_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `user_id` | `uuid` | YES |  |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `email_enabled` | `boolean` | YES | `true` |
| `whatsapp_enabled` | `boolean` | YES | `false` |
| `inapp_enabled` | `boolean` | YES | `true` |
| `events` | `text[]` | YES | `ARRAY['submission_reviewed'::text, 'submission_observation':` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |

### `peskids.notifications`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `user_id` | `uuid` | YES |  |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `type` | `text` | YES |  |
| `title` | `text` | YES |  |
| `body` | `text` | YES |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `read_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `peskids.payments`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `payments_enrollment_id_fkey` → `peskids.class_enrollments`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `family_user_id` | `uuid` | YES |  |
| `enrollment_id` | `uuid` |  |  |
| `amount_cents` | `integer` | YES |  |
| `currency` | `text` | YES | `'cop'::text` |
| `status` | `text` | YES | `'pending'::text` |
| `stripe_payment_intent_id` | `text` |  |  |
| `stripe_checkout_session_id` | `text` |  |  |
| `paid_at` | `timestamp with time zone` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `provider` | `text` | YES | `'stripe'::text` |
| `wompi_transaction_id` | `text` |  |  |
| `referral_code_used` | `text` |  |  |
| `discount_cents` | `integer` |  | `0` |
| `final_amount_cents` | `integer` |  |  |

### `peskids.point_transactions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `point_transactions_related_order_id_fkey` → `peskids.store_orders`, `point_transactions_related_payment_id_fkey` → `peskids.payments`, `point_transactions_related_subscription_id_fkey` → `peskids.subscriptions`, `point_transactions_student_id_fkey` → `public.students`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `student_id` | `uuid` | YES |  |
| `transaction_type` | `text` | YES |  |
| `points_amount` | `integer` | YES |  |
| `description` | `text` |  |  |
| `related_order_id` | `uuid` |  |  |
| `related_subscription_id` | `uuid` |  |  |
| `related_payment_id` | `uuid` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.pools`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `pools_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `name` | `text` | YES |  |
| `location` | `text` | YES |  |
| `max_capacity` | `integer` | YES |  |
| `active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `franchise_id` | `uuid` |  |  |

### `peskids.push_subscriptions`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `push_subscriptions_user_id_endpoint_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `user_id` | `uuid` | YES |  |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `endpoint` | `text` | YES |  |
| `p256dh` | `text` | YES |  |
| `auth` | `text` | YES |  |
| `user_agent` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `peskids.referral_clicks`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `referral_clicks_referral_link_id_fkey` → `peskids.referral_links`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `referral_link_id` | `uuid` | YES |  |
| `ip_address` | `text` | YES |  |
| `user_agent` | `text` | YES |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.referral_links`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `referral_links_code_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `referrer_id` | `text` | YES |  |
| `referrer_name` | `text` | YES |  |
| `code` | `text` | YES |  |
| `expires_at` | `timestamp with time zone` | YES |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.referral_redemptions`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `referral_redemptions_referral_link_id_fkey` → `peskids.referral_links`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `referral_link_id` | `uuid` | YES |  |
| `referee_contact_id` | `text` | YES |  |
| `referee_email` | `text` | YES |  |
| `status` | `text` | YES | `'pending'::text` |
| `reward` | `text` |  |  |
| `redeemed_at` | `timestamp with time zone` | YES | `now()` |
| `completed_at` | `timestamp with time zone` |  |  |
| `failure_reason` | `text` |  |  |

### `peskids.store_cart_items`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `store_cart_items_tenant_slug_student_id_product_id_key`
- **FK:** `store_cart_items_product_id_fkey` → `peskids.store_products`, `store_cart_items_student_id_fkey` → `public.students`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `student_id` | `uuid` | YES |  |
| `product_id` | `uuid` | YES |  |
| `quantity` | `integer` | YES | `1` |
| `added_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.store_order_items`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `store_order_items_order_id_fkey` → `peskids.store_orders`, `store_order_items_product_id_fkey` → `peskids.store_products`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `order_id` | `uuid` | YES |  |
| `product_id` | `uuid` | YES |  |
| `quantity` | `integer` | YES | `1` |
| `unit_price_cents` | `integer` | YES |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.store_orders`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `store_orders_student_id_fkey` → `public.students`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `student_id` | `uuid` | YES |  |
| `total_cents` | `integer` | YES |  |
| `discount_cents` | `integer` |  | `0` |
| `final_amount_cents` | `integer` | YES |  |
| `referral_code_used` | `text` |  |  |
| `payment_status` | `text` |  | `'pending'::text` |
| `order_status` | `text` |  | `'pending'::text` |
| `stripe_payment_intent_id` | `text` |  |  |
| `wompi_transaction_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `completed_at` | `timestamp with time zone` |  |  |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.store_products`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `category` | `text` | YES |  |
| `title` | `text` | YES |  |
| `description` | `text` |  |  |
| `price_cents` | `integer` | YES |  |
| `currency` | `text` |  | `'COP'::text` |
| `image_url` | `text` |  |  |
| `inventory_count` | `integer` |  | `0` |
| `active` | `boolean` |  | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.student_badges`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `student_badges_class_id_fkey` → `peskids.classes`, `student_badges_student_id_fkey` → `public.students`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `student_id` | `uuid` | YES |  |
| `label` | `text` | YES |  |
| `class_id` | `uuid` |  |  |
| `awarded_by` | `uuid` |  |  |
| `awarded_by_role` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.student_points`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `student_points_student_id_key`
- **FK:** `student_points_student_id_fkey` → `public.students`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `student_id` | `uuid` | YES |  |
| `current_balance` | `integer` | YES | `0` |
| `total_earned` | `integer` | YES | `0` |
| `total_redeemed` | `integer` | YES | `0` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.submission_events`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `form_id` | `text` | YES |  |
| `submission_id` | `uuid` | YES |  |
| `user_id` | `uuid` |  |  |
| `event_type` | `text` | YES |  |
| `field_name` | `text` |  |  |
| `error_message` | `text` |  |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `peskids.subscription_payments`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `subscription_payments_subscription_id_fkey` → `peskids.subscriptions`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `subscription_id` | `uuid` | YES |  |
| `payment_date` | `date` | YES |  |
| `amount_cents` | `integer` | YES |  |
| `payment_status` | `text` |  | `'pending'::text` |
| `stripe_payment_intent_id` | `text` |  |  |
| `wompi_transaction_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.subscriptions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `subscriptions_student_id_fkey` → `public.students`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `student_id` | `uuid` | YES |  |
| `monthly_price_cents` | `integer` | YES |  |
| `currency` | `text` |  | `'COP'::text` |
| `status` | `text` | YES | `'active'::text` |
| `start_date` | `date` | YES |  |
| `renewal_date` | `date` | YES |  |
| `cancelled_date` | `date` |  |  |
| `referral_code_used` | `text` |  |  |
| `discount_cents` | `integer` |  | `0` |
| `final_monthly_amount_cents` | `integer` | YES |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `peskids.webhook_configs`

- **RLS:** enabled · **policies:** 3
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `webhook_configs_unique`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `form_id` | `text` | YES |  |
| `webhook_url` | `text` | YES |  |
| `secret` | `text` | YES |  |
| `events` | `text[]` |  | `ARRAY['form_submission'::text]` |
| `active` | `boolean` |  | `true` |
| `last_triggered_at` | `timestamp with time zone` |  |  |
| `failure_count` | `integer` |  | `0` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |

---

## Schema `platform`

### `platform.agent_episode_logs`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `bigint` | YES | `nextval('platform.agent_episode_logs_id_seq'::regclass)` |
| `tenant_slug` | `text` | YES |  |
| `session_id` | `text` | YES |  |
| `step_index` | `integer` | YES |  |
| `content` | `text` | YES |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.agent_executions`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `agent_executions_feedback_decision_id_fkey` → `platform.feedback_decisions`, `agent_executions_team_id_fkey` → `platform.agent_teams`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `team_id` | `uuid` |  |  |
| `feedback_decision_id` | `uuid` |  |  |
| `agent_type` | `text` | YES |  |
| `status` | `text` |  | `'pending'::text` |
| `input_prompt` | `text` |  |  |
| `output` | `text` |  |  |
| `started_at` | `timestamp with time zone` |  |  |
| `completed_at` | `timestamp with time zone` |  |  |
| `error` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.agent_teams`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `name` | `text` | YES |  |
| `description` | `text` |  |  |
| `tenant_slug` | `text` |  |  |
| `specialization` | `text` | YES |  |
| `max_parallel_agents` | `integer` |  | `2` |
| `status` | `text` |  | `'active'::text` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.api_keys`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `api_keys_key_hash_key`
- **FK:** `api_keys_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `key_hash` | `text` | YES |  |
| `key_prefix` | `text` | YES |  |
| `name` | `text` |  |  |
| `last_used_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `revoked_at` | `timestamp with time zone` |  |  |

### `platform.approval_gate_decisions`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `sandbox_run_id` | `text` | YES |  |
| `deployment_id` | `text` |  |  |
| `status` | `text` | YES |  |
| `confidence` | `integer` | YES |  |
| `reasoning` | `text` | YES |  |
| `recommendations` | `text[]` | YES | `'{}'::text[]` |
| `metrics` | `jsonb` | YES |  |
| `model_used` | `text` | YES |  |
| `complexity` | `text` | YES |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.approval_gate_embeddings`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `fk_approval_gate_embeddings_run` → `platform.approval_gate_decisions`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `sandbox_run_id` | `text` | YES |  |
| `metrics_embedding` | `vector(768)` | YES |  |
| `metrics_text` | `text` |  |  |
| `model_used` | `text` | YES | `'text-embedding-004'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.approved_suppliers`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `approved_suppliers_requirement_id_fkey` → `platform.supplier_requirements`, `approved_suppliers_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `category` | `text` | YES |  |
| `legal_name` | `text` | YES |  |
| `status` | `text` | YES | `'conditional'::text` |
| `requirement_id` | `uuid` |  |  |
| `rating` | `numeric(3,1)` |  |  |
| `contract_ref` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.audit_events`

- **RLS:** enabled · **policies:** 4
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` |  |  |
| `actor_email` | `text` |  |  |
| `action` | `text` | YES |  |
| `resource` | `text` | YES |  |
| `status_code` | `integer` |  |  |
| `ip` | `text` |  |  |
| `user_agent` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.audit_findings`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `audit_findings_audit_id_fkey` → `platform.audits`, `audit_findings_tenant_id_fkey` → `platform.tenants`, `audit_findings_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `audit_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `severity` | `text` | YES |  |
| `standard_ref` | `text` |  |  |
| `evidence` | `text` |  |  |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.audit_log`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `audit_log_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` |  |  |
| `action` | `text` | YES |  |
| `actor` | `text` | YES |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.audit_templates`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `audit_templates_network_id_fkey` → `platform.franchise_networks`, `audit_templates_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `network_id` | `uuid` |  |  |
| `name` | `text` | YES |  |
| `version` | `integer` | YES | `1` |
| `definition` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.audits`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `audits_template_id_fkey` → `platform.audit_templates`, `audits_tenant_id_fkey` → `platform.tenants`, `audits_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `template_id` | `uuid` |  |  |
| `auditor` | `text` |  |  |
| `scheduled_at` | `timestamp with time zone` |  |  |
| `performed_at` | `timestamp with time zone` |  |  |
| `score` | `numeric(5,2)` |  |  |
| `status` | `text` | YES | `'scheduled'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.billing_plans`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `text` | YES |  |
| `name` | `text` | YES |  |
| `description` | `text` |  |  |
| `monthly_price_cents` | `bigint` | YES | `0` |
| `yearly_price_cents` | `bigint` | YES | `0` |
| `currency` | `text` | YES | `'COP'::text` |
| `features` | `jsonb` | YES | `'{}'::jsonb` |
| `is_active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.billing_subscriptions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `billing_subscriptions_stripe_subscription_id_key`, `billing_subscriptions_tenant_id_key`
- **FK:** `billing_subscriptions_plan_id_fkey` → `platform.billing_plans`, `billing_subscriptions_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `plan_id` | `text` | YES |  |
| `stripe_subscription_id` | `text` |  |  |
| `stripe_customer_id` | `text` |  |  |
| `status` | `text` | YES | `'active'::text` |
| `billing_period` | `text` | YES | `'monthly'::text` |
| `amount_cents` | `bigint` | YES |  |
| `currency` | `text` | YES | `'COP'::text` |
| `current_period_start` | `date` |  |  |
| `current_period_end` | `date` |  |  |
| `auto_renew` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `cancelled_at` | `timestamp with time zone` |  |  |

### `platform.billing_usage`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `billing_usage_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `metric_type` | `text` | YES |  |
| `quantity` | `numeric(20,8)` | YES |  |
| `unit_cost` | `numeric(20,8)` | YES |  |
| `total_amount` | `numeric(20,8)` |  | `(quantity * unit_cost)` |
| `recorded_at` | `timestamp with time zone` | YES | `now()` |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |

### `platform.brand_standards`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `brand_standards_network_id_fkey` → `platform.franchise_networks`, `brand_standards_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `network_id` | `uuid` |  |  |
| `category` | `text` | YES |  |
| `code` | `text` | YES |  |
| `title` | `text` | YES |  |
| `requirement` | `text` | YES |  |
| `evidence_type` | `text` | YES | `'none'::text` |
| `severity` | `text` | YES | `'minor'::text` |
| `version` | `integer` | YES | `1` |
| `effective_from` | `timestamp with time zone` | YES | `now()` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.conversations`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `conversations_tenant_slug_session_id_key`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `session_id` | `text` | YES |  |
| `messages` | `jsonb` | YES | `'[]'::jsonb` |
| `model_used` | `text` |  |  |
| `quality_score` | `double precision` |  |  |
| `outcome` | `text` |  |  |
| `tokens_total` | `integer` |  |  |
| `cost_usd` | `numeric(10,6)` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.conversion_events`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `conversion_events_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `event` | `text` | YES |  |
| `tenant_id` | `uuid` |  |  |
| `session_id` | `text` |  |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.corrective_actions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `corrective_actions_finding_id_fkey` → `platform.audit_findings`, `corrective_actions_tenant_id_fkey` → `platform.tenants`, `corrective_actions_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `finding_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `owner` | `text` |  |  |
| `due_date` | `timestamp with time zone` | YES |  |
| `status` | `text` | YES | `'open'::text` |
| `resolution` | `text` |  |  |
| `evidence` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.customers`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `customers_tenant_id_email_key`
- **FK:** `customers_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `email` | `text` | YES |  |
| `name` | `text` |  |  |
| `company_name` | `text` |  |  |
| `billing_address` | `jsonb` |  |  |
| `stripe_customer_id` | `text` |  |  |
| `status` | `text` | YES | `'active'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.evolution_gap_analyses`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `evolution_gap_analyses_run_id_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `run_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES | `'platform'::text` |
| `gaps` | `jsonb` | YES | `'[]'::jsonb` |
| `cortex_cycle_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.evolution_proposals`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `evolution_proposals_proposal_id_key`
- **FK:** `evolution_proposals_gap_analysis_id_fkey` → `platform.evolution_gap_analyses`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `proposal_id` | `text` | YES |  |
| `gap_analysis_id` | `uuid` |  |  |
| `tenant_slug` | `text` | YES | `'platform'::text` |
| `title` | `text` | YES |  |
| `description` | `text` | YES |  |
| `affected_files` | `jsonb` |  | `'[]'::jsonb` |
| `risk_level` | `text` | YES | `'medium'::text` |
| `success_criteria` | `text` |  |  |
| `status` | `text` | YES | `'pending'::text` |
| `approval_decision_id` | `text` |  |  |
| `applied_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.feedback_conversations`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `uq_feedback_tenant_session`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `user_email` | `text` | YES |  |
| `session_id` | `text` | YES |  |
| `status` | `text` | YES | `'open'::text` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `outcome` | `text` |  |  |

### `platform.feedback_decisions`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `feedback_decisions_conversation_id_fkey` → `platform.feedback_conversations`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `conversation_id` | `uuid` | YES |  |
| `decision_type` | `text` | YES |  |
| `criticality` | `text` | YES |  |
| `reasoning` | `text` | YES |  |
| `implementation_prompt` | `text` |  |  |
| `approved_by` | `text` |  |  |
| `approved_at` | `timestamp with time zone` |  |  |
| `implemented_at` | `timestamp with time zone` |  |  |
| `cursor_commit` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.feedback_messages`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `feedback_messages_conversation_id_fkey` → `platform.feedback_conversations`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `conversation_id` | `uuid` | YES |  |
| `role` | `text` | YES |  |
| `content` | `text` | YES |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.franchise_agreement_units`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (agreement_id, unit_id)`
- **FK:** `franchise_agreement_units_agreement_id_fkey` → `platform.franchise_agreements`, `franchise_agreement_units_unit_id_fkey` → `platform.franchise_units`

| column | type | not null | default |
|---|---|---|---|
| `agreement_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |

### `platform.franchise_agreements`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `franchise_agreements_franchisee_id_fkey` → `platform.franchisees`, `franchise_agreements_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `franchisee_id` | `uuid` | YES |  |
| `state` | `text` | YES | `'draft'::text` |
| `effective_date` | `timestamp with time zone` | YES |  |
| `expiration_date` | `timestamp with time zone` | YES |  |
| `renewal_type` | `text` | YES | `'auto'::text` |
| `renewal_term_months` | `integer` |  |  |
| `notice_days` | `integer` | YES | `90` |
| `canonical_fee` | `jsonb` |  |  |
| `royalty_rule_id` | `uuid` |  |  |
| `territory_id` | `uuid` |  |  |
| `document_ref` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.franchise_documents`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `franchise_documents_tenant_id_fkey` → `platform.tenants`, `franchise_documents_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` |  |  |
| `kind` | `text` | YES |  |
| `title` | `text` | YES |  |
| `ref` | `text` | YES |  |
| `visibility` | `text` | YES | `'network'::text` |
| `owner_scope` | `text` |  |  |
| `version` | `text` |  |  |
| `expires_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.franchise_locations`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `franchise_locations_unit_id_slug_key`
- **FK:** `franchise_locations_tenant_id_fkey` → `platform.tenants`, `franchise_locations_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `kind` | `text` | YES | `'other'::text` |
| `address` | `text` |  |  |
| `city` | `text` |  |  |
| `region` | `text` |  |  |
| `country` | `text` |  |  |
| `geo` | `jsonb` |  |  |
| `active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.franchise_networks`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `franchise_networks_tenant_id_slug_key`
- **FK:** `franchise_networks_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `status` | `text` | YES | `'active'::text` |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.franchise_territories`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `franchise_territories_tenant_id_fkey` → `platform.tenants`, `franchise_territories_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` |  |  |
| `name` | `text` | YES |  |
| `type` | `text` | YES |  |
| `status` | `text` | YES | `'active'::text` |
| `exclusive` | `boolean` | YES | `false` |
| `exclusive_for` | `text` |  |  |
| `valid_from` | `timestamp with time zone` |  |  |
| `valid_to` | `timestamp with time zone` |  |  |
| `service_model` | `text` |  |  |
| `geo` | `jsonb` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.franchise_units`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `franchise_units_tenant_id_code_key`
- **FK:** `fk_franchise_units_primary_location` → `platform.franchise_locations`, `franchise_units_franchisee_id_fkey` → `platform.franchisees`, `franchise_units_network_id_fkey` → `platform.franchise_networks`, `franchise_units_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `network_id` | `uuid` |  |  |
| `franchisee_id` | `uuid` |  |  |
| `code` | `text` | YES |  |
| `name` | `text` | YES |  |
| `type` | `text` | YES |  |
| `status` | `text` | YES | `'prospect'::text` |
| `opening_status` | `text` | YES | `'not_started'::text` |
| `primary_location_id` | `uuid` |  |  |
| `is_primary` | `boolean` | YES | `false` |
| `external_source` | `text` |  |  |
| `external_ref` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.franchisees`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `franchisees_network_id_fkey` → `platform.franchise_networks`, `franchisees_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `network_id` | `uuid` |  |  |
| `legal_name` | `text` | YES |  |
| `tax_id` | `text` |  |  |
| `status` | `text` | YES | `'prospect'::text` |
| `primary_contact` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.hermes_audit`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `event_type` | `text` | YES |  |
| `task_id` | `text` |  |  |
| `agent` | `text` |  |  |
| `change` | `jsonb` |  |  |
| `timestamp` | `timestamp with time zone` | YES | `now()` |

### `platform.hermes_metrics`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `agent` | `text` | YES |  |
| `sprint` | `integer` |  |  |
| `tasks_completed` | `integer` | YES | `0` |
| `tasks_failed` | `integer` | YES | `0` |
| `avg_duration_ms` | `integer` |  |  |
| `success_rate` | `numeric(5,4)` |  |  |
| `captured_at` | `timestamp with time zone` | YES | `now()` |

### `platform.hermes_state`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (task_id)`
- **UNIQUE:** `hermes_state_idempotency_key_key`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `task_id` | `text` | YES |  |
| `name` | `text` | YES | `''::text` |
| `task_type` | `text` | YES | `'unknown'::text` |
| `state` | `text` | YES |  |
| `assignee` | `text` |  |  |
| `effort` | `text` | YES | `'unknown'::text` |
| `agent` | `text` |  |  |
| `payload` | `jsonb` | YES | `'{}'::jsonb` |
| `started_at` | `timestamp with time zone` |  |  |
| `completed_at` | `timestamp with time zone` |  |  |
| `result` | `jsonb` |  |  |
| `idempotency_key` | `text` |  |  |
| `request_id` | `text` |  |  |
| `tenant_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.hermes_workflows`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (workflow_id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `workflow_id` | `uuid` | YES | `gen_random_uuid()` |
| `name` | `text` | YES |  |
| `status` | `text` | YES | `'PENDING'::text` |
| `steps` | `jsonb` | YES | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.invoice_line_items`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `invoice_line_items_invoice_id_fkey` → `platform.invoices`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `invoice_id` | `uuid` | YES |  |
| `description` | `text` | YES |  |
| `quantity` | `integer` | YES | `1` |
| `unit_price_cents` | `bigint` | YES |  |
| `total_cents` | `bigint` | YES |  |
| `category` | `text` |  |  |
| `sort_order` | `integer` | YES | `0` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.invoices`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `invoices_invoice_number_key`
- **FK:** `invoices_customer_id_fkey` → `platform.customers`, `invoices_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `invoice_number` | `text` | YES |  |
| `customer_id` | `uuid` |  |  |
| `customer_email` | `text` | YES |  |
| `customer_name` | `text` |  |  |
| `status` | `text` | YES | `'draft'::text` |
| `subtotal_cents` | `bigint` | YES | `0` |
| `tax_rate_percent` | `numeric(5,2)` | YES | `0` |
| `tax_cents` | `bigint` | YES | `0` |
| `total_cents` | `bigint` | YES | `0` |
| `currency` | `text` | YES | `'COP'::text` |
| `issue_date` | `date` |  |  |
| `due_date` | `date` |  |  |
| `paid_date` | `date` |  |  |
| `stripe_invoice_id` | `text` |  |  |
| `notes` | `text` |  |  |
| `pdf_storage_path` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.llm_cache`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `llm_cache_tenant_slug_prompt_hash_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `prompt_hash` | `text` | YES |  |
| `prompt_embedding` | `vector(1536)` |  |  |
| `prompt_text` | `text` | YES |  |
| `response` | `text` | YES |  |
| `model_used` | `text` |  |  |
| `quality_score` | `double precision` |  |  |
| `hit_count` | `integer` | YES | `0` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.llm_feedback`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `llm_feedback_conversation_id_fkey` → `platform.conversations`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `conversation_id` | `uuid` | YES |  |
| `message_index` | `integer` |  |  |
| `rating` | `integer` | YES |  |
| `correction` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `tenant_slug` | `text` | YES |  |

### `platform.ls_bookings`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `ls_bookings_customer_id_fkey` → `platform.ls_customers`, `ls_bookings_service_id_fkey` → `platform.ls_services`, `ls_bookings_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `customer_id` | `uuid` |  |  |
| `service_id` | `uuid` |  |  |
| `scheduled_at` | `timestamp with time zone` |  |  |
| `status` | `text` | YES | `'requested'::text` |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `service_location` | `text` |  |  |
| `address` | `text` |  |  |
| `latitude` | `numeric` |  |  |
| `longitude` | `numeric` |  |  |
| `estimated_travel_time_minutes` | `integer` |  |  |
| `photos_after_service` | `text[]` |  |  |
| `equipment_needed` | `text[]` |  |  |
| `completed_at` | `timestamp with time zone` |  |  |

### `platform.ls_customers`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `ls_customers_tenant_email_unique`
- **FK:** `ls_customers_tenant_slug_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `email` | `text` | YES |  |
| `phone` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.ls_quotes`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `ls_quotes_customer_id_fkey` → `platform.ls_customers`, `ls_quotes_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `customer_id` | `uuid` |  |  |
| `amount_cents` | `integer` | YES |  |
| `currency` | `text` | YES | `'USD'::text` |
| `status` | `text` | YES | `'draft'::text` |
| `valid_until` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.ls_reports`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `ls_reports_tenant_slug_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `title` | `text` | YES |  |
| `body` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.ls_services`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `ls_services_tenant_slug_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `description` | `text` |  |  |
| `active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `external_key` | `text` |  |  |
| `duration_minutes` | `integer` |  |  |
| `price_cents` | `integer` |  |  |

### `platform.ls_technician_schedules`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `ls_technician_schedules_tenant_day_unique`
- **FK:** `ls_technician_schedules_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `day_of_week` | `integer` | YES |  |
| `start_time` | `time without time zone` | YES |  |
| `end_time` | `time without time zone` | YES |  |
| `is_available` | `boolean` | YES | `true` |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.ls_technician_service_reports`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `ls_technician_service_reports_booking_id_fkey` → `platform.ls_bookings`, `ls_technician_service_reports_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `booking_id` | `uuid` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `findings` | `text` |  |  |
| `actions_taken` | `text` |  |  |
| `metrics_before` | `jsonb` |  |  |
| `metrics_after` | `jsonb` |  |  |
| `recommendations` | `text` |  |  |
| `before_photos` | `text[]` |  |  |
| `after_photos` | `text[]` |  |  |
| `equipment_used` | `text[]` |  |  |
| `time_spent_minutes` | `integer` |  |  |
| `travel_distance_miles` | `numeric` |  |  |
| `customer_satisfaction` | `integer` |  |  |
| `upsell_offered` | `text` |  |  |
| `next_maintenance_date` | `date` |  |  |
| `pdf_url` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.metering_events`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `metering_events_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `metric_type` | `text` | YES |  |
| `quantity` | `integer` | YES |  |
| `reported_at` | `timestamp with time zone` | YES | `now()` |
| `period_month` | `date` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.metering_pricing`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `metering_pricing_metric_type_key`

| column | type | not null | default |
|---|---|---|---|
| `id` | `text` | YES |  |
| `metric_type` | `text` | YES |  |
| `unit_price_cents` | `bigint` | YES |  |
| `description` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.metrics_log`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `metric_name` | `text` | YES |  |
| `metric_type` | `text` | YES |  |
| `metric_value` | `numeric` | YES |  |
| `component` | `text` | YES |  |
| `tenant_slug` | `text` | YES | `'system'::text` |
| `tags` | `jsonb` |  |  |
| `timestamp` | `timestamp with time zone` | YES | `now()` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.ml_model_snapshots`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `ml_model_snapshots_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` |  |  |
| `model_key` | `text` | YES |  |
| `version` | `integer` | YES | `1` |
| `payload` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.n8n_marketplace_installs`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `n8n_marketplace_installs_tenant_id_catalog_item_id_key`
- **FK:** `n8n_marketplace_installs_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `catalog_item_id` | `text` | YES |  |
| `catalog_version` | `text` | YES | `'1.0.0'::text` |
| `status` | `text` | YES | `'activated'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.opening_checklists`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `opening_checklists_tenant_id_fkey` → `platform.tenants`, `opening_checklists_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `phase` | `text` | YES |  |
| `status` | `text` | YES | `'not_started'::text` |
| `started_at` | `timestamp with time zone` |  |  |
| `completed_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.opening_tasks`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `opening_tasks_checklist_id_fkey` → `platform.opening_checklists`, `opening_tasks_tenant_id_fkey` → `platform.tenants`, `opening_tasks_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `checklist_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `phase` | `text` | YES |  |
| `name` | `text` | YES |  |
| `owner` | `text` |  |  |
| `due_date` | `timestamp with time zone` |  |  |
| `required` | `boolean` | YES | `true` |
| `status` | `text` | YES | `'todo'::text` |
| `evidence` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.peskids_aging_alert_deliveries`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `peskids_aging_alert_deliveries_idempotency_key_unique`
- **FK:** `peskids_aging_alert_deliveries_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `alert_kind` | `text` | YES |  |
| `entity_type` | `text` | YES |  |
| `entity_id` | `uuid` | YES |  |
| `idempotency_key` | `text` | YES |  |
| `status` | `text` | YES | `'pending'::text` |
| `detail` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `sent_at` | `timestamp with time zone` |  |  |

### `platform.peskids_feedback`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `peskids_feedback_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `child_name` | `text` | YES |  |
| `satisfaction` | `smallint` | YES |  |
| `suggestion` | `text` |  |  |
| `contact_me_back` | `boolean` | YES | `false` |
| `status` | `text` | YES | `'new'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.peskids_franchise_locations`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `peskids_franchise_locations_franchise_id_slug_key`
- **FK:** `peskids_franchise_locations_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `franchise_id` | `uuid` | YES |  |
| `slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `kind` | `text` | YES | `'pool'::text` |
| `address` | `text` |  |  |
| `city` | `text` |  |  |
| `active` | `boolean` | YES | `true` |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.peskids_franchise_staff_memberships`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `peskids_franchise_staff_membershi_franchise_id_user_id_role_key`
- **FK:** `peskids_franchise_staff_memberships_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `franchise_id` | `uuid` | YES |  |
| `user_id` | `uuid` | YES |  |
| `role` | `text` | YES |  |
| `active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.peskids_franchises`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `peskids_franchises_tenant_slug_slug_key`
- **FK:** `peskids_franchises_parent_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `type` | `text` | YES | `'owned'::text` |
| `status` | `text` | YES | `'active'::text` |
| `parent_franchise_id` | `uuid` |  |  |
| `is_primary` | `boolean` | YES | `false` |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.peskids_lead_email_deliveries`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `peskids_lead_email_deliveries_idempotency_key_unique`
- **FK:** `peskids_lead_email_deliveries_lead_id_fkey` → `platform.peskids_leads`, `peskids_lead_email_deliveries_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `lead_id` | `uuid` | YES |  |
| `email_type` | `text` | YES | `'lead_confirmation'::text` |
| `idempotency_key` | `text` | YES |  |
| `status` | `text` | YES | `'pending'::text` |
| `to_email` | `text` | YES |  |
| `provider_message_id` | `text` |  |  |
| `error_detail` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `sent_at` | `timestamp with time zone` |  |  |

### `platform.peskids_leads`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `peskids_leads_franchise_id_fkey` → `platform.peskids_franchises`, `peskids_leads_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 7 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `full_name` | `text` | YES |  |
| `email` | `text` | YES |  |
| `phone` | `text` |  |  |
| `grade_interested` | `text` | YES |  |
| `referral_source` | `text` |  |  |
| `status` | `text` | YES | `'new'::text` |
| `admin_notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `class_modality` | `text` |  |  |
| `neighborhood` | `text` |  |  |
| `lead_id` | `text` |  |  |
| `source` | `text` |  |  |
| `stage` | `text` |  |  |
| `parent_name` | `text` |  |  |
| `child_name` | `text` |  |  |
| `age` | `integer` |  |  |
| `interest` | `text` |  |  |
| `event_id` | `text` |  |  |
| `automation_ready` | `boolean` | YES | `false` |
| `last_contacted_at` | `timestamp with time zone` |  |  |
| `followup_log` | `jsonb` |  | `'[]'::jsonb` |
| `followup_sent` | `boolean` | YES | `false` |
| `twenty_person_id` | `text` |  |  |
| `twenty_opportunity_id` | `text` |  |  |
| `twenty_sync_status` | `text` |  |  |
| `twenty_sync_error` | `text` |  |  |
| `twenty_synced_at` | `timestamp with time zone` |  |  |
| `franchise_id` | `uuid` |  |  |
| `lead_type` | `text` | YES | `'family'::text` |
| `service_mode` | `text` |  |  |
| `birth_date` | `date` |  |  |
| `document_type` | `text` |  |  |
| `document_number` | `text` |  |  |
| `company_name` | `text` |  |  |
| `company_nit` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |

### `platform.peskids_messages`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `peskids_messages_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `thread_id` | `text` | YES |  |
| `source` | `text` | YES | `'whatsapp'::text` |
| `inbound_content` | `text` | YES |  |
| `parent_name` | `text` |  |  |
| `child_name` | `text` |  |  |
| `suggested_response` | `text` |  |  |
| `status` | `text` | YES | `'pending_approval'::text` |
| `approved_at` | `timestamp with time zone` |  |  |
| `approved_by` | `text` |  |  |
| `modified_response` | `text` |  |  |
| `rejection_reason` | `text` |  |  |
| `sent_at` | `timestamp with time zone` |  |  |
| `n8n_webhook_response` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.port_allocations`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (port)`
- **FK:** `port_allocations_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `port` | `integer` | YES |  |
| `tenant_id` | `uuid` |  |  |
| `service` | `text` | YES |  |
| `allocated_at` | `timestamp with time zone` |  | `now()` |

### `platform.research_artifacts`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `research_artifacts_research_run_id_key`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `research_run_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `request_id` | `text` |  |  |
| `query` | `text` | YES |  |
| `depth` | `text` | YES | `'standard'::text` |
| `topic_context` | `text` |  |  |
| `sources` | `jsonb` | YES | `'[]'::jsonb` |
| `synthesis` | `text` |  |  |
| `answer` | `text` |  |  |
| `source_count` | `integer` | YES | `0` |
| `avg_relevance_score` | `double precision` |  |  |
| `duration_ms` | `integer` |  |  |
| `initiated_by` | `text` | YES |  |
| `status` | `text` | YES | `'completed'::text` |
| `error` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `completed_at` | `timestamp with time zone` |  |  |

### `platform.royalty_calculations`

- **RLS:** enabled · **policies:** 4
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `royalty_calculations_tenant_id_unit_id_sales_report_id_rule_key`
- **FK:** `royalty_calculations_sales_report_id_fkey` → `platform.sales_reports`, `royalty_calculations_tenant_id_fkey` → `platform.tenants`, `royalty_calculations_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `sales_report_id` | `uuid` | YES |  |
| `rule_id` | `uuid` | YES |  |
| `rule_version` | `integer` | YES |  |
| `basis` | `text` | YES |  |
| `reported_sales` | `numeric(18,2)` | YES |  |
| `exclusions` | `numeric(18,2)` | YES | `0` |
| `royalty_base` | `numeric(18,2)` | YES |  |
| `percentage` | `numeric(10,4)` | YES |  |
| `percentage_amount` | `numeric(18,2)` | YES |  |
| `fixed_fee` | `numeric(18,2)` | YES | `0` |
| `minimum_applied` | `boolean` | YES | `false` |
| `royalty_due` | `numeric(18,2)` | YES |  |
| `currency` | `text` | YES |  |
| `status` | `text` | YES | `'pending'::text` |
| `inputs` | `jsonb` | YES | `'{}'::jsonb` |
| `calculation` | `jsonb` | YES | `'{}'::jsonb` |
| `result` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.royalty_payments`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `royalty_payments_calculation_id_fkey` → `platform.royalty_calculations`, `royalty_payments_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `calculation_id` | `uuid` | YES |  |
| `amount` | `numeric(18,2)` | YES |  |
| `currency` | `text` | YES |  |
| `status` | `text` | YES | `'pending'::text` |
| `method` | `text` |  |  |
| `external_reference` | `text` |  |  |
| `scheduled_at` | `timestamp with time zone` |  |  |
| `paid_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.royalty_rules`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `royalty_rules_tenant_id_rule_id_version_key`
- **FK:** `royalty_rules_network_id_fkey` → `platform.franchise_networks`, `royalty_rules_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 7 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `network_id` | `uuid` |  |  |
| `rule_id` | `uuid` | YES | `gen_random_uuid()` |
| `version` | `integer` | YES |  |
| `name` | `text` | YES |  |
| `basis` | `text` | YES |  |
| `percentage` | `numeric(10,4)` | YES |  |
| `minimum_amount` | `numeric(18,2)` |  |  |
| `fixed_fee` | `numeric(18,2)` |  |  |
| `currency` | `text` | YES |  |
| `frequency` | `text` | YES | `'monthly'::text` |
| `excluded_categories` | `jsonb` | YES | `'[]'::jsonb` |
| `tax_treatment` | `text` | YES | `'exclusive'::text` |
| `effective_from` | `timestamp with time zone` | YES |  |
| `effective_to` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.sales_reports`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `sales_reports_tenant_id_unit_id_period_start_source_key`
- **FK:** `sales_reports_tenant_id_fkey` → `platform.tenants`, `sales_reports_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` | YES |  |
| `period_start` | `timestamp with time zone` | YES |  |
| `period_end` | `timestamp with time zone` | YES |  |
| `gross_sales` | `numeric(18,2)` | YES | `0` |
| `refunds` | `numeric(18,2)` | YES | `0` |
| `taxes` | `numeric(18,2)` | YES | `0` |
| `excluded_sales` | `numeric(18,2)` | YES | `0` |
| `net_sales` | `numeric(18,2)` | YES | `0` |
| `currency` | `text` | YES |  |
| `source` | `text` | YES |  |
| `source_reference` | `text` |  |  |
| `status` | `text` | YES | `'draft'::text` |
| `submitted_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.sandbox_execution_logs`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `sandbox_execution_logs_sandbox_run_id_key`
- **FK:** `sandbox_execution_logs_approval_id_fkey` → `platform.approval_gate_decisions`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `sandbox_run_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `request_id` | `text` |  |  |
| `command` | `text` | YES |  |
| `image` | `text` | YES |  |
| `allow_network` | `boolean` | YES | `false` |
| `timeout_seconds` | `integer` | YES | `300` |
| `status` | `text` | YES | `'pending'::text` |
| `stdout` | `text` |  |  |
| `stderr` | `text` |  |  |
| `exit_code` | `integer` |  |  |
| `duration_ms` | `integer` |  |  |
| `policy_snapshot` | `jsonb` | YES |  |
| `approval_id` | `uuid` |  |  |
| `initiated_by` | `text` | YES |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `started_at` | `timestamp with time zone` |  |  |
| `completed_at` | `timestamp with time zone` |  |  |

### `platform.shield_alert_config`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `shield_alert_config_tenant_type_unique`
- **FK:** `shield_alert_config_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `alert_type` | `text` | YES |  |
| `webhook_url` | `text` |  |  |
| `threshold` | `jsonb` |  |  |
| `enabled` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.shield_score_history`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `shield_score_history_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `score` | `integer` |  |  |
| `breakdown` | `jsonb` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.shield_secret_findings`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `shield_secret_findings_tenant_slug_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `repo_url` | `text` |  |  |
| `secret_type` | `text` |  |  |
| `file_path` | `text` |  |  |
| `line_number` | `integer` |  |  |
| `severity` | `text` | YES | `'critical'::text` |
| `status` | `text` | YES | `'open'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.sprints`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `sprints_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `goal` | `text` | YES |  |
| `status` | `platform.sprint_status` | YES | `'planning'::platform.sprint_status` |
| `steps` | `jsonb` | YES | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.stripe_sync_logs`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `stripe_sync_logs_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `event_type` | `text` | YES |  |
| `stripe_object_id` | `text` |  |  |
| `tenant_id` | `uuid` |  |  |
| `status` | `text` | YES | `'success'::text` |
| `error_message` | `text` |  |  |
| `synced_at` | `timestamp with time zone` | YES | `now()` |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.subscriptions`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `subscriptions_stripe_event_id_key`
- **FK:** `subscriptions_tenant_id_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `stripe_event_id` | `text` | YES |  |
| `stripe_status` | `text` | YES |  |
| `current_period_end` | `timestamp with time zone` |  |  |
| `plan` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `last_invoice_at` | `timestamp with time zone` |  |  |
| `last_invoice_pdf` | `text` |  |  |

### `platform.supplier_requirements`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `supplier_requirements_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `category` | `text` | YES |  |
| `name` | `text` | YES |  |
| `required` | `text` | YES | `'recommended'::text` |
| `document_ref` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.support_cases`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `support_cases_tenant_id_fkey` → `platform.tenants`, `support_cases_unit_id_fkey` → `platform.franchise_units`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `unit_id` | `uuid` |  |  |
| `category` | `text` | YES |  |
| `priority` | `text` | YES | `'medium'::text` |
| `status` | `text` | YES | `'open'::text` |
| `sla` | `text` |  |  |
| `assigned_to` | `text` |  |  |
| `resolution` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_budgets`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `tenant_budgets_tenant_slug_key`
- **FK:** `fk_tenant_budgets_slug` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `monthly_cap_usd` | `numeric(10,2)` | YES |  |
| `alert_threshold_pct` | `integer` | YES | `80` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_embeddings`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `content` | `text` | YES |  |
| `embedding` | `vector(1536)` |  |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `platform.tenant_entitlements`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `tenant_entitlements_tenant_id_module_id_key`
- **FK:** `tenant_entitlements_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `module_id` | `text` | YES |  |
| `enabled` | `boolean` | YES | `true` |
| `source` | `text` | YES | `'manual'::text` |
| `granted_by` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_insights`

- **RLS:** enabled · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **FK:** `tenant_insights_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `insight_type` | `text` | YES |  |
| `title` | `text` | YES |  |
| `summary` | `text` | YES | `''::text` |
| `payload` | `jsonb` | YES | `'{}'::jsonb` |
| `confidence` | `numeric(6,5)` | YES | `0` |
| `impact_score` | `integer` | YES | `0` |
| `status` | `text` | YES | `'active'::text` |
| `read_at` | `timestamp with time zone` |  |  |
| `actioned_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_limits`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `tenant_limits_unique_period`
- **FK:** `tenant_limits_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `metric_type` | `text` | YES |  |
| `period_label` | `text` | YES |  |
| `quota_limit` | `numeric(20,8)` | YES |  |
| `usage_current` | `numeric(20,8)` | YES | `0` |
| `is_exceeded` | `boolean` | YES | `false` |
| `exceeded_at` | `timestamp with time zone` |  |  |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_memberships`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `tenant_memberships_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `user_id` | `uuid` |  |  |
| `email` | `text` | YES |  |
| `role` | `text` | YES |  |
| `status` | `text` | YES | `'active'::text` |
| `invited_by` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_service_accounts`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `tenant_service_accounts_tenant_id_name_key`
- **FK:** `tenant_service_accounts_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `name` | `text` | YES |  |
| `kind` | `text` | YES | `'agent'::text` |
| `agent_role` | `text` |  |  |
| `status` | `text` | YES | `'active'::text` |
| `scopes` | `text[]` | YES | `ARRAY[]::text[]` |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |
| `last_used_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenant_webhooks`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `tenant_webhooks_tenant_slug_fkey` → `platform.tenants`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `url` | `text` | YES |  |
| `secret` | `text` | YES |  |
| `events` | `text[]` | YES | `'{}'::text[]` |
| `active` | `boolean` | YES | `true` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.tenants`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `tenants_slug_key`
- **CHECK:** 5 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `slug` | `text` | YES |  |
| `name` | `text` | YES |  |
| `owner_email` | `text` | YES |  |
| `plan` | `text` | YES |  |
| `status` | `text` | YES | `'provisioning'::text` |
| `progress` | `integer` |  | `0` |
| `stripe_customer_id` | `text` |  |  |
| `stripe_subscription_id` | `text` |  |  |
| `doppler_project` | `text` |  |  |
| `services` | `jsonb` |  | `'{}'::jsonb` |
| `is_demo` | `boolean` |  | `false` |
| `demo_expires_at` | `timestamp with time zone` |  |  |
| `metadata` | `jsonb` |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `deleted_at` | `timestamp with time zone` |  |  |
| `tech_stack` | `jsonb` |  | `'{}'::jsonb` |
| `coding_standards` | `text` |  |  |
| `vector_namespace` | `text` |  |  |
| `domain` | `text` |  |  |
| `locale` | `text` | YES | `'en-US'::text` |
| `currency` | `text` | YES | `'USD'::text` |
| `timezone` | `text` | YES | `'UTC'::text` |
| `branding_logo_url` | `text` |  |  |

### `platform.training_requirements`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `training_requirements_tenant_id_fkey` → `platform.tenants`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES |  |
| `role` | `text` | YES |  |
| `course_id` | `text` |  |  |
| `external_ref` | `text` |  |  |
| `name` | `text` | YES |  |
| `required` | `boolean` | YES | `true` |
| `valid_for_months` | `integer` |  |  |
| `certification_required` | `boolean` | YES | `false` |
| `status` | `text` | YES | `'not_started'::text` |
| `completed_at` | `timestamp with time zone` |  |  |
| `expires_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `platform.usage_events`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES |  |
| `model` | `text` | YES |  |
| `tokens_input` | `integer` | YES | `0` |
| `tokens_output` | `integer` | YES | `0` |
| `cost_usd` | `numeric(10,6)` | YES | `0` |
| `cache_hit` | `boolean` | YES | `false` |
| `session_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `quality_score` | `double precision` |  |  |
| `request_id` | `text` |  |  |
| `user_id` | `text` |  |  |
| `feature` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |

---

## Schema `public`

### `public.agent_execution_patterns`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `agent_role` | `text` | YES |  |
| `intent` | `text` | YES |  |
| `prompt_pattern` | `text` |  |  |
| `success_rate` | `double precision` |  | `0.0` |
| `avg_iterations` | `integer` |  | `1` |
| `total_executions` | `integer` |  | `0` |
| `common_errors` | `text[]` |  | `'{}'::text[]` |
| `typical_sequence` | `text[]` |  | `'{}'::text[]` |
| `last_updated` | `timestamp with time zone` |  | `now()` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `public.calls`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **UNIQUE:** `calls_call_id_key`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `call_id` | `text` | YES |  |
| `initiator_contact` | `text` | YES |  |
| `recipient_contact` | `text` | YES |  |
| `channel` | `text` | YES |  |
| `call_state` | `text` | YES |  |
| `started_at` | `timestamp with time zone` |  |  |
| `ended_at` | `timestamp with time zone` |  |  |
| `duration_seconds` | `integer` |  |  |
| `recording_url` | `text` |  |  |
| `recording_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |

### `public.feedback`

- **RLS:** enabled · **policies:** 8
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 7 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `child_name` | `text` | YES |  |
| `satisfaction` | `integer` | YES |  |
| `suggestion` | `text` |  |  |
| `contact_wanted` | `boolean` |  | `false` |
| `parent_email` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `author_type` | `text` | YES | `'parent'::text` |
| `author_ref_id` | `uuid` |  |  |
| `subject_type` | `text` | YES | `'student'::text` |
| `subject_ref_id` | `uuid` |  |  |
| `body` | `text` |  |  |
| `rating` | `smallint` |  |  |
| `status` | `text` | YES | `'new'::text` |
| `ai_summary` | `text` |  |  |
| `visibility` | `text` | YES | `'public'::text` |
| `audience` | `text` | YES | `'family'::text` |

### `public.followups`

- **RLS:** enabled · **policies:** 5
- **PK:** `PRIMARY KEY (id)`
- **FK:** `followups_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `contact_id` | `uuid` | YES |  |
| `contact_type` | `text` | YES |  |
| `type` | `text` | YES |  |
| `due_date` | `date` | YES |  |
| `status` | `text` | YES | `'pending'::text` |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `twenty_task_id` | `text` |  |  |
| `sync_status` | `text` |  |  |
| `sync_error` | `text` |  |  |
| `retry_count` | `integer` | YES | `0` |
| `assigned_to` | `text` |  |  |
| `franchise_id` | `uuid` |  |  |

### `public.intcloudsysops_accounts`

- **RLS:** enabled · **policies:** 4
- **PK:** `PRIMARY KEY (id)`
- **FK:** `intcloudsysops_accounts_created_by_fkey` → `auth.users`, `intcloudsysops_accounts_updated_by_fkey` → `auth.users`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'intcloudsysops'::text` |
| `name` | `text` | YES |  |
| `account_type` | `text` | YES |  |
| `status` | `text` | YES | `'active'::text` |
| `billing_email` | `text` |  |  |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `created_by` | `uuid` |  |  |
| `updated_by` | `uuid` |  |  |

### `public.intcloudsysops_contacts`

- **RLS:** enabled · **policies:** 4
- **PK:** `PRIMARY KEY (id)`
- **FK:** `intcloudsysops_contacts_account_id_fkey` → `public.intcloudsysops_accounts`, `intcloudsysops_contacts_created_by_fkey` → `auth.users`, `intcloudsysops_contacts_updated_by_fkey` → `auth.users`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'intcloudsysops'::text` |
| `account_id` | `uuid` | YES |  |
| `email` | `text` |  |  |
| `phone` | `text` |  |  |
| `full_name` | `text` | YES |  |
| `role` | `text` |  |  |
| `status` | `text` | YES | `'active'::text` |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `created_by` | `uuid` |  |  |
| `updated_by` | `uuid` |  |  |
| `twenty_person_id` | `text` |  |  |
| `source_form` | `text` |  |  |

### `public.intcloudsysops_deals`

- **RLS:** enabled · **policies:** 4
- **PK:** `PRIMARY KEY (id)`
- **FK:** `intcloudsysops_deals_account_id_fkey` → `public.intcloudsysops_accounts`, `intcloudsysops_deals_created_by_fkey` → `auth.users`, `intcloudsysops_deals_owner_id_fkey` → `auth.users`, `intcloudsysops_deals_updated_by_fkey` → `auth.users`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'intcloudsysops'::text` |
| `account_id` | `uuid` | YES |  |
| `title` | `text` | YES |  |
| `value` | `numeric(15,2)` |  |  |
| `currency` | `text` |  | `'USD'::text` |
| `stage` | `text` | YES | `'prospecting'::text` |
| `close_date` | `date` |  |  |
| `owner_id` | `uuid` |  |  |
| `probability_pct` | `numeric(3,0)` |  |  |
| `notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `created_by` | `uuid` |  |  |
| `updated_by` | `uuid` |  |  |
| `twenty_opportunity_id` | `text` |  |  |

### `public.intcloudsysops_feedback`

- **RLS:** enabled · **policies:** 3
- **PK:** `PRIMARY KEY (id)`
- **FK:** `intcloudsysops_feedback_account_id_fkey` → `public.intcloudsysops_accounts`, `intcloudsysops_feedback_created_by_fkey` → `auth.users`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'intcloudsysops'::text` |
| `account_id` | `uuid` | YES |  |
| `rating` | `numeric(2,1)` |  |  |
| `category` | `text` |  |  |
| `message` | `text` | YES |  |
| `status` | `text` | YES | `'new'::text` |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `created_by` | `uuid` |  |  |

### `public.intcloudsysops_followups`

- **RLS:** enabled · **policies:** 3
- **PK:** `PRIMARY KEY (id)`
- **FK:** `intcloudsysops_followups_assigned_to_fkey` → `auth.users`, `intcloudsysops_followups_created_by_fkey` → `auth.users`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'intcloudsysops'::text` |
| `related_type` | `text` | YES |  |
| `related_id` | `uuid` | YES |  |
| `title` | `text` | YES |  |
| `description` | `text` |  |  |
| `due_at` | `timestamp with time zone` | YES |  |
| `assigned_to` | `uuid` |  |  |
| `priority` | `text` | YES | `'medium'::text` |
| `status` | `text` | YES | `'open'::text` |
| `completed_at` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `created_by` | `uuid` |  |  |

### `public.lead_status_audit`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_slug` | `text` | YES | `'peskids'::text` |
| `lead_id` | `uuid` | YES |  |
| `old_status` | `text` |  |  |
| `new_status` | `text` | YES |  |
| `changed_by` | `text` |  |  |
| `action` | `text` | YES |  |
| `metadata` | `jsonb` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |

### `public.leads`

- **RLS:** enabled (FORCE) · **policies:** 12
- **PK:** `PRIMARY KEY (id)`
- **FK:** `leads_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `name` | `text` | YES |  |
| `email` | `text` | YES |  |
| `phone` | `text` |  |  |
| `grade_interested` | `text` | YES |  |
| `referral_source` | `text` |  |  |
| `status` | `text` | YES | `'new'::text` |
| `admin_notes` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `class_modality` | `text` |  |  |
| `neighborhood` | `text` |  |  |
| `referral_code` | `text` |  |  |
| `referred_by_code` | `text` |  |  |
| `referral_discount_cents` | `integer` | YES | `0` |
| `referral_redemptions` | `integer` | YES | `0` |
| `created_by` | `uuid` |  |  |
| `franchise_id` | `uuid` |  |  |
| `lead_type` | `text` | YES | `'family'::text` |
| `service_mode` | `text` |  |  |
| `child_name` | `text` |  |  |
| `birth_date` | `date` |  |  |
| `document_type` | `text` |  |  |
| `document_number` | `text` |  |  |
| `company_name` | `text` |  |  |
| `company_nit` | `text` |  |  |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |

### `public.messages`

- **RLS:** enabled · **policies:** 5
- **PK:** `PRIMARY KEY (id)`
- **FK:** `messages_franchise_id_fkey` → `platform.peskids_franchises`, `messages_parent_message_id_fkey` → `public.messages`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `source` | `text` | YES |  |
| `sender_name` | `text` |  |  |
| `sender_contact` | `text` | YES |  |
| `message_text` | `text` | YES |  |
| `external_id` | `text` |  |  |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `direction` | `text` | YES | `'inbound'::text` |
| `parent_message_id` | `uuid` |  |  |
| `status` | `text` |  |  |
| `ai_generated` | `boolean` | YES | `false` |
| `audio_url` | `text` |  |  |
| `audio_duration_seconds` | `integer` |  |  |
| `transcript` | `text` |  |  |
| `franchise_id` | `uuid` |  |  |

### `public.staff_improvement_messages`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 4 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES | `'peskids'::text` |
| `role` | `text` | YES |  |
| `author_email` | `text` |  |  |
| `body` | `text` | YES |  |
| `category` | `text` |  |  |
| `priority` | `text` |  |  |
| `ai_summary` | `text` |  |  |
| `twenty_task_id` | `text` |  |  |
| `status` | `text` | YES | `'new'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `attachments` | `jsonb` | YES | `'[]'::jsonb` |
| `operator_notes` | `text` |  |  |
| `linked_pr` | `text` |  |  |
| `linked_issue` | `text` |  |  |
| `agent_ticket` | `jsonb` |  |  |

### `public.students`

- **RLS:** enabled · **policies:** 6
- **PK:** `PRIMARY KEY (id)`
- **FK:** `students_franchise_id_fkey` → `platform.peskids_franchises`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `name` | `text` | YES |  |
| `grade` | `text` | YES |  |
| `status` | `text` | YES | `'active'::text` |
| `parent_email` | `text` |  |  |
| `enrollment_date` | `date` | YES | `CURRENT_DATE` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `family_user_id` | `uuid` |  |  |
| `source_lead_id` | `uuid` |  |  |
| `parent_phone` | `text` |  |  |
| `notes` | `text` |  |  |
| `franchise_id` | `uuid` |  |  |

### `public.tenant_settings`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (tenant_id)`
- **CHECK:** 3 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `tenant_id` | `text` | YES |  |
| `academy_name` | `text` | YES | `'Peskids'::text` |
| `sede_label` | `text` | YES | `'Llanogrande'::text` |
| `support_email` | `text` |  |  |
| `support_phone` | `text` |  |  |
| `default_modality` | `text` | YES | `'llanogrande'::text` |
| `default_capacity` | `integer` | YES | `8` |
| `default_price_cents` | `integer` | YES | `85000` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### `public.trial_classes`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`
- **FK:** `trial_classes_franchise_id_fkey` → `platform.peskids_franchises`, `trial_classes_student_id_fkey` → `public.students`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES | `'peskids'::text` |
| `lead_id` | `uuid` | YES |  |
| `student_id` | `uuid` |  |  |
| `scheduled_date` | `date` | YES |  |
| `scheduled_time` | `time without time zone` | YES |  |
| `modality` | `text` | YES |  |
| `teacher_name` | `text` |  |  |
| `notes` | `text` |  |  |
| `status` | `text` | YES | `'scheduled'::text` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |
| `franchise_id` | `uuid` |  |  |

### `public.validation_metrics`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 2 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `job_id` | `text` | YES |  |
| `intent` | `text` | YES |  |
| `agent_role` | `text` | YES |  |
| `action` | `text` | YES |  |
| `iteration_count` | `integer` |  | `1` |
| `validation_time_ms` | `integer` |  | `0` |
| `failed_checks` | `text[]` |  | `'{}'::text[]` |
| `model_tier` | `text` |  | `'balanced'::text` |
| `cost_usd` | `numeric(10,4)` |  | `0` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `public.voice_transcriptions`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **FK:** `voice_transcriptions_call_id_fkey` → `public.calls`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `call_id` | `uuid` | YES |  |
| `speaker_role` | `text` | YES |  |
| `transcript_text` | `text` |  |  |
| `confidence` | `double precision` |  |  |
| `timestamp` | `timestamp with time zone` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |

### `public.webhook_logs`

- **RLS:** enabled · **policies:** 2
- **PK:** `PRIMARY KEY (id)`
- **CHECK:** 1 constraint(s)

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `tenant_id` | `text` | YES |  |
| `provider` | `text` | YES |  |
| `event_type` | `text` | YES |  |
| `record_id` | `uuid` |  |  |
| `payload` | `jsonb` | YES |  |
| `status` | `text` | YES | `'received'::text` |
| `error_message` | `text` |  |  |
| `received_at` | `timestamp with time zone` | YES | `now()` |
| `processed_at` | `timestamp with time zone` |  |  |

---

## Schema `sandbox`

### `sandbox.agent_classifiers`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `integer` | YES | `nextval('sandbox.agent_classifiers_id_seq'::regclass)` |
| `name` | `character varying(255)` | YES |  |
| `model_path` | `character varying(500)` |  |  |
| `accuracy` | `double precision` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `updated_at` | `timestamp with time zone` |  | `now()` |
| `model_type` | `character varying(50)` |  | `'naive_bayes'::character varying` |
| `precision_score` | `double precision` |  |  |
| `recall_score` | `double precision` |  |  |
| `f1_score` | `double precision` |  |  |
| `num_samples` | `integer` |  |  |

### `sandbox.agent_metrics`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `integer` | YES | `nextval('sandbox.agent_metrics_id_seq'::regclass)` |
| `agent_name` | `character varying(255)` |  |  |
| `task_input` | `text` |  |  |
| `predicted_label` | `character varying(100)` |  |  |
| `confidence` | `double precision` |  |  |
| `actual_label` | `character varying(100)` |  |  |
| `correct` | `boolean` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `predicted_category` | `character varying(100)` |  |  |
| `predicted_confidence` | `double precision` |  |  |
| `execution_time_ms` | `integer` |  |  |
| `tenant_slug` | `character varying(255)` |  | `'intcloudsysops'::character varying` |

### `sandbox.agent_task_results`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `persona` | `text` | YES |  |
| `run_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `result_summary` | `text` |  |  |
| `success` | `boolean` | YES | `false` |
| `duration_ms` | `integer` |  |  |
| `completed_at` | `timestamp with time zone` |  | `now()` |
| `created_at` | `timestamp with time zone` |  | `now()` |

### `sandbox.agent_training_datasets`

- **RLS:** **disabled** · **policies:** 0
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `integer` | YES | `nextval('sandbox.agent_training_datasets_id_seq'::regclass)` |
| `agent_name` | `character varying(255)` |  |  |
| `task_category` | `character varying(100)` |  |  |
| `description` | `text` |  |  |
| `expected_label` | `character varying(100)` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
| `task_description` | `text` |  |  |
| `data_source` | `character varying(100)` |  | `'synthetic'::character varying` |

### `sandbox.agent_watcher_metrics`

- **RLS:** enabled · **policies:** 1
- **PK:** `PRIMARY KEY (id)`

| column | type | not null | default |
|---|---|---|---|
| `id` | `uuid` | YES | `gen_random_uuid()` |
| `run_id` | `text` | YES |  |
| `tenant_slug` | `text` | YES |  |
| `metrics_json` | `jsonb` |  |  |
| `created_at` | `timestamp with time zone` |  | `now()` |
