---
status: action-required
owner: devops
date: 2026-09-05
type: runbook
severity: critical
tags:
  - opsly/database
---

# Backup & Restore Verification

> **This document is a set of instructions for a human with Supabase, VPS and S3
> access.** Everything in it is **BLOCKED** from the repository alone: whether a
> backup exists, whether it contains anything, and whether it can be restored
> are facts about running infrastructure, not about committed files.
>
> Complementary to [`docs/runbooks/BACKUP-RECOVERY.md`](../runbooks/BACKUP-RECOVERY.md),
> which documents the intended procedure. This document is about verifying that
> the procedure actually works — which, on the static evidence below, it may
> well not.

---

## 0. Do this first

**The daily backup script appears to be dumping a schema that does not exist.**

`scripts/backup-tenants.sh:120` runs:

```bash
pg_dump "${DB_CONNECTION_STRING}" -n "tenant_${slug}" --no-owner --no-acl 2>/dev/null | gzip -c > "${tmp_sql_gz}"
```

That backs up a schema named `tenant_peskids`. But **no migration in either
chain ever creates a `tenant_*` schema.** Replaying the full committed chain
into a clean Postgres produces exactly these schemas:

```
defense  governance  panini_lab  peskids  platform  public  sandbox
```

Peskids' real data lives in `public` (`leads`, `students`, `parents`,
`followups`, `messages`, `feedback`) and `peskids` (`classes`, `payments`,
`class_enrollments`, `subscriptions`, `store_orders`, `student_points`,
`audit_log`). None of it is in `tenant_peskids`.

Behaviour was measured, not assumed. Against Postgres 16 with a `peskids` schema
present and no `tenant_peskids`:

```
$ pg_dump ... -n tenant_peskids --no-owner --no-acl
pg_dump: error: no matching schemas were found
exit code: 1   dump size: 0 bytes
```

So one of these is true, and **only a human with access can determine which**:

| Possibility | What it means | How to check |
|---|---|---|
| **A.** Production has `tenant_*` schemas created out of band | Major undocumented schema drift: the real production layout is not the one any migration describes | `SELECT nspname FROM pg_namespace ORDER BY 1;` against production |
| **B.** The backup has been failing nightly | **There is no recoverable copy of Peskids production data**, and the failure has not been acted on | `aws s3 ls s3://$S3_BUCKET/opsly/backups/ --recursive` and check object sizes |
| **C.** Backups run from a different, uncommitted script | The committed script is not what runs; the repository does not describe production | Check the VPS crontab and `.github/workflows/backup.yml` run history |

Note that `scripts/backup-tenants.sh` sends `pg_dump`'s stderr to `/dev/null`,
so the operator would see `pg_dump failed for slug=peskids` with no reason
attached — which makes possibility B easy to have been living with.

Additionally, `BACKUP-RECOVERY.md` itself states that the `platform` schema is
**"Not backed up daily — Manual"**. `platform` holds `tenants`, `invoices`,
`billing_subscriptions`, `royalty_calculations` and `royalty_payments`. If that
is still true, the platform's own billing and franchise records have no
automated backup at all.

**Until item 0 is resolved, treat Peskids production as having no verified
backup, and do not apply any `DESTRUCTIVE` migration.**

---

## 1. Backup existence and content

| # | Check | Command / where | Result | Date | By |
|---|---|---|---|---|---|
| 1.1 | Automated backups are enabled on Supabase project `jkwykpldnitavhmtuzmo` | Supabase dashboard → Database → Backups | | | |
| 1.2 | Backup frequency and retention on the current plan | same | | | |
| 1.3 | Timestamp of the last **successful** Supabase backup | same | | | |
| 1.4 | PITR available on this plan? If so, retention window | Supabase dashboard → Database → Point in Time Recovery | | | |
| 1.5 | Backups are encrypted at rest, and by whom | Supabase docs + S3 bucket policy | | | |
| 1.6 | S3 objects exist for the last 7 days and are **non-trivial in size** | `aws s3 ls s3://$S3_BUCKET/opsly/backups/ --recursive --human-readable` | | | |
| 1.7 | A `.sql.gz` from the last 24h actually contains Peskids rows | download, `zcat \| grep -c 'COPY public.students'` | | | |
| 1.8 | Checksums verify | `sha256sum -c *.sha256` | | | |
| 1.9 | The `platform` schema is covered by *some* backup | `pg_dump -n platform` output or Supabase snapshot | | | |
| 1.10 | The `peskids` and `public` schemas are covered | as above | | | |
| 1.11 | Supabase **Auth** users are covered (`auth.users` is not in a schema dump you control) | Supabase dashboard / API | | | |
| 1.12 | Supabase **Storage** objects are covered (teacher applicant attachments, staff improvement attachments) | Supabase dashboard → Storage | | | |

