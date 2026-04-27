# Capas de Despliegue: Sandbox → QA → Prod

> **Versión:** 1.0 | **Fecha:** 2026-04-21

Sistema de capas para implementar cambios de forma segura: **Sandbox** → **QA** → **Prod**.

---

## 1. Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OPSLY DEPLOYMENT LAYERS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────────────────────┐  │
│  │ LOCAL  │───▶│SANDBOX │───▶│   QA   │───▶│         PROD              │  │
│  │(Mac)   │    │(VPS test)│    │(staging)│   │    (production)         │  │
│  └─────────┘    └─────────┘    └─────────┘    └──────────────────────────┘  │
│       │            │             │              │                        │
│       │        auto-deploy   auto-deploy    approval-gate                │
│       │            │             │              │                        │
│       ▼            ▼             ▼              ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GitHub Actions                                    │   │
│  │  • layer-deploy.yml    • layer-promote.yml    • layer-approve.yml   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Definición de Capas

| Capa        | Entorno        | URL Base                        | Propósito              | Auto-deploy       |
| ----------- | -------------- | ------------------------------- | ---------------------- | ----------------- |
| **local**   | Mac desarrollo | `localhost:3000`                | Desarrollo rápido      | ❌                |
| **sandbox** | VPS sandbox    | `sandbox.ops.smiletripcare.com` | Pruebas de integración | ✅                |
| **qa**      | VPS staging    | `qa.ops.smiletripcare.com`      | QA testing             | ✅                |
| **prod**    | VPS production | `ops.smiletripcare.com`         | Producción             | ✅ (con approval) |

---

## 2. Variables por Capa

### Environment Variables

```bash
# ┌─────────────────────────────────────────────────────────────┐
# │                    SANDBOX LAYER                             │
# └──────────────────────────��──────────────────────────────────┘

OPSLY_LAYER=sandbox
OPSLY_ENVIRONMENT=development
DOPPLER_CONFIG=sandbox
DATABASE_URL=postgresql://user:pass@sandbox-db
REDIS_URL=redis://sandbox-cache
API_URL=https://api-sandbox.ops.smiletripcare.com
ADMIN_URL=https://admin-sandbox.ops.smiletripcare.com
PORTAL_URL=https://portal-sandbox.ops.smiletripcare.com

# ──────────────────────────────────────────────────────────────

# ┌─────────────────────────────────────────────────────────────┐
# │                      QA LAYER                               │
# └─────────────────────────────────────────────────────────────┘

OPSLY_LAYER=qa
OPSLY_ENVIRONMENT=staging
DOPPLER_CONFIG=qa
DATABASE_URL=postgresql://user:pass@qa-db
REDIS_URL=redis://qa-cache
API_URL=https://api-qa.ops.smiletripcare.com
ADMIN_URL=https://admin-qa.ops.smiletripcare.com
PORTAL_URL=https://portal-qa.ops.smiletripcare.com

# ──────────────────────────────────────────────────────────────

# ┌─────────────────────────────────────────────────────────────┐
# │                     PROD LAYER                             │
# └─────────────────────────────────────────────────────────────┘

OPSLY_LAYER=prod
OPSLY_ENVIRONMENT=production
DOPPLER_CONFIG=prd
DATABASE_URL=postgresql://user:pass@prod-db
REDIS_URL=redis://prod-cache
API_URL=https://api.ops.smiletripcare.com
ADMIN_URL=https://admin.ops.smiletripcare.com
PORTAL_URL=https://portal.ops.smiletripcare.com
```

---

## 3. GitHub Actions Workflow

```yaml
# .github/workflows/layer-deploy.yml
name: Layer Deploy

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:
    inputs:
      layer:
        type: choice
        options:
          - sandbox
          - qa
        default: qa

jobs:
  deploy-sandbox:
    name: Deploy Sandbox
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || inputs.layer == 'sandbox'
    environment: sandbox
    steps:
      - uses: actions/checkout@v4

      - name: Configure Sandbox
        run: |
          echo "OPSLY_LAYER=sandbox" >> $GITHUB_ENV
          doppler secrets download --config sandbox

      - name: Deploy to Sandbox VPS
        run: |
          # Deploy to sandbox VPS
          ./scripts/deploy-layer.sh sandbox

      - name: Run Sandbox Tests
        run: |
          npm run test --workspace=@intcloudsysops/api
          npm run test:e2e --workspace=@intcloudsysops/portal

      - name: Notify Success
        if: success()
        run: |
          echo "✅ Sandbox deployed successfully"
```

---

## 4. Promotion Workflow

```yaml
# .github/workflows/layer-promote.yml
name: Layer Promotion

on:
  workflow_dispatch:
    inputs:
      source:
        type: choice
        options:
          - sandbox
          - qa
        description: Source layer
      target:
        type: choice
        options:
          - qa
          - prod
        description: Target layer

jobs:
  promote:
    name: Promote ${{ inputs.source }} ��� ${{ inputs.target }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Verify Source Health
        run: |
          SOURCE_URL=$(./scripts/get-layer-url.sh ${{ inputs.source }})
          curl -sf "$SOURCE_URL/api/health" || exit 1

      - name: Run Integration Tests
        run: |
          ./scripts/run-layer-tests.sh ${{ inputs.source }}

      - name: Create Promotion PR
        if: inputs.target == 'prod'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PR_TITLE="Promote: ${{ inputs.source }} → ${{ inputs.target }}"
          gh pr create --title "$PR_TITLE" \
            --body "Promotion request from ${{ inputs.source }} to ${{ inputs.target }}" \
            --base main --head promote/${{ inputs.source }}-${{ inputs.target }}

      - name: Tag Release
        if: inputs.target == 'prod'
        run: |
          TAG="v$(date +%Y.%m.%d)-prod"
          git tag $TAG
          git push origin $TAG
```

