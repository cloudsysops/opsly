# 📋 SSH COMMANDS - COPY & PASTE (LocalRank Onboarding - 2026-04-09)

## BLOQUE A: ONBOARDING VERIFICATION (SSH to VPS)

```bash
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && echo "=== Checking Supabase ===" && doppler run -- npx supabase query "SELECT slug, plan, status FROM platform.tenants WHERE slug = 10localrank10" && echo "" && echo "=== Checking Docker ===" && docker compose --project-name tenant_localrank ps && echo "" && echo "=== Testing n8n ===" && curl -sfk https://n8n-localrank.ops.smiletripcare.com/healthz && echo "✅ n8n OK" || echo "❌ n8n FAILED" && echo "" && echo "=== Testing Uptime ===" && curl -sfk https://uptime-localrank.ops.smiletripcare.com/api/ping && echo "✅ Uptime OK" || echo "❌ Uptime FAILED"'
```

## BLOQUE B: NOTEBOOKLM SETUP (SSH to VPS)

```bash
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && echo "=== Creating storage ===" && mkdir -p .notebooklm_storage && echo "=== Installing Python deps ===" && python3 -m pip install --upgrade -r apps/agents/notebooklm/requirements.txt && echo "=== Verifying notebooklm-py ===" && python3 -c "import notebooklm; print(\"✅ notebooklm-py installed\")"'
```

## BLOQUE C: TEST NOTEBOOKLM WORKFLOW (SSH to VPS)

```bash
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && echo "=== Running NotebookLM workflow ===" && doppler run -- python3 apps/agents/notebooklm/src/workflows/report-to-podcast.py --pdf-path /tmp/localrank-report.pdf --notebook-name "LocalRank Q1 Report" --storage-path /opt/opsly/.notebooklm_storage --output-dir /tmp/localrank-output && echo "" && echo "=== Output files ===" && ls -lh /tmp/localrank-output/ 2>/dev/null || echo "No output (check logs)"'
```

## BLOQUE D: DOCKER LOGS (If something fails)

```bash
ssh vps-dragon@100.120.151.91 'docker logs tenant_localrank-n8n-1 | tail -20'
```

```bash
ssh vps-dragon@100.120.151.91 'docker logs tenant_localrank-uptime-1 | tail -20'
```

## BLOQUE E: CLEANUP (If you need to re-onboard)

```bash
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && docker compose --project-name tenant_localrank down -v && rm -rf tenants/localrank && echo "✅ Cleaned up"'
```

---

**Note:** Replace backticks in SQLite query if needed. Commands use single quotes to prevent shell expansion.
