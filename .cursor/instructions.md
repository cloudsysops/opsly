# 🚀 Cursor Auto-Work Instructions

**Este archivo es leído automáticamente por Cursor**

## 📌 Auto-Detect Workflow

Cuando abras este proyecto, Cursor debe:

1. **Detectar** si existe `.cursor-auto-work.json`
2. **Leer** la tarea actual de ese archivo
3. **Generar** archivo de instrucciones en `.cursor-work/CURRENT-TASK.md`
4. **Notificar** al usuario que hay trabajo asignado

## 🔄 Ciclo automático

```
1. Usuario clona rama en su máquina
2. Git hook post-checkout se ejecuta
3. .cursor-auto-work.sh prepara el ambiente
4. Cursor abre el proyecto
5. Cursor ve .cursor-auto-work.json
6. Cursor muestra instrucciones en .cursor-work/CURRENT-TASK.md
7. Usuario abre archivo y ve la tarea
8. Usuario ejecuta la tarea
9. Cuando termina, actualiza estado en .cursor-auto-work.json
```

## 📋 Cómo usar

### Para el usuario (Local):

```bash
# 1. Clona/checkout la rama
git checkout claude/peskids-cursor-avance-1ortri

# 2. Git hook se ejecuta automáticamente
# 3. Abre Cursor
code .

# 4. Cursor lee .cursor-auto-work.json automáticamente
# 5. Abre .cursor-work/CURRENT-TASK.md
# 6. Sigue las instrucciones

# 7. Cuando termines, actualiza el JSON
cat > .cursor-auto-work.json << 'EOF'
{
  "status": "completed",
  "completed_at": "2026-08-07T13:00:00Z"
}
EOF

git push origin $(git rev-parse --abbrev-ref HEAD)
```

### Para Claude (En la nube):

```bash
# 1. Crea .cursor-auto-work.json con la nueva tarea
# 2. Commit y push
git add .cursor-auto-work.json
git commit -m "auto-work: assign task PESKIDS-1.1"
git push

# 3. Usuario en local hace:
git pull
# ... git hook se ejecuta automáticamente
# ... Cursor detecta la tarea
```

## 🎯 Formato del .cursor-auto-work.json

```json
{
  "version": "1.0",
  "status": "pending|in_progress|completed",
  "task": {
    "id": "PESKIDS-1.1",
    "title": "Renovar header admin",
    "description": "...",
    "priority": "HIGH|MEDIUM|LOW",
    "estimated_hours": 2.5
  },
  "files_to_edit": ["path/to/file1.tsx"],
  "reference_docs": ["path/to/doc.md"],
  "auto_commands": ["git checkout ...", "npm run type-check"],
  "checklist": ["Item 1", "Item 2"]
}
```

## 🔍 Cursor auto-detection

Cursor debería:

1. Leer `.cursor-auto-work.json` al abrir el proyecto
2. Mostrar notificación: "Auto-work task detected: [TASK-ID]"
3. Abrir automáticamente `.cursor-work/CURRENT-TASK.md`
4. Ofrecer botón para "Start task" que ejecute comandos iniciales

## 📊 Estados posibles

- `pending` → Tarea nueva, sin empezar
- `in_progress` → En desarrollo
- `review` → Esperando revisión
- `completed` → Terminada
- `blocked` → Bloqueada, necesita ayuda

## 🆘 Si algo no funciona

### El git hook no se ejecutó:
```bash
# Verifica permisos
ls -la .git/hooks/post-checkout
# Debe ser ejecutable (x)

# Si no, hazlo ejecutable
chmod +x .git/hooks/post-checkout
```

### Cursor no ve el archivo JSON:
```bash
# Verifica que el archivo existe
cat .cursor-auto-work.json

# Verifica que Cursor tiene acceso
# (en caso de permisos raros)
```

### El script falla:
```bash
# Ejecuta manualmente
bash .cursor-auto-work.sh

# Ver errores
bash -x .cursor-auto-work.sh
```

## 💡 Tips pro

1. **Actualiza estado regularmente**: Al empezar, cambia status a `in_progress`
2. **Commit frecuente**: No esperes a terminar la tarea entera
3. **Si hay bloqueo**: Cambia status a `blocked` y describe el problema
4. **Después de terminar**: Cambia status a `completed` y haz push

## 🔗 Archivos relacionados

- `.cursor-auto-work.json` → Configuración de tarea actual
- `.cursor-auto-work.sh` → Script de auto-setup
- `.git/hooks/post-checkout` → Git hook que se ejecuta
- `.cursor-work/CURRENT-TASK.md` → Instrucciones generadas (auto-creado)
- `CLAUDE.md` → Instrucciones globales del proyecto

---

**Fecha de creación:** 2026-08-07  
**Versión:** 1.0  
**Rama:** claude/peskids-cursor-avance-1ortri
