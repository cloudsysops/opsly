# Runbook: validación Doppler en CI y local

Referencia operativa para [`scripts/validate-doppler-vars.sh`](../scripts/validate-doppler-vars.sh) y [`.github/workflows/validate-doppler.yml`](../.github/workflows/validate-doppler.yml).

## Archivos

| Archivo | Propósito |
|---------|-----------|
| `scripts/validate-doppler-vars.sh` | Valida token + presencia de variables (no imprime valores). |
| `config/doppler-ci-required.txt` | Lista por defecto (usada si no hay archivo por config). |
| `config/doppler-ci-required-prd.txt` | Opcional: solo `prd`. |
| `config/doppler-ci-required-stg.txt` | Opcional: solo `stg` (menos exigente si `stg` no replica todo `prd`). |
| `.github/workflows/validate-doppler.yml` | CI en cada push/PR. |
| `docs/DOPPLER-VARS.md` | Variables y entornos. |

**Uso del script (dos argumentos obligatorios):** `<project> <config>`

```bash
export DOPPLER_TOKEN="dp.st…"   # o token de servicio
./scripts/validate-doppler-vars.sh ops-intcloudsysops prd
./scripts/validate-doppler-vars.sh ops-intcloudsysops stg
```

Salida real: líneas `[validate-doppler] OK (presente): VAR` o `ERROR: Falta o vacío: VAR`. **No** muestra hashes ni longitudes de valor en stdout (solo cumple / falla).

## 1) Secretos en GitHub Actions

En el repo → **Settings → Secrets and variables → Actions**.

Crear tokens de servicio en Doppler (solo lectura para CI):

```bash
# Un token por config (nombres libres)
doppler configs tokens create opsly-ci-prd --project ops-intcloudsysops --config prd --access read --plain
doppler configs tokens create opsly-ci-stg --project ops-intcloudsysops --config stg --access read --plain
```

Registrar en GitHub (elige una forma):

```bash
# Opción A: mismo token en ambos secretos si un único token tiene acceso a prd y stg
TOKEN=$(doppler configs tokens create opsly-ci-github --project ops-intcloudsysops --config prd --access read --plain)
printf '%s' "$TOKEN" | gh secret set DOPPLER_TOKEN_PRD -R cloudsysops/opsly
printf '%s' "$TOKEN" | gh secret set DOPPLER_TOKEN_STG -R cloudsysops/opsly

# Opción B: tokens distintos (sustituye por el valor de cada create)
printf '%s' "$TOKEN_PRD" | gh secret set DOPPLER_TOKEN_PRD -R cloudsysops/opsly
printf '%s' "$TOKEN_STG" | gh secret set DOPPLER_TOKEN_STG -R cloudsysops/opsly
```

Comprobar nombres (no muestra valores):

```bash
gh secret list -R cloudsysops/opsly | grep DOPPLER
```

## 2) Validación local (antes de push)

```bash
cd /path/to/intcloudsysops
export DOPPLER_TOKEN=$(doppler configs tokens create validate-local-prd --project ops-intcloudsysops --config prd --access read --plain)
./scripts/validate-doppler-vars.sh ops-intcloudsysops prd

export DOPPLER_TOKEN=$(doppler configs tokens create validate-local-stg --project ops-intcloudsysops --config stg --access read --plain)
./scripts/validate-doppler-vars.sh ops-intcloudsysops stg
```

## 3) Ajustar listas `doppler-ci-required*.txt`

- Edita `config/doppler-ci-required.txt` para **prd** (o crea `config/doppler-ci-required-prd.txt`).
- Si **stg** no tiene aún todas las mismas variables, crea `config/doppler-ci-required-stg.txt` con solo las que deben existir en staging.

Una variable por línea; líneas `#` son comentarios. `GOOGLE_SERVICE_ACCOUNT_JSON` exige longitud mínima **100** en el script.

## 4) Ver el workflow en Actions

```bash
gh run list -R cloudsysops/opsly --workflow validate-doppler.yml
```

## 5) Relación con `validate-context.yml`

El workflow **Validate agent context** (`validate-context.yml`) sigue siendo independiente (npm, skills, AGENTS, etc.). **Validate Doppler** es otro workflow: no está duplicado dentro de `validate-context.yml` para no alargar cada job ni repetir instalación de Doppler en el mismo YAML; ambos se ejecutan en push/PR en paralelo.

## Troubleshooting

### `DOPPLER_TOKEN no está definido`

Define `DOPPLER_TOKEN` en el entorno o en GitHub Secrets para CI.

### `Token Doppler inválido` / `doppler me falló`

Renueva el token de servicio en Doppler y actualiza el secret en GitHub.

### `Falta o vacío: VAR`

- Añade el secreto en Doppler para esa config, o
- Quita `VAR` del archivo `doppler-ci-required*.txt` si no aplica al CI.

### `GOOGLE_SERVICE_ACCOUNT_JSON` con longitud &lt; 100

Sube el JSON completo a Doppler o quita la variable de la lista de CI hasta que exista.

## Checklist rápido

```bash
test -x scripts/validate-doppler-vars.sh && echo "script ejecutable"
ls config/doppler-ci-required*.txt
test -f .github/workflows/validate-doppler.yml && echo "workflow presente"
grep -q DOPPLER-CI-RUNBOOK docs/DOPPLER-VARS.md 2>/dev/null || grep -q validate-doppler docs/DOPPLER-VARS.md
```
