---
owner: operations
status: active
last_review: 2026-06-24
---

# Peskids Mobile Deployment — Desde Celular/Escritorio

> Deploy N8N + Uptime Kuma desde tu teléfono o desktop sin SSH local

---

## 🎯 Objetivo

Ejecutar Phase 2 deployment (N8N workflows + Uptime Kama monitoring) via GitHub Actions, desde cualquier dispositivo con acceso a GitHub.

**Tiempo total:** 22 minutos
- Setup (GitHub secrets + workflow): 7 minutos
- Deployment (autónomo): 15 minutos

---

## ⚙️ PASO 1: GitHub Secrets (2 minutos)

1. Abre (en celular o desktop):
   ```
   https://github.com/cloudsysops/opsly/settings/secrets/actions
   ```

2. Click: **"New repository secret"**

3. Crea 3 secretos:

   **Secret 1:**
   - Name: `VPS_HOST`
   - Value: `100.120.151.91`
   - Click: Save

   **Secret 2:**
   - Name: `VPS_USER`
   - Value: `root`
   - Click: Save

   **Secret 3:**
   - Name: `VPS_SSH_KEY`
   - Value: (tu SSH private key para VPS — sin la frase "BEGIN PRIVATE KEY")
   - Click: Save

---

## 🔧 PASO 2: GitHub Actions Workflow (2 minutos)

### Option A: Copy-Paste en GitHub UI (Recomendado para celular)

1. Ve a: https://github.com/cloudsysops/opsly/new/main?filename=.github/workflows/peskids-deploy.yml

2. Copy-paste este contenido:

```yaml
name: Peskids Phase 2 Deployment

on:
  workflow_dispatch:
    inputs:
      task:
        description: 'Deployment task'
        required: true
        default: 'full-deployment'
        type: choice
        options:
          - validate-vps
          - deploy-n8n
          - deploy-uptime
          - full-deployment
      environment:
        description: 'Environment'
        required: true
        default: 'prd'
        type: choice
        options:
          - prd
          - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Peskids Deployment
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
        run: |
          chmod +x scripts/peskids-orchestrator.sh
          
          echo "=========================================="
          echo "Peskids Phase 2 Deployment"
          echo "Task: ${{ github.event.inputs.task }}"
          echo "Environment: ${{ github.event.inputs.environment }}"
          echo "=========================================="
          echo ""
          
          bash scripts/peskids-orchestrator.sh \
            --task "${{ github.event.inputs.task }}" \
            --env "${{ github.event.inputs.environment }}"

      - name: Upload Logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: deployment-logs
          path: deployment-*.log
          retention-days: 7

      - name: Job Summary
        if: always()
        run: |
          echo "## Peskids Deployment Complete" >> $GITHUB_STEP_SUMMARY
          echo "**Task:** ${{ github.event.inputs.task }}" >> $GITHUB_STEP_SUMMARY
          echo "**Environment:** ${{ github.event.inputs.environment }}" >> $GITHUB_STEP_SUMMARY
          echo "**Status:** ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
```

3. Click: **"Commit changes"**
4. Message: `ci: add peskids phase 2 deployment workflow`
5. Click: **"Commit"**

### Option B: Desde terminal (Si tienes git acceso)

```bash
cat > .github/workflows/peskids-deploy.yml << 'EOF'
# (pega el contenido YAML arriba aquí)
EOF

git add .github/workflows/peskids-deploy.yml
git commit -m "ci: add peskids phase 2 deployment workflow"
git push origin main
```

---

## 🚀 PASO 3: Disparar Deployment (30 segundos)

### Opción A: GitHub UI (Desde celular)

1. Ve a: https://github.com/cloudsysops/opsly/actions

2. Click: **"Peskids Phase 2 Deployment"** (el workflow que acabas de crear)

3. Click: **"Run workflow"** (botón verde)

4. Selecciona:
   - **task:** `full-deployment` (recomendado)
   - **environment:** `prd`

5. Click: **"Run workflow"**

6. ⏳ **Espera 15-20 minutos**
   - La ejecución se verá en el log
   - Verás progreso: 10% → 35% → 65% → 85% → 100%

### Opción B: Desde terminal (Si tienes SSH al VPS)

```bash
bash scripts/peskids-orchestrator.sh --task full-deployment --env prd
```

---

## 📊 Monitoreo en Tiempo Real

### GitHub Actions Log (celular)

- Abre: https://github.com/cloudsysops/opsly/actions
- Click en el workflow en ejecución
- Verás cada paso:
  ```
  ✓ Validate VPS (10%)
  ✓ Deploy N8N (35%)
  ✓ Deploy Uptime (65%)
  ✓ Smoke tests (85%)
  ✓ Complete (100%)
  ```

### Terminal (Si tienes acceso)

```bash
# Ver logs en tiempo real (si tienes SSH)
ssh root@100.120.151.91 "tail -f /opt/opsly/peskids-deploy.log"
```

---

## ✅ Validación Post-Deployment

### Checklist final:

```bash
# 1. N8N está levantado?
curl -s https://n8n-peskids.op-sly.com/health

# 2. Uptime Kuma está levantado?
curl -s https://uptime-peskids.op-sly.com

# 3. Workflows creados en N8N?
# (Via UI: https://n8n-peskids.op-sly.com)
# - Lead Capture workflow
# - Hot Lead Alert workflow

# 4. Monitores en Uptime?
# (Via UI: https://uptime-peskids.op-sly.com)
# - API health
# - Landing page
# - N8N endpoint
# - Uptime dashboard
```

---

## 🆘 Troubleshooting

| Error | Solución |
|-------|----------|
| `SSH key invalid` | Verificar que VPS_SSH_KEY esté completo (sin espacios extras) |
| `Docker not running` | SSH a VPS: `docker ps` → Si vacío, hacer restart |
| `N8N deploy failed` | Check logs: `docker logs n8n-peskids` |
| `Smoke tests failed` | Esperar 30 seg más (N8N tarda en iniciar) |
| `Workflow not visible` | Refresh GitHub, buscar `peskids-deploy.yml` |

---

## 📞 Support

Si algo falla:

1. **Copia el job ID** de GitHub Actions
2. **Share el error output** con el equipo ops
3. **Rollback** (si es necesario):
   ```bash
   bash scripts/peskids-orchestrator.sh --task rollback-peskids --env prd
   ```

---

## 🎯 Success Criteria

✅ Full deployment SUCCESS cuando:

1. GitHub Actions workflow completa con estado verde
2. N8N dashboard accesible: https://n8n-peskids.op-sly.com
3. Uptime Kuma dashboard accesible: https://uptime-peskids.op-sly.com
4. Todos los smoke tests pasan (4/4 endpoints up)
5. Cliente puede ver N8N workflows + Uptime monitors

---

*Last updated: 2026-06-24 — Ready for production deployment*
