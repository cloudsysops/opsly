# Auditoría de workflows GitHub — Opsly

**Relacionado (Maestro #3):** [`workflows-index.md`](./workflows-index.md) · [`workflows-catalog.tsv`](./workflows-catalog.tsv) · `scripts/generate-workflows-catalog.sh` · `scripts/archive-plan.sh`

**Generado:** 2026-05-03T19:18Z (API `gh run list`, última ejecución con conclusión success cuando exista).

| Workflow | Última run exitosa (UTC) | ¿Se usa? | Decisión |
|----------|--------------------------|----------|----------|
| `auto-fix-on-push.yml` | 2026-04-10T03:25:34Z | Sí | mantener |
| `autonomy-safety-check.yml` | 2026-05-02T15:54:23Z | Sí | mantener |
| `backup.yml` | (sin success reciente / sin runs) | ? | mantener |
| `ci.yml` | 2026-05-03T17:01:38Z | Sí | mantener |
| `cleanup-demos.yml` | 2026-05-03T19:10:02Z | Sí | mantener |
| `copilot-setup-steps.yml` | 2026-04-27T01:35:23Z | Sí | mantener |
| `dependency-audit-strict.yml` | (sin success reciente / sin runs) | ? | mantener |
| `deploy-staging.yml` | (sin success reciente / sin runs) | ? | mantener |
| `deploy.yml` | 2026-04-27T01:10:12Z | Sí | mantener |
| `docs-governance.yml` | 2026-05-03T19:07:39Z | Sí | mantener |
| `evolution-pipeline.yml` | (sin success reciente / sin runs) | ? | mantener |
| `github-project-sync.yml` | (sin success reciente / sin runs) | ? | mantener |
| `guardian-shield-deploy.yml` | (sin success reciente / sin runs) | ? | mantener |
| `hermes-health.yml` | 2026-05-02T13:54:41Z | Sí | mantener |
| `nightly-fix.yml` | (sin success reciente / sin runs) | ? | mantener |
| `notebooklm-sync.yml` | (sin success reciente / sin runs) | ? | mantener |
| `obsidian-vault-sync.yml` | 2026-05-03T18:50:49Z | Sí | mantener |
| `promote-production-canary.yml` | (sin success reciente / sin runs) | ? | mantener |
| `security-bot-deployment.yml` | (sin success reciente / sin runs) | ? | mantener |
| `security.yml` | 2026-05-03T00:41:00Z | Sí | mantener |
| `structure-validation.yml` | 2026-05-03T00:41:00Z | Sí | mantener |
| `sync-all.yml` | 2026-05-02T17:52:30Z | Sí | mantener |
| `sync-docs.yml` | 2026-05-02T14:14:24Z | Sí | mantener |
| `task-orchestrator-ci.yml` | (sin success reciente / sin runs) | ? | mantener |
| `tenant-onboarding-readiness.yml` | (sin success reciente / sin runs) | ? | mantener |
| `validate-context.yml` | 2026-05-03T16:57:08Z | Sí | mantener |
| `validate-doppler.yml` | 2026-05-03T19:07:45Z | Sí | mantener |

## Notas

- **¿Se usa?** `Sí` solo indica que hubo al menos una ejecución con conclusión `success` reciente según `gh run list --status success`. `?` = sin success encontrado en la muestra (puede ser workflow manual, raro, o siempre fallando hasta arreglar actionlint).
- **Decisión `mantener`:** por defecto; **archivar/borrar** requiere acuerdo explícito del owner (p. ej. `deploy-pm2-vps` está desactivado con `if: false` dentro de `deploy.yml`, no es archivo aparte).
- **Regenerar esta tabla:** desde la raíz del repo, volver a ejecutar el bucle `gh run list --repo cloudsysops/opsly --workflow <fichero> --limit 1 --status success`.
