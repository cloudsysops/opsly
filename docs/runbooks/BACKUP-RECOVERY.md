# Backup & Recovery Runbook

## Overview

Opsly backups are automated daily via GitHub Actions (`backup.yml`) running `scripts/backup-tenants.sh` on the VPS. Each active tenant schema is dumped via `pg_dump`, compressed, checksummed, and uploaded to S3 with SHA256 verification.

---

## What's Backed Up

| Item                          | Scope                   | Format         | Destination |
|-------------------------------|-------------------------|----------------|-------------|
| Tenant schemas (per slug)     | `tenant_{slug}` schema  | `.sql.gz`      | S3          |
| Checksum per tenant           | SHA256 of `.sql.gz`     | `.sql.gz.sha256` | S3        |
| Platform schema (`platform`)* | Master data, tenants    | Not backed up daily | Manual |

*\* Platform schema (tenants, subscriptions, feedback) should be snapshotted periodically via Supabase project dashboard or `pg_dump` manually.*

**Peskids exception:** application data is in `peskids` / `platform.peskids_*` /
`public` tables, not `tenant_peskids`. Use
`scripts/ops/backup-peskids-schemas.sh` and
[`PESKIDS-DATA-OPERATIONS.md`](./PESKIDS-DATA-OPERATIONS.md).

**Not backed up (recoverable from source):**
- Docker Compose definitions (`infra/`) — in git
- n8n workflow exports — can be re-imported from `.n8n/` or git
- Application code — built from git + CI
- Environment variables — in Doppler

---

## S3 Backup Structure

```
s3://{BUCKET}/opsly/backups/
+-- YYYY-MM-DD/
|   +-- smiletripcare.sql.gz
|   +-- smiletripcare.sql.gz.sha256
|   +-- peskids.sql.gz
|   +-- peskids.sql.gz.sha256
|   +-- ...
+-- ...
```

Retention: **30 days** (configurable in `config/opsly.config.json`).

---

## RPO & RTO

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** | <= 24 hours | Daily backup at 02:00 UTC (or 03:00 UTC per workflow) |
| **RTO** (single tenant) | <= 30 minutes | `pg_restore` + container restart |
| **RTO** (full platform) | <= 2 hours | Full `pg_dump` restore + re-deploy |

---

## Restore Procedures

### Restore a Single Tenant

```bash
# 1. SSH to VPS
ssh vps-dragon@100.120.151.91

# 2. Download backup from S3
DATE="2026-05-27"  # use desired date
SLUG="smiletripcare"
aws s3 cp "s3://${S3_BUCKET}/opsly/backups/${DATE}/${SLUG}.sql.gz" "/tmp/${SLUG}.sql.gz"
aws s3 cp "s3://${S3_BUCKET}/opsly/backups/${DATE}/${SLUG}.sql.gz.sha256" "/tmp/${SLUG}.sql.gz.sha256"

# 3. Verify checksum
cd /tmp
sha256sum -c "${SLUG}.sql.gz.sha256"

# 4. Restore tenant schema (destructive -- drops and recreates)
zcat "${SLUG}.sql.gz" | psql "${DB_CONNECTION_STRING}" -n "tenant_${SLUG}"

# 5. Restart n8n & Uptime Kuma for that tenant
cd /opt/opsly
docker compose -f infra/docker-compose.platform.yml restart n8n_${SLUG} uptime_${SLUG}
```

### Restore to a New/Empty Tenant

```bash
# Same as above, but before step 4 ensure the tenant schema exists:
psql "${DB_CONNECTION_STRING}" -c "CREATE SCHEMA IF NOT EXISTS tenant_${SLUG};"
# Then proceed with restore.
```

### Emergency Full Restore (All Tenants)