Items 1.11 and 1.12 are easy to forget and hard to recover from. A restored
database with no matching `auth.users` leaves every `family_user_id`,
`created_by` and `professor_user_id` pointing at accounts that no longer exist.

---

## 2. Access control over backups

| # | Check | Result |
|---|---|---|
| 2.1 | Who can trigger a restore on the Supabase project (named list) | |
| 2.2 | Who can read the S3 backup bucket (named list / IAM policy) | |
| 2.3 | Who can **delete** from the backup bucket | |
| 2.4 | Is object-lock / versioning enabled, so ransomware or a bad script cannot delete history | |
| 2.5 | Are backup credentials distinct from application credentials | |
| 2.6 | Is the 30-day retention in `config/opsly.config.json` actually enforced by a lifecycle rule | |

2.3 and 2.4 matter more than they look: a backup that the compromised
application's own credentials can delete is not a backup.

---

## 3. The restore drill

**A backup that has never been restored is a hypothesis, not a backup.** Run
this end to end, on a scratch target, before trusting production with real data.
Nothing here writes to production.

1. **Provision a scratch target.** A new Supabase project, or a throwaway
   Postgres. Never restore into staging-in-use, and never into production.
2. **Pick the most recent backup** as if responding to an incident: do not
   hand-pick a known-good one.
3. **Record `T_start`.**
4. **Restore.** Follow `BACKUP-RECOVERY.md` exactly as written. Where the
   runbook is wrong or incomplete, **fix the runbook** — that is half the value
   of the drill.
5. **Record `T_restored`.**
6. **Verify content, not just completion:**
   ```sql
   SELECT count(*) FROM public.students;      -- vs production count
   SELECT count(*) FROM public.leads;
   SELECT count(*) FROM peskids.payments;
   SELECT count(*) FROM peskids.class_enrollments;
   SELECT max(created_at) FROM peskids.audit_log;   -- how far behind is it?
   ```
7. **Verify the schema matches** `docs/database/EXPECTED-SCHEMA.md`, and that
   RLS survived the restore:
   ```bash
   tools/db-assurance/rls-test.sh   # pointed at the scratch target
   ```
   A `pg_dump --no-acl` restore drops grants. Check whether policies and grants
   came back, or whether the restored database is wide open.
8. **Record `T_verified`.**
9. **Destroy the scratch target.** It now holds a full copy of children's
   personal data.

### Numbers to write down

| Metric | Definition | Target | Measured | Date |
|---|---|---|---|---|
| **RPO** | Worst-case data loss = time between backups | `BACKUP-RECOVERY.md` claims ≤ 24h | | |
| **RTO** (single tenant) | `T_verified − T_start` | claims ≤ 30 min | | |
| **RTO** (full platform) | as above, all tenants | claims ≤ 2h | | |
| Backup age at drill | now − backup timestamp | | | |
| Rows lost vs production | per critical table | | | |

The targets in `BACKUP-RECOVERY.md` are **stated, not measured**. Until this
table has real numbers in the "Measured" column, Opsly does not know its RPO or
RTO — it knows what it hopes they are.

---

## 4. After the drill

- [ ] `BACKUP-RECOVERY.md` corrected wherever the drill found it wrong
- [ ] The `tenant_*` vs `public`/`peskids`/`platform` schema question in §0 resolved, and `scripts/backup-tenants.sh` fixed if needed
- [ ] Backup **failure** alerting verified by deliberately breaking a backup run and confirming the alert fires (a backup job that fails silently is the same as no backup)
- [ ] Measured RPO/RTO recorded here and in `AGENTS.md`
- [ ] Drill scheduled to repeat — quarterly at minimum, and after any change to the backup script or the schema layout
- [ ] Named owner recorded for backup health

---

## Related

- [[runbooks/BACKUP-RECOVERY|Backup & Recovery runbook]]
- [[database/MIGRATION-POLICY|Migration & Release-Gate Policy]]
- [[database/DB-OBSERVABILITY|Database Observability Spec]]
- [[database/EXPECTED-SCHEMA|EXPECTED Schema]]
