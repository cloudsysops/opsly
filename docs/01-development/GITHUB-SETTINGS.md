---
status: draft
owner: operations
last_review: 2026-05-24
type: guide
tags:
  - opsly/development
---

# GitHub Settings — Opsly (`cloudsysops/opsly`)

> Guía para configurar manualmente el repositorio. Estas settings **no se pueden
> gestionar via código** (requieren acceso a _Settings_ en GitHub UI o GitHub API
> con token de admin del repo).  
> Revisar y aplicar al incorporar un colaborador nuevo o al crear un fork de producción.

---

## Branch Protection — `main`

Ir a **Settings → Branches → Add branch protection rule** para `main`:

| Setting                                         | Valor recomendado                      | Razón                              |
| ----------------------------------------------- | -------------------------------------- | ---------------------------------- |
| **Require a pull request before merging**       | ✅ ON                                  | Bloquea push directo a `main`      |
| • Require approvals                             | `1` (mínimo)                           | Code review obligatorio            |
| • Dismiss stale reviews when new commits pushed | ✅ ON                                  | No aprobar código viejo            |
| • Require review from Code Owners (CODEOWNERS)  | ✅ ON                                  | `.github/CODEOWNERS` activo        |
| **Require status checks to pass**               | ✅ ON                                  | CI gates                           |
| • Required checks                               | Ver lista **CI (main)** abajo          | Nombres = _checks_ de GitHub Actions |
| • Require branches to be up to date             | ✅ ON                                  | Evita integraciones rotas          |
| **Require signed commits**                      | 🔶 Recomendado                         | Trazabilidad de autor              |
| **Include administrators**                      | ✅ ON                                  | Sin excepciones para el owner      |
| **Allow force pushes**                          | ❌ OFF                                 | Nunca reescribir historial de main |
| **Allow deletions**                             | ❌ OFF                                 | Main es permanente                 |

### Checks obligatorios (workflow **CI** en PR/push)

Alineados a [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). Contextos exactos (rama `main`):

1. `Structure Integrity / validate-structure` (job reusable `structure-validation`)
2. `Workflow Lint`
3. `lint`
4. `test-unit`
5. `test-integration`
6. `build`
7. `scripts-check`
8. `secret-scan`

**No** se exige `e2e-invite` en la regla de protección: depende de secretos, red y portal staging; conviene mantenerlo en CI sin bloquear merge si falla el entorno.

### Aplicar con GitHub CLI

```bash
gh api --method PUT repos/cloudsysops/opsly/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Structure Integrity / validate-structure",
      "Workflow Lint",
      "lint",
      "test-unit",
      "test-integration",
      "build",
      "scripts-check",
      "secret-scan"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF
```

---

## Pull Requests — borrar ramas al mergear

En **Settings → General → Pull Requests**, activar **Automatically delete head branches**. Así las ramas de PR ya integradas en `main` se eliminan en `origin` y el listado de ramas queda legible. Política detallada: [`GIT-WORKFLOW.md`](./GIT-WORKFLOW.md).

---

## Secrets requeridos (Settings → Secrets → Actions)

Los secretos se gestionan en **Doppler** (`ops-intcloudsysops / prd`).  
Los siguientes deben estar configurados en GitHub Actions para que los workflows funcionen:

| Secret                          | Usado en                                  | Fuente                       |
| ------------------------------- | ----------------------------------------- | ---------------------------- |
| `PLATFORM_DOMAIN`               | deploy.yml, ci.yml                        | Doppler `PLATFORM_DOMAIN`    |
| `NEXT_PUBLIC_SUPABASE_URL`      | deploy.yml                                | Doppler                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | deploy.yml                                | Doppler                      |
| `NEXT_PUBLIC_SUPPORT_EMAIL`     | deploy.yml                                | Doppler                      |
| `VPS_HOST`                      | backup.yml, deploy.yml SSH                | `100.120.151.91` (Tailscale) |
| `VPS_USER`                      | backup.yml, deploy.yml SSH                | `vps-dragon`                 |
| `VPS_SSH_KEY`                   | backup.yml, deploy.yml SSH                | ED25519 private key          |
| `DISCORD_WEBHOOK_URL`           | backup.yml, security.yml, nightly-fix.yml | Doppler                      |

> **Nunca** poner secretos directamente en código, workflows ni documentación.

---

## Dependabot (Settings → Security → Dependabot)

Habilitar:

- **Dependabot alerts** ✅ — notifica CVEs en dependencias
- **Dependabot security updates** ✅ — PRs automáticos para parches de seguridad
- **Dependabot version updates** — opcional (puede generar ruido); si se activa, configurar `.github/dependabot.yml`

Archivo `dependabot.yml` sugerido (crear cuando sea necesario):

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
    labels: ['dependencies', 'automated']
```

---

## Secret Scanning (Settings → Security → Secret scanning)

- **Secret scanning** ✅ — GitHub detecta tokens/keys comiteados
- **Push protection** ✅ — Bloquea el push si detecta un secreto

> Adicionalmente, `ci.yml` tiene un job `secret-scan` con TruffleHog (`--only-verified`)
> que corre en cada PR.

---

## GitHub Actions — Permisos

Ir a **Settings → Actions → General → Workflow permissions**:

| Setting                            | Valor                                    |
| ---------------------------------- | ---------------------------------------- |
| Default permissions                | `Read repository contents and packages`  |
| Allow GitHub Actions to create PRs | ✅ ON (nightly-fix y auto-fix usan esto) |

Los workflows que necesitan escribir (push imágenes, crear PRs) declaran sus propios
`permissions:` explícitamente.

---

## CODEOWNERS

Archivo: `.github/CODEOWNERS`

Reglas activas:

```
*                        @cboteros           # fallback global
apps/api/                @cloudsysops/backend
scripts/                 @cloudsysops/backend
supabase/                @cloudsysops/backend
apps/admin/              @cloudsysops/frontend
apps/web/                @cloudsysops/frontend
infra/                   @cloudsysops/infra
infra/terraform/         @cloudsysops/infra
.github/                 @cboteros           # workflows/governance protegidos
.github/workflows/       @cboteros
```

> Equipos deben existir en la organización `cloudsysops`. Crear en
> **Settings → Teams** si no existen.

---

## Environments (Settings → Environments)

Configurar environment **`production`** para el job `deploy` en `deploy.yml`:

| Setting             | Valor                                                      |
| ------------------- | ---------------------------------------------------------- |
| Required reviewers  | `@cboteros`                                                |
| Deployment branches | `main` only                                                |
| Environment secrets | Los mismos que en Actions (sobrescriben si hay diferencia) |

Esto agrega un gate humano antes de cada deploy a producción.

---

## Verificación rápida

```bash
# Ver estado de branch protection
gh api repos/cloudsysops/opsly/branches/main/protection --jq '{
  required_status_checks: .required_status_checks.contexts,
  enforce_admins: .enforce_admins.enabled,
  required_reviews: .required_pull_request_reviews.required_approving_review_count
}'

# Listar secrets configurados (solo nombres, no valores)
gh secret list --repo cloudsysops/opsly

# Ver CODEOWNERS activo
cat .github/CODEOWNERS
```

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
