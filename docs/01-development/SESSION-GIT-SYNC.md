# Sincronización Git antes de trabajar (opsly-admin, opsly-worker, VPS)

**Regla:** en cualquier host donde tengas el repo Opsly, **antes de editar código, ejecutar scripts de infra o reiniciar servicios**, actualiza el clon con `origin` en la **rama en la que estás trabajando** (fast-forward).

## Hosts

| Host                   | Rol                                     | Ruta típica del repo               | Rama típica                             |
| ---------------------- | --------------------------------------- | ---------------------------------- | --------------------------------------- |
| **opsly-admin**        | Mac principal (Cursor / desarrollo)     | `~/…/intcloudsysops` o `~/opsly`   | `main`, `staging`, feature              |
| **opsly-worker**       | Ubuntu (Mac 2011), orchestrator systemd | `~/opsly`                          | Alineada a prod/staging (p. ej. `main`) |
| **VPS** (`vps-dragon`) | Producción / staging Docker             | `/opt/opsly`, `/opt/opsly-staging` | `main` / `staging`                      |

Los despliegues por **GitHub Actions** ya hacen `git reset --hard` en el VPS en el job de deploy; este documento cubre **trabajo manual** y **sesiones locales**.

## Modelo recomendado (Mac ↔ GitHub ↔ VPS)

| Dónde | Rama | Cuándo |
| ----- | ---- | ------ |
| **GitHub `main`** | Fuente de verdad tras merge de PR | Siempre |
| **Mac (desarrollo)** | `feat/*` o `fix/*` desde `main` actualizado | Durante la feature; PR al terminar |
| **VPS producción** | `main` | Operación estable; `git pull --ff-only` tras merge |
| **VPS prueba puntual** | Misma `feat/*` que Mac | Solo smoke temporal; volver a `main` después |

**Evitar:** dejar el VPS días en ramas `codex/*` o `cursor/*` sin PR. Si Mac y VPS divergen, no copies `.env` por `scp` para “igualar” — usa **Doppler** en cada host.

### Ver estado y alinear

```bash
# Solo comparar local vs VPS vs origin/main (sin cambios)
npm run opsly:repos:status
# o: ./scripts/opsly-repo-align.sh --status

# Mac → main (antes de abrir feat nueva)
./scripts/git-sync-repo.sh . main

# VPS → main (producción alineada; --vps-stash si hay cambios locales sin commit)
./scripts/opsly-repo-align.sh --vps --branch main --vps-stash --vps-reset

# Mac + VPS en la misma feature (prueba coordinada)
./scripts/opsly-repo-align.sh --local --vps --branch feat/tu-rama

# Producción estable en un comando (cuando toque)
npm run opsly:repos:align
```

El script falla si el working tree está sucio (commit o `stash` antes).

## Comando único (repo)

Desde la raíz del clon (o con ruta explícita):

```bash
chmod +x scripts/git-sync-repo.sh   # una vez
./scripts/git-sync-repo.sh
```

Con rama explícita (p. ej. VPS producción):

```bash
./scripts/git-sync-repo.sh /opt/opsly main
./scripts/git-sync-repo.sh /opt/opsly-staging staging
```

Variables:

- `OPSLY_REPO` — directorio del repo si no pasas argumento.
- `DRY_RUN=1` — solo imprime lo que haría.
- `OPSLY_SKIP_GIT_PULL=1` — en el **worker**, desactiva el pull automático al inicio de `run-worker-with-nvm.sh` (solo emergencias / sin red).

## Worker (systemd `opsly-worker`)

`scripts/run-worker-with-nvm.sh` ejecuta **`git-sync-repo.sh`** antes de iniciar el orchestrator. Si el pull falla (conflicto, sin red), el servicio **no** arranca hasta corregirlo o definir `OPSLY_SKIP_GIT_PULL=1` en el entorno del unit (avanzado).

## Equivalencia manual

```bash
cd /ruta/al/repo
git fetch origin
git pull --ff-only origin "$(git branch --show-current)"
```

No hagas `git pull` sin `--ff-only` si la política del equipo es evitar merges automáticos en estos clones.

## Referencias

- Política de ramas y PRs: [`GIT-WORKFLOW.md`](./GIT-WORKFLOW.md) (incluye **Checklist paralelo** GitHub + clon) · auditoría local: `./scripts/git-branch-hygiene.sh`
- Tailscale / nombres: [`TAILSCALE-NOMENCLATURA.md`](./TAILSCALE-NOMENCLATURA.md)
- Worker: [`WORKER-SETUP-MAC2011.md`](./WORKER-SETUP-MAC2011.md), [`WORKER-SERVICE-MAC2011.md`](./WORKER-SERVICE-MAC2011.md)
- CI/CD VPS: [`CICD-VPS.md`](./CICD-VPS.md)
