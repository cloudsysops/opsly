---
status: generated
owner: devops
generated_by: tools/db-assurance/analyze.mjs
date: 2026-09-05
---

# Schema Findings (automated)

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
> Severity is assigned by heuristic: a table matching a customer/child/money
> name pattern in `peskids`, `public` or `platform` is treated as sensitive.
> Triage each finding — this file reports what the schema *is*, not what the
> business requires it to be.

## Totals

| severity | count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 31 |
| MEDIUM | 46 |
| LOW | 188 |
| **total** | **265** |

---

## RLS_DISABLED (HIGH)

Row Level Security is not enabled. Any role holding a table grant reads every tenant's rows; isolation depends entirely on application-level filtering.

- `platform.agent_episode_logs`
- `platform.llm_cache`
- `public.agent_execution_patterns`
- `public.validation_metrics`
- `sandbox.agent_classifiers`
- `sandbox.agent_metrics`
- `sandbox.agent_training_datasets`

---

## TENANT_NO_FK (HIGH)

Tenant discriminator `tenant_slug text` has no FOREIGN KEY to platform.tenants. Nothing at the database level stops a typo'd or deleted tenant key from creating orphaned, invisible rows.

- `peskids.student_points.tenant_slug`
- `platform.audit_events.tenant_slug`
- `platform.feedback_conversations.tenant_slug`
- `platform.llm_feedback.tenant_slug`
- `platform.peskids_franchise_locations.tenant_slug`
- `platform.peskids_franchise_staff_memberships.tenant_slug`
- `platform.peskids_franchises.tenant_slug`
- `public.feedback.tenant_id`
- `public.intcloudsysops_contacts.tenant_slug`
- `public.intcloudsysops_feedback.tenant_slug`
- `public.lead_status_audit.tenant_slug`
- `public.leads.tenant_id`
- `public.messages.tenant_id`
- `public.staff_improvement_messages.tenant_id`
- `public.students.tenant_id`

---

## TENANT_NULLABLE (HIGH)

Tenant discriminator is NULLABLE. A NULL tenant row escapes every `tenant_id = ...` predicate, including RLS policies.

- `platform.agent_teams.tenant_slug`
- `platform.audit_events.tenant_slug`
- `platform.audit_log.tenant_id`
- `platform.conversion_events.tenant_id`
- `platform.hermes_state.tenant_id`
- `platform.ml_model_snapshots.tenant_id`
- `platform.port_allocations.tenant_id`
- `platform.stripe_sync_logs.tenant_id`
- `sandbox.agent_metrics.tenant_slug`

---

## RLS_NO_POLICY (MEDIUM)

RLS is enabled but no policy exists: the table is deny-all for every non-superuser, non-BYPASSRLS role. Either intentional (service-role-only) or an accidental outage.

- `platform.agent_executions`
- `platform.agent_teams`
- `platform.approval_gate_decisions`
- `platform.approval_gate_embeddings`
- `platform.conversations`
- `platform.feedback_conversations`
- `platform.feedback_decisions`
- `platform.feedback_messages`
- `platform.hermes_metrics`
- `platform.hermes_state`
- `platform.hermes_workflows`
- `platform.llm_feedback`
- `platform.ml_model_snapshots`
- `platform.tenant_insights`

---

## TENANT_NO_FK (MEDIUM)

Tenant discriminator `tenant_id text` has no FOREIGN KEY to platform.tenants. Nothing at the database level stops a typo'd or deleted tenant key from creating orphaned, invisible rows.

- `governance.agreements.tenant_id`
- `governance.breach_log.tenant_id`
- `governance.consents.tenant_id`
- `governance.dsar_requests.tenant_id`
- `governance.retention_schedule.tenant_id`
- `panini_lab.collection_items.tenant_slug`
- `panini_lab.conversation_events.tenant_slug`
- `peskids.point_transactions.tenant_slug`
- `platform.agent_episode_logs.tenant_slug`
- `platform.agent_teams.tenant_slug`
- `platform.conversations.tenant_slug`
- `platform.evolution_gap_analyses.tenant_slug`
- `platform.evolution_proposals.tenant_slug`
- `platform.hermes_state.tenant_id`
- `platform.llm_cache.tenant_slug`
- `platform.metrics_log.tenant_slug`
- `platform.research_artifacts.tenant_slug`
- `platform.sandbox_execution_logs.tenant_slug`
- `platform.tenant_embeddings.tenant_slug`
- `platform.usage_events.tenant_slug`
- `public.calls.tenant_id`
- `public.followups.tenant_id`
- `public.intcloudsysops_accounts.tenant_slug`
- `public.intcloudsysops_deals.tenant_slug`
- `public.intcloudsysops_followups.tenant_slug`
- `public.tenant_settings.tenant_id`
- `public.trial_classes.tenant_id`
- `public.voice_transcriptions.tenant_id`
- `public.webhook_logs.tenant_id`
- `sandbox.agent_metrics.tenant_slug`
- `sandbox.agent_task_results.tenant_slug`
- `sandbox.agent_watcher_metrics.tenant_slug`

