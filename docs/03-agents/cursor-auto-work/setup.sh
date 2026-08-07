#!/bin/bash

# Script: .cursor-auto-work.sh
# Ejecutado automáticamente por el git hook post-checkout
# Prepara el ambiente para la tarea asignada

set -e

echo ""
echo "🔧 Inicializando auto-work setup..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verifica que estamos en la rama correcta
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}📌 Rama actual: $CURRENT_BRANCH${NC}"

# 2. Lee el archivo de configuración
if [ ! -f ".cursor-auto-work.json" ]; then
  echo -e "${YELLOW}⚠️  No se encontró .cursor-auto-work.json${NC}"
  exit 0
fi

TASK_ID=$(jq -r '.task.id' .cursor-auto-work.json 2>/dev/null)
echo -e "${BLUE}📋 Tarea: $TASK_ID${NC}"

# 3. Ejecuta los comandos auto
echo ""
echo -e "${BLUE}⚙️  Ejecutando comandos automáticos...${NC}"

AUTO_COMMANDS=$(jq -r '.auto_commands[]' .cursor-auto-work.json 2>/dev/null)

if [ ! -z "$AUTO_COMMANDS" ]; then
  while IFS= read -r cmd; do
    if [ ! -z "$cmd" ]; then
      echo -e "${YELLOW}$ $cmd${NC}"
      eval "$cmd" || echo "⚠️  Comando falló pero continuando..."
    fi
  done <<< "$AUTO_COMMANDS"
fi

# 4. Crea directorio de workspace si es necesario
WORKSPACE_DIR=".cursor-work"
if [ ! -d "$WORKSPACE_DIR" ]; then
  mkdir -p "$WORKSPACE_DIR"
  echo -e "${GREEN}✓ Creado directorio de trabajo: $WORKSPACE_DIR${NC}"
fi

# 5. Genera archivo de instrucciones para Cursor
CURSOR_INSTRUCTIONS="$WORKSPACE_DIR/CURRENT-TASK.md"

cat > "$CURSOR_INSTRUCTIONS" << 'EOF'
# ⚡ TAREA ACTUAL PARA CURSOR

**AUTO-GENERADO:** Este archivo fue creado automáticamente por Claude (en la nube)

## 🎯 Tu trabajo ahora es:

EOF

jq -r '.task.title' .cursor-auto-work.json >> "$CURSOR_INSTRUCTIONS" 2>/dev/null || echo "Tarea" >> "$CURSOR_INSTRUCTIONS"

cat >> "$CURSOR_INSTRUCTIONS" << 'EOF'

### 📝 Descripción

EOF

jq -r '.task.description' .cursor-auto-work.json >> "$CURSOR_INSTRUCTIONS" 2>/dev/null || echo "N/A" >> "$CURSOR_INSTRUCTIONS"

cat >> "$CURSOR_INSTRUCTIONS" << 'EOF'

### 📂 Archivos a editar

EOF

jq -r '.files_to_edit[]' .cursor-auto-work.json >> "$CURSOR_INSTRUCTIONS" 2>/dev/null || echo "Revisar plan" >> "$CURSOR_INSTRUCTIONS"

cat >> "$CURSOR_INSTRUCTIONS" << 'EOF'

### 📚 Documentación

1. Lee primero: `docs/CURSOR-QUICK-START.md`
2. Referencia: `docs/PESKIDS-LEVEL-UP-PLAN.md`
3. DB Schema: `docs/tenants/peskids/DATA-MODEL.md`

### 🚀 Próximos pasos

1. `npm run dev` (inicia dev server en puerto 3004)
2. Edita los archivos listados arriba
3. `npm run type-check` (valida TypeScript)
4. `git add -A && git commit -m "feat(peskids): [TASK-ID] description"`
5. `git push origin $(git rev-parse --abbrev-ref HEAD)`

### ✅ Cuando termines

- [ ] Tarea completada
- [ ] Tests pasando
- [ ] type-check OK
- [ ] Commit pusheado
- [ ] Elimina este archivo o marca como `[DONE]`

---

**Hora de inicio:** $(date)
**Status:** 🔴 EN PROGRESO

EOF

echo -e "${GREEN}✓ Instrucciones generadas en: $CURSOR_INSTRUCTIONS${NC}"

# 6. Verifica que npm dependencies están instaladas
if [ ! -d "node_modules" ]; then
  echo ""
  echo -e "${YELLOW}📦 Instalando dependencias npm...${NC}"
  npm install
else
  echo -e "${GREEN}✓ node_modules encontrado${NC}"
fi

# 7. Notificación final
echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✨ AUTO-WORK SETUP COMPLETADO${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}PRÓXIMOS PASOS:${NC}"
echo "1. Abre Cursor en este proyecto"
echo "2. Lee: .cursor-work/CURRENT-TASK.md"
echo "3. Edita los archivos listados"
echo "4. Ejecuta: npm run dev"
echo ""
echo -e "${YELLOW}Recuerda: ${GREEN}npm run type-check${YELLOW} antes de cada commit${NC}"
echo ""

exit 0
