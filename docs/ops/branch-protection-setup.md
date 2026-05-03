# Branch protection — `main` (manual, owner del repo)

**No ejecutar desde un agente sin revisión humana.** Requiere rol de administración en `cloudsysops/opsly`.

## 1. Nombres de checks del workflow `CI`

Deben coincidir con los que muestra GitHub al elegir *required status checks*. Ejemplo de jobs vistos en un run de `ci.yml` (IDs de job en Actions):

| Check name |
| --- |
| `Structure Integrity / validate-structure` |
| `Workflow Lint` |
| `lint` |
| `test-unit` |
| `test-integration` |
| `build` |
| `scripts-check` |
| `secret-scan` |
| `e2e-invite` |

**Listar desde un run concreto:**

```bash
gh api repos/cloudsysops/opsly/actions/runs/<RUN_ID>/jobs --jq '.jobs[].name' | sort -u
```

Obtén `<RUN_ID>` con:

```bash
gh run list --repo cloudsysops/opsly --workflow ci.yml --branch main --limit 5 --json databaseId,conclusion,displayTitle
```

## 2. Ver si ya hay reglas

```bash
gh api repos/cloudsysops/opsly/branches/main/protection 2>/dev/null | jq . || echo "Sin protección configurada"
```

## 3. Configuración recomendada (UI)

En **Settings → Branches → Branch protection rules → Add rule** para `main`:

1. **Require a pull request before merging** — activado.
2. **Required number of approvals** — `1` (alineado a CODEOWNERS).
3. **Dismiss stale reviews** — activado.
4. **Require status checks to pass** — activado; **strict** = la rama debe estar actualizada con `main`.
5. Buscar y marcar cada check de la tabla del §1 (tras un CI verde en `main`, la lista será fiable).
6. **Block force pushes** — activado.
7. **Block deletions** — activado (impide borrar `main` por error).

## 4. API REST (avanzado)

Si preferís automatizar, construid el JSON según la documentación oficial (el cuerpo `required_status_checks` usa `checks` con `context` y opcionalmente `app_id`):

https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28#update-branch-protection

Validad el payload contra un repo de prueba o con `gh api` en dry-run antes de aplicar en producción.

## 5. CODEOWNERS

Con reviews obligatorias, GitHub sugiere revisores según `.github/CODEOWNERS`. Los equipos `@cloudsysops/*` deben existir en la org o usarse handles válidos (p. ej. fallback `@cboteros`).
