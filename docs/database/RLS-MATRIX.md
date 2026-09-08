---
status: generated
owner: devops
generated_by: tools/db-assurance/analyze.mjs
date: 2026-09-05
---

# RLS Policy Matrix

> **Generated artifact — do not hand-edit.** Regenerate with
> `tools/db-assurance/run-audit.sh`.
>
> **Source of truth:** this describes the schema produced by replaying the
> committed migration chains (`supabase/migrations/` + `apps/peskids/migrations/`)
> into a clean, local, ephemeral Postgres. It is **not** a dump of staging or
> production. Nothing in this repository proves the live databases match it —
> confirming that requires dashboard/API access to Supabase project
> `jkwykpldnitavhmtuzmo`, which the audit that produced this file did not have.

>
> `service-only` marks a table whose only policies target `service_role`.
> `service_role` is **BYPASSRLS** in Supabase, so such a table is not protected
> by RLS at all — it is protected by keeping the service key off the client.

## Coverage matrix

Legend — **S**/**I**/**U**/**D** = a SELECT / INSERT / UPDATE / DELETE policy
exists (an `ALL` policy counts for all four). A blank cell means that command
is **denied** for every non-BYPASSRLS role.

| table | RLS | pol | S | I | U | D | non-service roles |
|---|---|---:|:-:|:-:|:-:|:-:|---|
| `defense.audits` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `defense.compliance_requirements` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `defense.pentest_results` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `defense.security_events` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `defense.vulnerabilities` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `governance.agreements` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `governance.breach_log` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `governance.consents` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `governance.dsar_requests` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `governance.retention_schedule` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.affiliate_clicks` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.collection_items` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.conversation_events` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.polymarket_markets` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.value_signals` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.wc_fixtures` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.wc_match_predictions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.wc_player_predictions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.wc_players` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.wc_results` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `panini_lab.wc_teams` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.audit_log` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.class_enrollments` | on | 3 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.classes` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.form_analytics` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.form_deliveries` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.form_fields` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.form_responses` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.form_submissions` | on | 3 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.form_templates` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.forms` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.notification_preferences` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.notifications` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.payments` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.point_transactions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.pools` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.push_subscriptions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.referral_clicks` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.referral_links` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.referral_redemptions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.store_cart_items` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.store_order_items` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.store_orders` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.store_products` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.student_badges` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.student_points` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.submission_events` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `peskids.subscription_payments` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.subscriptions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `peskids.webhook_configs` | on | 3 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.agent_episode_logs` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `platform.agent_executions` | on | 0 |  |  |  |  | _service-only_ |
| `platform.agent_teams` | on | 0 |  |  |  |  | _service-only_ |
| `platform.api_keys` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.approval_gate_decisions` | on | 0 |  |  |  |  | _service-only_ |
| `platform.approval_gate_embeddings` | on | 0 |  |  |  |  | _service-only_ |
| `platform.approved_suppliers` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.audit_events` | on | 4 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.audit_findings` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.audit_log` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.audit_templates` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.audits` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.billing_plans` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.billing_subscriptions` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.billing_usage` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.brand_standards` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.conversations` | on | 0 |  |  |  |  | _service-only_ |
| `platform.conversion_events` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.corrective_actions` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.customers` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.evolution_gap_analyses` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.evolution_proposals` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.feedback_conversations` | on | 0 |  |  |  |  | _service-only_ |
| `platform.feedback_decisions` | on | 0 |  |  |  |  | _service-only_ |
| `platform.feedback_messages` | on | 0 |  |  |  |  | _service-only_ |
| `platform.franchise_agreement_units` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchise_agreements` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchise_documents` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchise_locations` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchise_networks` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchise_territories` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchise_units` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.franchisees` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.hermes_audit` | on | 1 |  |  | ✓ |  | `PUBLIC` |
| `platform.hermes_metrics` | on | 0 |  |  |  |  | _service-only_ |
| `platform.hermes_state` | on | 0 |  |  |  |  | _service-only_ |
| `platform.hermes_workflows` | on | 0 |  |  |  |  | _service-only_ |
| `platform.invoice_line_items` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.invoices` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.llm_cache` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `platform.llm_feedback` | on | 0 |  |  |  |  | _service-only_ |
| `platform.ls_bookings` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.ls_customers` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.ls_quotes` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.ls_reports` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.ls_services` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.ls_technician_schedules` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.ls_technician_service_reports` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.metering_events` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.metering_pricing` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.metrics_log` | on | 1 | ✓ |  |  |  | `PUBLIC` |
| `platform.ml_model_snapshots` | on | 0 |  |  |  |  | _service-only_ |
| `platform.n8n_marketplace_installs` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.opening_checklists` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.opening_tasks` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_aging_alert_deliveries` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_feedback` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_franchise_locations` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_franchise_staff_memberships` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_franchises` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_lead_email_deliveries` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_leads` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.peskids_messages` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.port_allocations` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.research_artifacts` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.royalty_calculations` | on | 4 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.royalty_payments` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.royalty_rules` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.sales_reports` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.sandbox_execution_logs` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.shield_alert_config` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.shield_score_history` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `platform.shield_secret_findings` | on | 2 | ✓ | ✓ | ✓ | ✓ | `authenticated` |
| `platform.sprints` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.stripe_sync_logs` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.subscriptions` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.supplier_requirements` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.support_cases` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenant_budgets` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenant_embeddings` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenant_entitlements` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenant_insights` | on | 0 |  |  |  |  | _service-only_ |
| `platform.tenant_limits` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.tenant_memberships` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenant_service_accounts` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenant_webhooks` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.tenants` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `platform.training_requirements` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `platform.usage_events` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `public.agent_execution_patterns` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `public.calls` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `public.feedback` | on | 8 | ✓ | ✓ | ✓ |  | `PUBLIC` `anon` |
| `public.followups` | on | 5 | ✓ | ✓ | ✓ |  | `PUBLIC` |
| `public.intcloudsysops_accounts` | on | 4 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `public.intcloudsysops_contacts` | on | 4 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `public.intcloudsysops_deals` | on | 4 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `public.intcloudsysops_feedback` | on | 3 | ✓ | ✓ | ✓ |  | `PUBLIC` |
| `public.intcloudsysops_followups` | on | 3 | ✓ | ✓ | ✓ |  | `PUBLIC` |
| `public.lead_status_audit` | on | 2 | ✓ |  | ✓ |  | `PUBLIC` |
| `public.leads` | FORCE | 12 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` `anon` `authenticated` |
| `public.messages` | on | 5 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` `authenticated` |
| `public.staff_improvement_messages` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `public.students` | on | 6 | ✓ | ✓ | ✓ |  | `PUBLIC` |
| `public.tenant_settings` | on | 1 | ✓ | ✓ | ✓ | ✓ | _service-only_ |
| `public.trial_classes` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `public.validation_metrics` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `public.voice_transcriptions` | on | 2 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `public.webhook_logs` | on | 2 | ✓ | ✓ |  |  | `PUBLIC` |
| `sandbox.agent_classifiers` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `sandbox.agent_metrics` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `sandbox.agent_task_results` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |
| `sandbox.agent_training_datasets` | **OFF** | 0 |  |  |  |  | _service-only_ |
| `sandbox.agent_watcher_metrics` | on | 1 | ✓ | ✓ | ✓ | ✓ | `PUBLIC` |

---

## Policy definitions

### `defense.audits`

- **`defense_audits_authenticated_select_own`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (EXISTS ( SELECT 1 FROM platform.tenants t WHERE ((t.id = audits.tenant_id) AND (t.slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text))))))`
- **`defense_audits_service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `defense.compliance_requirements`

- **`defense_compliance_authenticated_select_own`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (EXISTS ( SELECT 1 FROM platform.tenants t WHERE ((t.id = compliance_requirements.tenant_id) AND (t.slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text))))))`
- **`defense_compliance_service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `defense.pentest_results`

- **`defense_pentest_results_authenticated_select_own`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (EXISTS ( SELECT 1 FROM platform.tenants t WHERE ((t.id = pentest_results.tenant_id) AND (t.slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text))))))`
- **`defense_pentest_results_service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `defense.security_events`

- **`defense_security_events_authenticated_select_own`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (EXISTS ( SELECT 1 FROM platform.tenants t WHERE ((t.id = security_events.tenant_id) AND (t.slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text))))))`
- **`defense_security_events_service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `defense.vulnerabilities`

- **`defense_vulnerabilities_authenticated_select_own`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (EXISTS ( SELECT 1 FROM platform.tenants t WHERE ((t.id = vulnerabilities.tenant_id) AND (t.slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text))))))`
- **`defense_vulnerabilities_service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `governance.agreements`

- **`service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`
- **`tenant_read_own`** — `SELECT` to `authenticated`
  - `USING`: `(tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))`

### `governance.breach_log`

- **`admin_read`** — `SELECT` to `authenticated`
  - `USING`: `(((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'platform_admin'::text)`
- **`service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `governance.consents`

- **`service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`
- **`subject_read_own`** — `SELECT` to `authenticated`
  - `USING`: `(subject_email = (auth.jwt() ->> 'email'::text))`

### `governance.dsar_requests`

- **`service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`
- **`subject_read_own`** — `SELECT` to `authenticated`
  - `USING`: `(subject_email = (auth.jwt() ->> 'email'::text))`

### `governance.retention_schedule`

- **`service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.affiliate_clicks`

- **`service_role_all_affiliate_clicks`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.collection_items`

- **`service_role_all_collection_items`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.conversation_events`

- **`service_role_all_conversation_events`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.polymarket_markets`

- **`service_role_all_polymarket_markets`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.value_signals`

- **`service_role_all_value_signals`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.wc_fixtures`

- **`service_role_all_wc_fixtures`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.wc_match_predictions`

- **`service_role_all_wc_match_predictions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.wc_player_predictions`

- **`service_role_all_wc_player_predictions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.wc_players`

- **`service_role_all_wc_players`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.wc_results`

- **`service_role_all_wc_results`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `panini_lab.wc_teams`

- **`service_role_all_wc_teams`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.audit_log`

- **`audit_log_no_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `false`
- **`service_role_full_audit`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.class_enrollments`

- **`family_insert_own_enrollments`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `(family_user_id = auth.uid())`
- **`family_read_own_enrollments`** — `SELECT` to `PUBLIC`
  - `USING`: `(family_user_id = auth.uid())`
- **`service_role_full_class_enrollments`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.classes`

- **`authenticated_read_scheduled_classes`** — `SELECT` to `PUBLIC`
  - `USING`: `(status = 'scheduled'::text)`
- **`service_role_full_classes`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.form_analytics`

- **`authenticated_read_analytics`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`service_role_full_analytics`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.form_deliveries`

- **`service_role_all_form_deliveries`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.form_fields`

- **`authenticated_read_form_fields`** — `SELECT` to `PUBLIC`
  - `USING`: `(form_id IN ( SELECT forms.id FROM peskids.forms WHERE (forms.tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))))`
- **`service_role_full_form_fields`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.form_responses`

- **`service_role_all_form_responses`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.form_submissions`

- **`authenticated_read_form_submissions`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`authenticated_write_form_submissions`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`service_role_full_form_submissions`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.form_templates`

- **`service_role_all_form_templates`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.forms`

- **`authenticated_read_forms`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`service_role_full_forms`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.notification_preferences`

- **`service_role_full_notification_preferences`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.notifications`

- **`service_role_full_notifications`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.payments`

- **`service_role_full_payments`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.point_transactions`

- **`service_role_all_point_transactions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.pools`

- **`authenticated_read_active_pools`** — `SELECT` to `PUBLIC`
  - `USING`: `(active = true)`
- **`service_role_full_pools`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.push_subscriptions`

- **`service_role_full_push_subscriptions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.referral_clicks`

- **`service_role_full_referral_clicks`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.referral_links`

- **`service_role_full_referral_links`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.referral_redemptions`

- **`service_role_full_referral_redemptions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.store_cart_items`

- **`service_role_all_store_cart`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.store_order_items`

- **`service_role_all_store_order_items`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.store_orders`

- **`service_role_all_store_orders`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.store_products`

- **`service_role_all_store_products`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.student_badges`

- **`service_role_all_student_badges`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.student_points`

- **`service_role_all_student_points`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.submission_events`

- **`authenticated_read_events`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`service_role_full_events`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `peskids.subscription_payments`

- **`service_role_all_subscription_payments`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.subscriptions`

- **`service_role_all_subscriptions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `peskids.webhook_configs`

- **`authenticated_read_webhooks`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`authenticated_write_webhooks`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `(tenant_slug IN ( SELECT t.slug FROM (platform.tenant_memberships tm JOIN platform.tenants t ON ((t.id = tm.tenant_id))) WHERE ((tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))`
- **`service_role_full_webhooks`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `platform.api_keys`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.approved_suppliers`

- **`service_role_all_approved_suppliers`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.audit_events`

- **`audit_events_insert_service_only`** — `INSERT` to `service_role`
  - `WITH CHECK`: `true`
- **`audit_events_no_delete`** — `DELETE` to `PUBLIC`
  - `USING`: `false`
- **`audit_events_no_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `false`
- **`audit_events_select_service_only`** — `SELECT` to `service_role`
  - `USING`: `true`

### `platform.audit_findings`

- **`service_role_all_audit_findings`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.audit_log`

- **`audit_log_no_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `false`
- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.audit_templates`

- **`service_role_all_audit_templates`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.audits`

- **`service_role_all_audits`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.billing_plans`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.billing_subscriptions`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.billing_usage`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.brand_standards`

- **`service_role_all_brand_standards`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.conversion_events`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.corrective_actions`

- **`service_role_all_corrective_actions`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.customers`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.evolution_gap_analyses`

- **`orchestrator_gaps`** — `ALL` to `PUBLIC`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.evolution_proposals`

- **`orchestrator_proposals`** — `ALL` to `PUBLIC`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_agreement_units`

- **`service_role_all_franchise_agreement_units`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_agreements`

- **`service_role_all_franchise_agreements`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_documents`

- **`service_role_all_franchise_documents`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_locations`

- **`service_role_all_franchise_locations`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_networks`

- **`service_role_all_franchise_networks`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_territories`

- **`service_role_all_franchise_territories`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchise_units`

- **`service_role_all_franchise_units`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.franchisees`

- **`service_role_all_franchisees`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.hermes_audit`

- **`hermes_audit_no_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `false`

### `platform.invoice_line_items`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.invoices`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.ls_bookings`

- **`service_role_all_ls_bookings`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.ls_customers`

- **`service_role_all_ls_customers`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.ls_quotes`

- **`service_role_all_ls_quotes`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.ls_reports`

- **`service_role_all_ls_reports`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.ls_services`

- **`service_role_all_ls_services`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.ls_technician_schedules`

- **`service_role_all_ls_technician_schedules`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.ls_technician_service_reports`

- **`service_role_all_ls_technician_service_reports`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.metering_events`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.metering_pricing`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.metrics_log`

- **`metrics_log_read_all`** — `SELECT` to `PUBLIC`
  - `USING`: `true`

### `platform.n8n_marketplace_installs`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `platform.opening_checklists`

- **`service_role_all_opening_checklists`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.opening_tasks`

- **`service_role_all_opening_tasks`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_aging_alert_deliveries`

- **`service_role_all_peskids_aging_alert_deliveries`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_feedback`

- **`service_role_all_peskids_feedback`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_franchise_locations`

- **`service_role_full_peskids_franchise_locations`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_franchise_staff_memberships`

- **`service_role_full_peskids_franchise_staff_memberships`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_franchises`

- **`service_role_full_peskids_franchises`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_lead_email_deliveries`

- **`service_role_all_peskids_lead_email_deliveries`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_leads`

- **`service_role_all_peskids_leads`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.peskids_messages`

- **`service_role_all_peskids_messages`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.port_allocations`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.research_artifacts`

- **`orchestrator_all`** — `ALL` to `PUBLIC`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.royalty_calculations`

- **`royalty_calculations_insert_service_only`** — `INSERT` to `service_role`
  - `WITH CHECK`: `true`
- **`royalty_calculations_no_delete`** — `DELETE` to `PUBLIC`
  - `USING`: `false`
- **`royalty_calculations_no_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `false`
- **`royalty_calculations_select_service_only`** — `SELECT` to `service_role`
  - `USING`: `true`

### `platform.royalty_payments`

- **`service_role_all_royalty_payments`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.royalty_rules`

- **`service_role_all_royalty_rules`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.sales_reports`

- **`service_role_all_sales_reports`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.sandbox_execution_logs`

- **`orchestrator_all`** — `ALL` to `PUBLIC`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.shield_alert_config`

- **`service role full access on shield_alert_config`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.shield_score_history`

- **`authenticated_select_own_shield_score_history`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (tenant_slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text)))`
- **`service_role_all_shield_score_history`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.shield_secret_findings`

- **`authenticated_select_own_shield_secret_findings`** — `SELECT` to `authenticated`
  - `USING`: `((((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text) IS NOT NULL) AND (tenant_slug = ((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_slug'::text)))`
- **`service_role_all_shield_secret_findings`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.sprints`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.stripe_sync_logs`

- **`service_role_full`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.subscriptions`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.supplier_requirements`

- **`service_role_all_supplier_requirements`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.support_cases`

- **`service_role_all_support_cases`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenant_budgets`

- **`service_role_all`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenant_embeddings`

- **`service_role_full_tenant_embeddings`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenant_entitlements`

- **`service_role_all_tenant_entitlements`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenant_limits`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.tenant_memberships`

- **`service_role_all_tenant_memberships`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenant_service_accounts`

- **`service_role_all_tenant_service_accounts`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenant_webhooks`

- **`service role full access on tenant_webhooks`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.tenants`

- **`service_role_only`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`

### `platform.training_requirements`

- **`service_role_all_training_requirements`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `platform.usage_events`

- **`service_role_full_usage_events`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `public.calls`

- **`calls_authenticated_select`** — `SELECT` to `PUBLIC`
  - `USING`: `((auth.uid() IS NOT NULL) AND (tenant_id = COALESCE((auth.jwt() #>> '{user_metadata,tenant_slug}'::text[]), (auth.jwt() #>> '{app_metadata,tenant_slug}'::text[]))))`
- **`calls_service_role_all`** — `ALL` to `PUBLIC`
  - `USING`: `((auth.uid() IS NULL) OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text))`

### `public.feedback`

- **`Allow public inserts to feedback`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `(tenant_id = 'peskids'::text)`
- **`Authenticated users can read feedback for their tenant`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = current_setting('app.settings.tenant_id'::text, true)) OR (current_setting('app.settings.is_service_role'::text, true) = 'true'::text))`
- **`admin_insert_feedback`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `is_owner()`
- **`admin_read_all_feedback`** — `SELECT` to `PUBLIC`
  - `USING`: `is_owner()`
- **`admin_update_feedback`** — `UPDATE` to `PUBLIC`
  - `USING`: `is_owner()`
  - `WITH CHECK`: `is_owner()`
- **`anon_insert_feedback`** — `INSERT` to `anon`
  - `WITH CHECK`: `(tenant_id = 'peskids'::text)`
- **`parent_insert_feedback`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `((tenant_id = 'peskids'::text) AND (is_owner() OR ((author_type = 'parent'::text) AND (author_ref_id = auth.uid()))))`
- **`parent_read_own_feedback`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = 'peskids'::text) AND (is_owner() OR ((author_type = 'parent'::text) AND (author_ref_id = auth.uid()))))`

### `public.followups`

- **`Authenticated users can read followups for their tenant`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = current_setting('app.settings.tenant_id'::text, true)) OR (current_setting('app.settings.is_service_role'::text, true) = 'true'::text))`
- **`admin_insert_followups`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `is_owner()`
- **`admin_read_all_followups`** — `SELECT` to `PUBLIC`
  - `USING`: `is_owner()`
- **`admin_update_followups`** — `UPDATE` to `PUBLIC`
  - `USING`: `is_owner()`
  - `WITH CHECK`: `is_owner()`
- **`user_read_assigned_followups`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = 'peskids'::text) AND (is_owner() OR (assigned_to = auth.email()) OR (assigned_to = (auth.uid())::text)))`

### `public.intcloudsysops_accounts`

- **`intcloudsysops_accounts_delete`** — `DELETE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_accounts_insert`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_accounts_select`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug = 'intcloudsysops'::text)`
- **`intcloudsysops_accounts_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`

### `public.intcloudsysops_contacts`

- **`intcloudsysops_contacts_delete`** — `DELETE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_contacts_insert`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_contacts_select`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug = 'intcloudsysops'::text)`
- **`intcloudsysops_contacts_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`

### `public.intcloudsysops_deals`

- **`intcloudsysops_deals_delete`** — `DELETE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_deals_insert`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_deals_select`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug = 'intcloudsysops'::text)`
- **`intcloudsysops_deals_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`

### `public.intcloudsysops_feedback`

- **`intcloudsysops_feedback_insert`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_feedback_select`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug = 'intcloudsysops'::text)`
- **`intcloudsysops_feedback_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`

### `public.intcloudsysops_followups`

- **`intcloudsysops_followups_insert`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`
- **`intcloudsysops_followups_select`** — `SELECT` to `PUBLIC`
  - `USING`: `(tenant_slug = 'intcloudsysops'::text)`
- **`intcloudsysops_followups_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `((tenant_slug = 'intcloudsysops'::text) AND (auth.uid() IS NOT NULL))`

### `public.lead_status_audit`

- **`Authenticated users can read audit for their tenant`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_slug = current_setting('app.settings.tenant_slug'::text, true)) OR (current_setting('app.settings.is_service_role'::text, true) = 'true'::text))`
- **`lead_status_audit_no_update`** — `UPDATE` to `PUBLIC`
  - `USING`: `false`

### `public.leads`

- **`Allow public inserts to leads`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `(tenant_id = 'peskids'::text)`
- **`Authenticated users can read leads for their tenant`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = current_setting('app.settings.tenant_id'::text, true)) OR (current_setting('app.settings.is_service_role'::text, true) = 'true'::text))`
- **`admin_delete_all_leads`** — `DELETE` to `authenticated`
  - `USING`: `((auth.jwt() ->> 'email'::text) = 'sierrasantiago90@gmail.com'::text)`
- **`admin_delete_leads`** — `DELETE` to `PUBLIC`
  - `USING`: `is_owner()`
- **`admin_insert_leads`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `is_owner()`
- **`admin_read_all_leads`** — `SELECT` to `authenticated`
  - `USING`: `((auth.jwt() ->> 'email'::text) = 'sierrasantiago90@gmail.com'::text)`
- **`admin_update_all_leads`** — `UPDATE` to `authenticated`
  - `USING`: `((auth.jwt() ->> 'email'::text) = 'sierrasantiago90@gmail.com'::text)`
  - `WITH CHECK`: `((auth.jwt() ->> 'email'::text) = 'sierrasantiago90@gmail.com'::text)`
- **`admin_update_leads`** — `UPDATE` to `PUBLIC`
  - `USING`: `is_owner()`
  - `WITH CHECK`: `is_owner()`
- **`admin_write_all_leads`** — `INSERT` to `authenticated`
  - `WITH CHECK`: `((auth.jwt() ->> 'email'::text) = 'sierrasantiago90@gmail.com'::text)`
- **`anon_insert_leads`** — `INSERT` to `anon`
  - `WITH CHECK`: `(tenant_id = 'peskids'::text)`
- **`staff_read_own_leads`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = 'peskids'::text) AND (is_owner() OR ((created_by IS NOT NULL) AND (created_by = auth.uid()))))`
- **`staff_update_own_leads`** — `UPDATE` to `PUBLIC`
  - `USING`: `((tenant_id = 'peskids'::text) AND (is_owner() OR ((created_by IS NOT NULL) AND (created_by = auth.uid()))))`
  - `WITH CHECK`: `((tenant_id = 'peskids'::text) AND (is_owner() OR ((created_by IS NOT NULL) AND (created_by = auth.uid()))))`

### `public.messages`

- **`admin_insert_messages`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `is_owner()`
- **`admin_read_all_messages`** — `SELECT` to `PUBLIC`
  - `USING`: `is_owner()`
- **`admin_update_messages`** — `UPDATE` to `PUBLIC`
  - `USING`: `is_owner()`
  - `WITH CHECK`: `is_owner()`
- **`authenticated_read_messages_by_tenant`** — `SELECT` to `authenticated`
  - `USING`: `(tenant_id = COALESCE(current_setting('app.settings.tenant_id'::text, true), ''::text))`
- **`service_role_all_messages`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `public.staff_improvement_messages`

- **`service_role_all_staff_improvement_messages`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `public.students`

- **`Authenticated users can read students for their tenant`** — `SELECT` to `PUBLIC`
  - `USING`: `((tenant_id = current_setting('app.settings.tenant_id'::text, true)) OR (current_setting('app.settings.is_service_role'::text, true) = 'true'::text))`
- **`admin_insert_students`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `is_owner()`
- **`admin_read_all_students`** — `SELECT` to `PUBLIC`
  - `USING`: `is_owner()`
- **`admin_update_students`** — `UPDATE` to `PUBLIC`
  - `USING`: `is_owner()`
  - `WITH CHECK`: `is_owner()`
- **`parent_read_own_children`** — `SELECT` to `PUBLIC`
  - `USING`: `(is_owner() OR ((family_user_id IS NOT NULL) AND (family_user_id = auth.uid())))`
- **`parent_update_own_children`** — `UPDATE` to `PUBLIC`
  - `USING`: `(is_owner() OR ((family_user_id IS NOT NULL) AND (family_user_id = auth.uid())))`
  - `WITH CHECK`: `(is_owner() OR ((family_user_id IS NOT NULL) AND (family_user_id = auth.uid())))`

### `public.tenant_settings`

- **`service_role_full_tenant_settings`** — `ALL` to `service_role`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `public.trial_classes`

- **`service_role_full_trial_classes`** — `ALL` to `PUBLIC`
  - `USING`: `(auth.role() = 'service_role'::text)`
  - `WITH CHECK`: `(auth.role() = 'service_role'::text)`

### `public.voice_transcriptions`

- **`voice_transcriptions_authenticated_select`** — `SELECT` to `PUBLIC`
  - `USING`: `((auth.uid() IS NOT NULL) AND (tenant_id = COALESCE((auth.jwt() #>> '{user_metadata,tenant_slug}'::text[]), (auth.jwt() #>> '{app_metadata,tenant_slug}'::text[]))))`
- **`voice_transcriptions_service_role_all`** — `ALL` to `PUBLIC`
  - `USING`: `((auth.uid() IS NULL) OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text))`

### `public.webhook_logs`

- **`Service role can insert webhook logs`** — `INSERT` to `PUBLIC`
  - `WITH CHECK`: `(current_setting('app.settings.is_service_role'::text, true) = 'true'::text)`
- **`Service role can read webhook logs`** — `SELECT` to `PUBLIC`
  - `USING`: `(current_setting('app.settings.is_service_role'::text, true) = 'true'::text)`

### `sandbox.agent_task_results`

- **`Allow service role`** — `ALL` to `PUBLIC`
  - `USING`: `true`
  - `WITH CHECK`: `true`

### `sandbox.agent_watcher_metrics`

- **`Allow service role`** — `ALL` to `PUBLIC`
  - `USING`: `true`
  - `WITH CHECK`: `true`