---

## 5. Approval Gate para Prod

```yaml
# .github/workflows/layer-approve-prod.yml
name: Production Approval Gate

on:
  pull_request:
    types: [opened, ready_for_review]
    branches:
      - main

jobs:
  approval-gate:
    name: Production Approval Required
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'promotion-to-prod')
    steps:
      - name: Check Required Approvals
        run: |
          # Check for required reviewers
          REVIEWERS=$(gh pr view ${{ github.event.pull_request.number }} \
            --json reviewDecision -q '.reviewDecision')

          if [ "$REVIEWERS" != "APPROVED" ]; then
            echo "❌ PR requires approvals before production deployment"
            exit 1
          fi

          # Check for passing tests
          ./scripts/verify-layer-tests.sh prod

          echo "✅ All checks passed - ready for production"

      - name: Add Deployment Label
        if: success()
        run: |
          gh pr edit ${{ github.event.pull_request.number }} \
            --add-label "deploy-to-prod"
```

---

## 6. Scripts de Support

```bash
#!/bin/bash
# scripts/get-layer-url.sh

LAYER="${1:-qa}"

case $LAYER in
  sandbox)
    echo "https://api-sandbox.ops.smiletripcare.com"
    ;;
  qa)
    echo "https://api-qa.ops.smiletripcare.com"
    ;;
  prod|production)
    echo "https://api.ops.smiletripcare.com"
    ;;
  *)
    echo "Unknown layer: $LAYER" >&2
    exit 1
    ;;
esac
```

```bash
#!/bin/bash
# scripts/deploy-layer.sh

LAYER="${1:-qa}"
DRY_RUN="${2:-}"

echo "┌─────────────────────────────────────────────"
echo "│  Deploying to: $LAYER"
echo "└─────────────────────────────────────────────"

# Load layer-specific environment
env_file=".env.$LAYER"
if [ ! -f "$env_file" ]; then
  echo "❌ $env_file not found"
  exit 1
fi

echo "Loading $env_file..."
source "$env_file"

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY-RUN] Would deploy to layer: $LAYER"
  exit 0
fi

# Deploy via Docker
case $LAYER in
  sandbox)
    docker compose -f infra/docker-compose.platform.yml \
      --env-file .env.$LAYER up -d app admin
    ;;
  qa)
    docker compose -f infra/docker-compose.platform.yml \
      --env-file .env.$LAYER up -d app admin portal
    ;;
  prod)
    echo "⚠️  Production deployment requires approval"
    # Verify approval before deploying
    if [ -z "$APPROVED" ]; then
      echo "❌ No approval found for production deployment"
      exit 1
    fi
    docker compose -f infra/docker-compose.platform.yml \
      --env-file .env.$LAYER up -d app admin portal
    ;;
esac

echo "✅ Layer $LAYER deployed"
```

---

## 7. Commands para Despliegue

```bash
# ┌─────────────────────────────────────────────────────────────┐
# │                  SANDBOX (auto-deploy)                       │
# └─────────────────────────────────────────────────────────────┘

# Push a main → sandbox auto-deploy
git push origin main

# ──────────────────────────────────────────────────────────────

# ┌─────────────────────────────────────────────────────────────┐
# │                         QA                                    │
# └─────────────────────────────────────────────────────────────┘

# Promover sandbox → QA
gh workflow run layer-promote.yml -f source=sandbox -f target=qa

# ──────────────────────────────────────────────────────────────

# ┌─────────────────────────────────────────────────────────────┐
# │                    PRODUCTION                                │
# └────────────────────────────���────────────────────────────────┘

# 1. Solicitar promoción a prod (crea PR)
gh workflow run layer-promote.yml -f source=qa -f target=prod

# 2. Aprobar en GitHub (requiere review)
#    - Agregar label "promotion-to-prod"
#    - Esperar approval reviews

# 3. Merge PR → deploy automático a prod
git checkout main
git pull origin main
```

---

## 8. Checklist de Promotion

| Paso                  | Sandbox     | QA           | Prod         |
| --------------------- | ----------- | ------------ | ------------ |
| Tests unitarios pasan | ✅ auto     | ✅ auto      | ✅ auto      |
| Tests E2E pasan       | ✅ auto     | ✅ auto      | ⏳ manual    |
| Code review           | ⏳ optional | ✅ required  | ✅ required  |
| Aprobación security   | ❌ none     | ⏳ recommend | ✅ required  |
| Aprobación producto   | ❌ none     | ❌ none      | ✅ required  |
| Demo/Ticket           | ⏳ optional | ✅ requerida | ✅ requerida |

---

## 9. Configurar Nuevas Capas

### Agregar nueva capa:

1. **Añadir a Doppler:**

   ```bash
   doppler configs create $NEW_LAYER --project ops-intcloudsysops
   ```

2. **Agregar DNS:**

   ```
   api-$NEW_LAYER.ops.smiletripcare.com → VPS
   ```

3. **Crear .env file:**

   ```bash
   cp .env.example .env.$NEW_LAYER
   # Editar con valores específicos
   ```

4. **Agregar a workflow:**
   ```yaml
   # En layer-deploy.yml
   - name: Deploy $NEW_LAYER
     if: inputs.layer == '$NEW_LAYER'
   ```