```bash
# 1. List available dates
aws s3 ls "s3://${S3_BUCKET}/opsly/backups/"

# 2. For each slug, download and restore (parallel recommended)
DATE="2026-05-27"
for slug in smiletripcare peskids localrank jkboterolabs intcloudsysops; do
  echo "Restoring ${slug}..."
  aws s3 cp "s3://${S3_BUCKET}/opsly/backups/${DATE}/${slug}.sql.gz" "/tmp/${slug}.sql.gz"
  zcat "/tmp/${slug}.sql.gz" | psql "${DB_CONNECTION_STRING}" -n "tenant_${slug}" &
done
wait
echo "All tenants restored."
```

---

## Emergency Restore Procedure

Use when a tenant's data is corrupted, accidentally dropped, or needs point-in-time recovery.

### Step 1: Isolate the incident

```bash
# Stop tenant containers to prevent writes
cd /opt/opsly
docker compose -f infra/docker-compose.platform.yml stop n8n_{slug} uptime_{slug}
```

### Step 2: Identify the best backup

```bash
# List recent backups
aws s3 ls "s3://${S3_BUCKET}/opsly/backups/" --human-readable
```

Choose the most recent date that predates the incident.

### Step 3: Restore tenant schema

```bash
# (follow "Restore a Single Tenant" steps above)
```

### Step 4: Verify

```bash
# Check row counts
psql "${DB_CONNECTION_STRING}" -c "SELECT count(*) FROM tenant_${slug}.users;"
psql "${DB_CONNECTION_STRING}" -c "SELECT count(*) FROM tenant_${slug}.leads;"

# Restart containers
docker compose -f infra/docker-compose.platform.yml start n8n_{slug} uptime_{slug}

# Smoke test
curl -fI "https://n8n-${slug}.op-sly.com"
curl -fI "https://uptime-${slug}.op-sly.com"
```

### Step 5: Notify

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/notify-discord.sh \
  "Restore completed" \
  "Tenant ${slug} restored from ${DATE} backup (schema only, data verified)" \
  "warning"
```

---

## Manual Backup (On-Demand)

```bash
# All tenants
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/backup-tenants.sh

# Single tenant
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/backup-tenants.sh --slug smiletripcare

# Specific date label
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/backup-tenants.sh --date 2026-05-27
```

---

## Verify Backup Integrity

```bash
# Check that today's backup exists and SHA256 is valid
aws s3 ls "s3://${S3_BUCKET}/opsly/backups/$(date -u +%Y-%m-%d)/"

# Verify a specific backup
aws s3 cp "s3://${S3_BUCKET}/opsly/backups/$(date -u +%Y-%m-%d)/smiletripcare.sql.gz" /tmp/verify.sql.gz
aws s3 cp "s3://${S3_BUCKET}/opsly/backups/$(date -u +%Y-%m-%d)/smiletripcare.sql.gz.sha256" /tmp/verify.sha256
cd /tmp && sha256sum -c verify.sha256
```

---

## Configuration Reference

| Variable | Source | Default |
|----------|--------|---------|
| `S3_BUCKET` | Doppler `prd` / `.env` | -- |
| `AWS_REGION` | Doppler `prd` / `.env` | `us-east-1` |
| `S3_PREFIX` | backup script | `opsly/backups` |
| `DB_CONNECTION_STRING` | Doppler `prd` / `.env` | -- |
| `SUPABASE_URL` | Doppler `prd` / `.env` | -- |
| `SUPABASE_SERVICE_ROLE_KEY` | Doppler `prd` / `.env` | -- |
| Retention | `config/opsly.config.json` | 30 days |
| Cron schedule | `config/opsly.config.json` | `0 2 * * *` |
| Backup workflow | `.github/workflows/backup.yml` | Daily 03:00 UTC |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `pg_dump` fails for a slug | Tenant schema doesn't exist | Check `tenant_{slug}` exists in DB |
| S3 upload fails | AWS credentials not configured | Verify AWS_ACCESS_KEY_ID in Doppler |
| Checksum mismatch | Backup corrupted during upload | Re-run `backup-tenants.sh` for that slug |
| `Failed to fetch tenants` | Supabase token expired or unreachable | Verify SUPABASE_SERVICE_ROLE_KEY |
| Backup workflow fails | VPS SSH key expired | Rotate SSH key and update GitHub secret |
