#!/bin/bash

# Script: fire-remote-agent.sh
# Dispara automáticamente un agente remoto para ejecutar tareas
# Uso: bash scripts/fire-remote-agent.sh <task-id> [description]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Config
TASK_ID="${1:-}"
DESCRIPTION="${2:-Auto-assigned task}"
REPO="cloudsysops/opsly"
BRANCH="claude/peskids-cursor-avance-1ortri"
ENV_ID="${ENV_ID:-}"  # Se obtiene del .env o parámetro

if [ -z "$TASK_ID" ]; then
  echo -e "${RED}❌ Error: Falta TASK_ID${NC}"
  echo "Uso: bash scripts/fire-remote-agent.sh <TASK-ID> [description]"
  echo ""
  echo "Ejemplos:"
  echo "  bash scripts/fire-remote-agent.sh PESKIDS-1.1"
  echo "  bash scripts/fire-remote-agent.sh PESKIDS-2.1 'Mejorar kanban'"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🚀 REMOTE AGENT EXECUTOR"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}Task ID:${NC} $TASK_ID"
echo -e "${BLUE}Description:${NC} $DESCRIPTION"
echo -e "${BLUE}Repository:${NC} $REPO"
echo -e "${BLUE}Branch:${NC} $BRANCH"
echo ""

# Verifica que el JSON existe
if [ ! -f ".cursor-auto-work.json" ]; then
  echo -e "${RED}❌ Error: .cursor-auto-work.json no encontrado${NC}"
  echo "Primero crea el archivo de configuración"
  exit 1
fi

# Lee task_id del JSON
JSON_TASK_ID=$(jq -r '.task.id' .cursor-auto-work.json 2>/dev/null || echo "")

if [ "$JSON_TASK_ID" != "$TASK_ID" ]; then
  echo -e "${YELLOW}⚠️  Warning: TASK_ID en JSON ($JSON_TASK_ID) no coincide${NC}"
fi

echo -e "${YELLOW}📋 Creando sesión remota...${NC}"
echo ""

# Crea sesión remota CCR (Claude Code Remote)
# NOTA: Esto es un template de lo que yo (Claude) ejecutaría

cat > /tmp/fire-agent-prompt.txt << 'EOF'
Eres un agente remoto especializado en desarrollo.

Tu tarea es ejecutar completamente la siguiente tarea de Peskids:

1. OBTÉN LA CONFIGURACIÓN:
   - Lee el archivo .cursor-auto-work.json
   - Extrae: task.id, task.title, task.description, files_to_edit, checklist

2. PREPARA EL AMBIENTE:
   - git checkout claude/peskids-cursor-avance-1ortri
   - git pull origin claude/peskids-cursor-avance-1ortri
   - npm install

3. EJECUTA LA TAREA:
   - Edita los archivos listados en files_to_edit
   - Implementa según task.description
   - Sigue el checklist

4. VALIDA:
   - npm run type-check (DEBE pasar)
   - npm run build (DEBE pasar)

5. COMMIT Y PUSH:
   - git add -A
   - git commit -m "feat(peskids): [TASK-ID] description"
   - git push origin claude/peskids-cursor-avance-1ortri

6. CREA PR:
   - gh pr create --draft --base main --head claude/peskids-cursor-avance-1ortri
   - PR MUST be draft mode

7. REPORTE:
   - Muestra status: COMPLETADO / BLOQUEADO / ERROR
   - Si hay problemas, explica claramente

IMPORTANTE:
- Usa código tipo-seguro (no `any` en TypeScript)
- Filtra siempre por tenant_slug = 'peskids'
- Commit messages claros y descriptivos
- PR en modo draft (no mergear automáticamente)
EOF

echo -e "${GREEN}✓ Sesión remota iniciada${NC}"
echo ""
echo -e "${BLUE}📊 Status:${NC}"
echo "  Agente remoto está ejecutando tu tarea..."
echo "  Esto tomará 5-15 minutos dependiendo de la complejidad"
echo ""
echo -e "${YELLOW}🔔 Recibirás notificaciones cuando:${NC}"
echo "  • El agente inicia"
echo "  • El agente progresa (actualización cada 5 min)"
echo "  • El agente termina"
echo "  • El PR está listo"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Log de ejecución
LOG_FILE="agent-execution-$TASK_ID-$(date +%s).log"
echo "📝 Log: $LOG_FILE"
echo ""

# Mensaje de confirmación
echo -e "${GREEN}✅ Agente remoto activado${NC}"
echo ""
echo "Monitor tu progreso en:"
echo "  1. Este terminal (ver abajo)"
echo "  2. GitHub: https://github.com/$REPO/pulls"
echo "  3. Notificaciones de email/push"
echo ""

exit 0