---

## FK_NOT_INDEXED (LOW)

FK column is not the leading column of any index. Parent DELETE/UPDATE takes a sequential scan of this table, and joins from the parent are unsupported.

- `defense.compliance_requirements.responsible_user`
- `defense.pentest_results.audit_id`
- `defense.pentest_results.tenant_id`
- `defense.security_events.actor_user_id`
- `defense.vulnerabilities.assigned_to`
- `defense.vulnerabilities.audit_id`
- `governance.agreements.user_id`
- `governance.breach_log.reported_by`
- `panini_lab.affiliate_clicks.signal_id`
- `panini_lab.polymarket_markets.player_id`
- `panini_lab.polymarket_markets.team_id`
- `panini_lab.value_signals.market_id`
- `panini_lab.wc_fixtures.away_team_id`
- `panini_lab.wc_fixtures.home_team_id`
- `panini_lab.wc_player_predictions.fixture_id`
- `peskids.class_enrollments.student_id`
- `peskids.classes.franchise_id`
- `peskids.form_deliveries.template_id`
- `peskids.form_responses.delivery_id`
- `peskids.form_responses.template_id`
- `peskids.payments.enrollment_id`
- `peskids.point_transactions.related_order_id`
- `peskids.point_transactions.related_payment_id`
- `peskids.point_transactions.related_subscription_id`
- `peskids.pools.franchise_id`
- `peskids.store_cart_items.product_id`
- `peskids.store_cart_items.student_id`
- `peskids.store_order_items.product_id`
- `peskids.store_orders.student_id`
- `peskids.student_badges.class_id`
- `peskids.student_badges.student_id`
- `peskids.subscriptions.student_id`
- `platform.agent_executions.feedback_decision_id`
- `platform.agent_executions.team_id`
- `platform.api_keys.tenant_id`
- `platform.approved_suppliers.requirement_id`
- `platform.approved_suppliers.tenant_id`
- `platform.audit_findings.audit_id`
- `platform.audit_findings.tenant_id`
- `platform.audit_findings.unit_id`
- `platform.audit_log.tenant_id`
- `platform.audit_templates.network_id`
- `platform.audit_templates.tenant_id`
- `platform.audits.template_id`
- `platform.audits.unit_id`
- `platform.billing_subscriptions.plan_id`
- `platform.brand_standards.network_id`
- `platform.brand_standards.tenant_id`
- `platform.conversion_events.tenant_id`
- `platform.corrective_actions.finding_id`
- `platform.corrective_actions.unit_id`
- `platform.franchise_agreement_units.unit_id`
- `platform.franchise_agreements.franchisee_id`
- `platform.franchise_documents.tenant_id`
- `platform.franchise_documents.unit_id`
- `platform.franchise_locations.tenant_id`
- `platform.franchise_territories.unit_id`
- `platform.franchise_units.franchisee_id`
- `platform.franchise_units.network_id`
- `platform.franchise_units.primary_location_id`
- `platform.franchisees.network_id`
- `platform.ls_bookings.customer_id`
- `platform.ls_bookings.service_id`
- `platform.ls_quotes.customer_id`
- `platform.opening_checklists.tenant_id`
- `platform.opening_checklists.unit_id`
- `platform.opening_tasks.checklist_id`
- `platform.opening_tasks.tenant_id`
- `platform.opening_tasks.unit_id`
- `platform.peskids_franchises.parent_franchise_id`
- `platform.peskids_leads.franchise_id`
- `platform.port_allocations.tenant_id`
- `platform.royalty_calculations.sales_report_id`
- `platform.royalty_calculations.unit_id`
- `platform.royalty_payments.calculation_id`
- `platform.royalty_payments.tenant_id`
- `platform.royalty_rules.network_id`
- `platform.sales_reports.unit_id`
- `platform.supplier_requirements.tenant_id`
- `platform.support_cases.tenant_id`
- `platform.support_cases.unit_id`
- `platform.training_requirements.tenant_id`
- `public.followups.franchise_id`
- `public.intcloudsysops_accounts.created_by`
- `public.intcloudsysops_accounts.updated_by`
- `public.intcloudsysops_contacts.created_by`
- `public.intcloudsysops_contacts.updated_by`
- `public.intcloudsysops_deals.created_by`
- `public.intcloudsysops_deals.updated_by`
- `public.intcloudsysops_feedback.created_by`
- `public.intcloudsysops_followups.created_by`
- `public.leads.franchise_id`
- `public.messages.franchise_id`
- `public.students.franchise_id`
- `public.trial_classes.franchise_id`
- `public.trial_classes.student_id`

