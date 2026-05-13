# .claude/ Sync Guide — Trabajar igual en Local + VPS

## 1. Archivos que van a Git (sincronizados)

```
.claude/
├── settings.json                    # ✅ CANONICAL (versionado)
├── CLAUDE.md
├── README.md
├── 1-agent-teams/
├── 2-context-management/
├── 3-slash-commands/
├── 4-hooks/
└── SYNC-GUIDE.md                    # Este archivo
```

**Commit:**
```bash
git add .claude/settings.json .claude/CLAUDE.md .claude/1-agent-teams/ .claude/2-context-management/ .claude/3-slash-commands/ .claude/4-hooks/
git commit -m "chore: sync .claude config across machines"
git push
```

## 2. Archivo que NO va a Git (máquina-específico)

```
.claude/
└── settings.local.json              # ❌ GITIGNORED (permisos + secretos locales)
```

**Por qué:**
- Contiene permisos específicos de cada máquina
- Puede tener credenciales temporales
- No debe sincronizarse automáticamente

## 3. Configuración para Cada Máquina

### Local (tu Mac)

```bash
# 1. Pullear cambios
git pull

# 2. Crear .claude/settings.local.json con machine ID
cat > .claude/settings.local.json << 'EOF'
{
  "machine": {
    "name": "cristian-mac-2024",
    "environment": "local",
    "os": "darwin",
    "vpsAccess": true
  },
  "permissions": {
    "allow": [
      "Bash(ssh vps-dragon@100.120.151.91 *)",
      "Bash(docker:*)",
      "Bash(npm:*)",
      "Bash(pnpm run:*)",
      "Bash(rtk:*)"
    ]
  },
  "model": {
    "default": "claude-opus-4-7",
    "fastMode": false
  },
  "sync": {
    "enabled": true,
    "target": "github",
    "interval": "30s"
  }
}
EOF
```

### VPS

```bash
# 1. Pullear cambios
cd /opt/opsly && git pull

# 2. Crear .claude/settings.local.json con machine ID
cat > .claude/settings.local.json << 'EOF'
{
  "machine": {
    "name": "vps-ops-100.120.151.91",
    "environment": "production",
    "os": "linux",
    "vpsAccess": true,
    "services": {
      "mcp": "3003",
      "orchestrator": "3011",
      "llm-gateway": "3010",
      "api": "3000"
    }
  },
  "permissions": {
    "allow": [
      "Bash(docker:*)",
      "Bash(systemctl:*)",
      "Bash(curl:*)",
      "Bash(redis-cli:*)"
    ]
  },
  "model": {
    "default": "claude-opus-4-7"
  },
  "sync": {
    "enabled": true,
    "target": "github",
    "interval": "60s"
  }
}
EOF
```

## 4. Post-Setup: Activar Agentes en Ambas Máquinas

```bash
# En ambas máquinas:
git config core.hooksPath .claude/4-hooks
chmod +x .claude/4-hooks/*.sh

# Validar
git config core.hooksPath
# Debería mostrar: .claude/4-hooks
```

## 5. Script de Sincronización (Opcional)

Si quieres auto-sync cada cierto tiempo:

```bash
# .claude/sync-config.sh
#!/bin/bash

set -e

MACHINE=$(cat .claude/settings.local.json | jq -r '.machine.name')
echo "🔄 Syncing .claude/ on $MACHINE..."

git fetch origin
git merge origin/main -- .claude/

echo "✅ Sync complete at $(date)"
```

```bash
chmod +x .claude/sync-config.sh

# Agregarlo a crontab en ambas máquinas:
# */10 * * * * cd /opt/opsly && bash .claude/sync-config.sh >> /tmp/opsly-sync.log 2>&1
```

## 6. Verificar Sincronización

```bash
# En local o VPS:
diff <(git show origin/main:.claude/settings.json) .claude/settings.json

# Si no hay diff, todo está sincronizado
echo "✅ .claude config is in sync"
```

## 7. Regla Crítica

| Archivo                   | Git? | Local Override? | Recomendación       |
|---------------------------|------|-----------------|---------------------|
| `.claude/settings.json`    | ✅   | ❌              | Canonical, no editar |
| `.claude/settings.local.json` | ❌  | ✅              | Machine-specific |
| `.claude/CLAUDE.md`        | ✅   | ❌              | Global, no editar |
| `.claude/4-hooks/`         | ✅   | ❌              | Canonical |
| `.claude/1-agent-teams/`   | ✅   | ❌              | Canonical |

## 8. Flujo Típico

```bash
# En Local: cambio agent o skill
vim .claude/1-agent-teams/orchestrator.md
git add .claude/1-agent-teams/orchestrator.md
git commit -m "chore(agents): update orchestrator config"
git push

# En VPS (5 minutos después, automático o manual):
git pull origin main
bash .claude/sync-config.sh
# Nuevos agents cargados automáticamente
```

## 9. Troubleshooting

**Los agentes no se cargan en VPS:**
```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly
git status  # ¿Está en main y actualizado?
cat .claude/settings.local.json | jq '.machine'
node scripts/skill-finder.js --autonomous  # Forzar carga
```

**Permissions mismatch entre máquinas:**
```bash
# Local
cat .claude/settings.local.json | jq '.permissions.allow | length'

# VPS
ssh vps-dragon@100.120.151.91 "cat .claude/settings.local.json | jq '.permissions.allow | length'"

# Deben ser diferentes (máquinas distintas) pero compatible
```

---

**Next:** Documentar en AGENTS.md qué agentes se cargan en cada máquina.