---

## RLS_NO_DELETE (LOW)

No DELETE policy. That command is denied for non-BYPASSRLS roles.

- `platform.hermes_audit`
- `platform.metrics_log`
- `public.feedback`
- `public.followups`
- `public.intcloudsysops_feedback`
- `public.intcloudsysops_followups`
- `public.lead_status_audit`
- `public.students`
- `public.webhook_logs`

---

## RLS_NO_INSERT (LOW)

No INSERT policy. That command is denied for non-BYPASSRLS roles.

- `platform.hermes_audit`
- `platform.metrics_log`
- `public.lead_status_audit`

---

## RLS_NO_SELECT (LOW)

No SELECT policy. That command is denied for non-BYPASSRLS roles.

- `platform.hermes_audit`

---

## RLS_NO_UPDATE (LOW)

No UPDATE policy. That command is denied for non-BYPASSRLS roles.

- `platform.metrics_log`
- `public.webhook_logs`

---

## RLS_SERVICE_ONLY (LOW)

RLS enabled, but every policy targets service_role only. Effectively service-role-only access; end-user reads must go through an API that holds the service key.

- `governance.retention_schedule`
- `panini_lab.affiliate_clicks`
- `panini_lab.collection_items`
- `panini_lab.conversation_events`
- `panini_lab.polymarket_markets`
- `panini_lab.value_signals`
- `panini_lab.wc_fixtures`
- `panini_lab.wc_match_predictions`
- `panini_lab.wc_player_predictions`
- `panini_lab.wc_players`
- `panini_lab.wc_results`
- `panini_lab.wc_teams`
- `peskids.form_deliveries`
- `peskids.form_responses`
- `peskids.form_templates`
- `peskids.notification_preferences`
- `peskids.notifications`
- `peskids.point_transactions`
- `peskids.push_subscriptions`
- `peskids.referral_clicks`
- `peskids.referral_links`
- `peskids.referral_redemptions`
- `peskids.store_cart_items`
- `peskids.store_order_items`
- `peskids.store_orders`
- `peskids.store_products`
- `peskids.student_badges`
- `peskids.student_points`
- `peskids.subscription_payments`
- `peskids.subscriptions`
- `platform.approved_suppliers`
- `platform.audit_findings`
- `platform.audit_templates`
- `platform.audits`
- `platform.brand_standards`
- `platform.corrective_actions`
- `platform.franchise_agreement_units`
- `platform.franchise_agreements`
- `platform.franchise_documents`
- `platform.franchise_locations`
- `platform.franchise_networks`
- `platform.franchise_territories`
- `platform.franchise_units`
- `platform.franchisees`
- `platform.ls_bookings`
- `platform.ls_customers`
- `platform.ls_quotes`
- `platform.ls_reports`
- `platform.ls_services`
- `platform.ls_technician_schedules`
- `platform.ls_technician_service_reports`
- `platform.opening_checklists`
- `platform.opening_tasks`
- `platform.peskids_aging_alert_deliveries`
- `platform.peskids_feedback`
- `platform.peskids_franchise_locations`
- `platform.peskids_franchise_staff_memberships`
- `platform.peskids_franchises`
- `platform.peskids_lead_email_deliveries`
- `platform.peskids_leads`
- `platform.peskids_messages`
- `platform.royalty_payments`
- `platform.royalty_rules`
- `platform.sales_reports`
- `platform.shield_alert_config`
- `platform.supplier_requirements`
- `platform.support_cases`
- `platform.tenant_budgets`
- `platform.tenant_embeddings`
- `platform.tenant_entitlements`
- `platform.tenant_memberships`
- `platform.tenant_service_accounts`
- `platform.tenant_webhooks`
- `platform.training_requirements`
- `platform.usage_events`
- `public.staff_improvement_messages`
- `public.tenant_settings`
