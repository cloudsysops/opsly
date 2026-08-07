# 🚀 Cursor Auto-Work Trigger System

**Sistema automático para asignar trabajo a Cursor sin intervención manual**

---

## 📋 ¿Qué es esto?

Es un sistema que permite que **yo (Claude en la nube)** asigne trabajo a **Cursor (en tu máquina local)**, y Cursor lo **detecte y ejecute automáticamente** sin que tengas que hacer nada más que:

```bash
git pull  # ← Eso es TODO
```

---

## 🎯 Flujo completo

```
┌─────────────────────────────────────────────────────────────────┐
│ CLAUDE (En la nube)                                             │
│                                                                 │
│ 1. Yo creo el plan y archivos                                  │
│ 2. Genero .cursor-auto-work.json                               │
│ 3. Commit + push a rama                                        │
│ 4. Te digo "Listo, prueba en tu máquina"                       │
└────────────────────┬────────────────────────────────────────────┘
                     │ git push
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ TU MÁQUINA LOCAL (GitHub)                                       │
│                                                                 │
│ Rama: claude/peskids-cursor-avance-1ortri                      │
│ + .cursor-auto-work.json (nueva)                               │
│ + .cursor-auto-work.sh (setup automático)                      │
│ + .git/hooks/post-checkout (git hook)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │ git pull / git checkout
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ GIT HOOK (post-checkout) — ⚡ SE EJECUTA AUTOMÁTICAMENTE       │
│                                                                 │
│ ✓ Detecta .cursor-auto-work.json                               │
│ ✓ Muestra instrucciones en terminal                            │
│ ✓ Ejecuta .cursor-auto-work.sh                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ bash .cursor-auto-work.sh
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ SETUP SCRIPT (.cursor-auto-work.sh)                            │
│                                                                 │
│ ✓ npm install (si necesita)                                    │
│ ✓ Genera .cursor-work/CURRENT-TASK.md                          │
│ ✓ Prepara ambiente                                             │
│ ✓ Notifica "Listo para Cursor"                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ CURSOR (Tu editor local)                                        │
│                                                                 │
│ 1. Abre el proyecto (code .)                                   │
│ 2. Lee .cursor-auto-work.json automáticamente                  │
│ 3. VE LA TAREA en .cursor-work/CURRENT-TASK.md                 │
│ 4. EJECUTA LA TAREA                                            │
│ 5. Hace commit + push                                          │
└────────────────────┬────────────────────────────────────────────┘
                     │ git push
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ GITHUB (Pull Request)                                           │
│                                                                 │
│ Tu trabajo está listo para review                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes del sistema

### 1️⃣ `.cursor-auto-work.json` (Archivo de configuración)

**Lo que yo creo para asignarte tarea:**

```json
{
  "status": "pending",
  "task": {
    "id": "PESKIDS-1.1",
    "title": "Renovar admin shell header",
    "description": "Mejorar components/admin/admin-shell.tsx...",
    "priority": "HIGH",
    "estimated_hours": 2.5
  },
  "files_to_edit": ["apps/peskids/components/admin/admin-shell.tsx"],
  "reference_docs": ["apps/peskids/docs/CURSOR-QUICK-START.md"],
  "auto_commands": ["git pull", "npm run type-check"],
  "checklist": ["Item 1", "Item 2", "Item 3"]
}
```

**Estado posibles:**
- `pending` → Tarea nueva sin empezar
- `in_progress` → En desarrollo
- `completed` → Terminada
- `blocked` → Necesita ayuda

### 2️⃣ `.git/hooks/post-checkout` (Git hook automático)

**Se ejecuta AUTOMÁTICAMENTE cuando haces:**
```bash
git checkout rama
git pull
git clone
```

**Qué hace:**
- ✓ Detecta `.cursor-auto-work.json`
- ✓ Muestra instrucciones en terminal
- ✓ Ejecuta el script de setup

### 3️⃣ `.cursor-auto-work.sh` (Setup script)

**Ejecutado por el git hook, prepara todo:**
- ✓ Instala dependencias (`npm install`)
- ✓ Genera `.cursor-work/CURRENT-TASK.md` con instrucciones
- ✓ Notifica que está listo

### 4️⃣ `.cursor/instructions.md` (Instrucciones de Cursor)

**Lo que Cursor debería hacer automáticamente:**
- Leer `.cursor-auto-work.json`
- Abrir `.cursor-work/CURRENT-TASK.md`
- Mostrar notificación de tarea

---

## 💻 Uso: Flujo paso a paso

### Tu lado (Local):

**Paso 1: Clonar/Checkout rama**
```bash
git checkout claude/peskids-cursor-avance-1ortri
# ⚡ Git hook se ejecuta aquí automáticamente
```

**Paso 2: Ver las instrucciones**
```bash
cat .cursor-work/CURRENT-TASK.md
# Verás algo como:
# ⚡ TAREA ACTUAL PARA CURSOR
# 📋 ID: PESKIDS-1.1
# Título: Renovar admin shell header
# ...
```

**Paso 3: Abrir Cursor**
```bash
code .
# Cursor abre y VE la tarea automáticamente
```

**Paso 4: Ejecutar la tarea**
```
En Cursor:
- Lee .cursor-work/CURRENT-TASK.md
- Edita los archivos listados
- Ejecuta: npm run dev
- Valida: npm run type-check
```

**Paso 5: Commit y push**
```bash
git add -A
git commit -m "feat(peskids): [PESKIDS-1.1] renovar admin header"
git push origin claude/peskids-cursor-avance-1ortri
```

---

## 🎯 Mi lado (Cloud):

**Cuando asigno tarea:**

```bash
# 1. Creo el JSON
cat > .cursor-auto-work.json << 'EOF'
{
  "status": "pending",
  "task": {
    "id": "PESKIDS-1.1",
    "title": "Renovar admin header",
    ...
  },
  ...
}
EOF

# 2. Commit y push
git add .cursor-auto-work.json
git commit -m "auto-work: assign PESKIDS-1.1"
git push origin claude/peskids-cursor-avance-1ortri

# 3. Te aviso: "Listo, revienta Cursor en tu máquina"
```

---

## 🔄 Ciclo completo (Ejemplo real)

**HOY (2026-08-07):**

```
Claude (en la nube):
  → Crea plan en 5 fases
  → Genera .cursor-auto-work.json con PESKIDS-1.1
  → Commit + push
  → Te dice: "Listo para ejecutar"

Tú (local):
  → git pull
  → ⚡ Git hook se ejecuta
  → ⚡ Setup script genera instrucciones
  → Abres Cursor
  → Ves la tarea automáticamente
  → Ejecutas PESKIDS-1.1 (2-3 horas)
  → git push

Claude (revisión):
  → Ve tu PR
  → Revisa cambios
  → Aprueba o pide cambios
  → Si OK: Crea nuevo .cursor-auto-work.json con PESKIDS-1.2
  → El ciclo se repite
```

---

## ✅ Checklist de configuración

**Esto debería estar listo ya, pero verifica:**

- [ ] `.cursor-auto-work.json` existe en raíz
- [ ] `.cursor-auto-work.sh` es ejecutable (`-x`)
- [ ] `.git/hooks/post-checkout` es ejecutable
- [ ] `.cursor/instructions.md` existe
- [ ] Tienes `jq` instalado (para parsear JSON)

**Verifica:**
```bash
# Permisos correctos
ls -la .cursor-auto-work.sh
# Debería tener: -rwxr-xr-x

ls -la .git/hooks/post-checkout
# Debería tener: -rwxr-xr-x

# jq instalado
which jq
# Si no: brew install jq (o apt-get install jq en Linux)
```

---

## 🆘 Troubleshooting

### "El hook no se ejecutó"

```bash
# Verifica que es ejecutable
chmod +x .git/hooks/post-checkout

# Ejecuta manualmente
bash .git/hooks/post-checkout

# Deberías ver output colorido
```

### "No veo la tarea en Cursor"

```bash
# Verifica que el archivo existe
cat .cursor-work/CURRENT-TASK.md

# Si no existe, ejecuta el script manualmente
bash .cursor-auto-work.sh
```

### "jq command not found"

```bash
# Instala jq
brew install jq        # macOS
apt-get install jq     # Ubuntu/Debian
```

### "Cursor no abre automáticamente"

⚠️ **Esto es manual:**
```bash
code .
# O arrastra la carpeta a Cursor
```

**Lo que SÍ es automático es que Cursor VEA la tarea en el archivo.**

---

## 🚀 Ejemplos de tareas futuras

**Yo puedo asignarte trabajo así:**

```bash
# PESKIDS-1.2 (Crear KPI components)
.cursor-auto-work.json → PESKIDS-1.2

# PESKIDS-2.1 (Mejorar Kanban)
.cursor-auto-work.json → PESKIDS-2.1

# Etc...
```

**Cada vez:**
1. Genero nuevo JSON
2. Commit + push
3. Tú haces `git pull`
4. Git hook se ejecuta
5. Cursor ve la nueva tarea
6. Tú la ejecutas

---

## 💡 Tips pro

1. **Actualiza estado**: Cuando empiezes, cambia `status` a `in_progress`
2. **Si hay bloqueo**: Cambia a `blocked` + describe el problema
3. **Commit frecuente**: No esperes a terminar la fase entera
4. **Usa el checklist**: El JSON tiene items que puedes ir marcando

---

## 🔗 Archivos clave

```
.cursor-auto-work.json          ← Configuración de tarea (lo que voy a actualizar)
.cursor-auto-work.sh             ← Setup automático
.git/hooks/post-checkout         ← Git hook automático
.cursor/instructions.md          ← Instrucciones para Cursor
.cursor-work/CURRENT-TASK.md     ← Instrucciones generadas (auto-creado)

apps/peskids/
  ├── docs/
  │   ├── PESKIDS-LEVEL-UP-PLAN.md    ← Plan maestro de 20 tareas
  │   └── CURSOR-QUICK-START.md       ← Quick start
  └── ...
```

---

## ✨ Resumen

**Ahora:**
- Tú solo necesitas hacer `git pull` cuando te asigno tarea
- El git hook se ejecuta automáticamente
- Cursor ve la tarea en `.cursor-work/CURRENT-TASK.md`
- Tú ejecutas la tarea en tu editor
- Haces commit + push
- Yo reviso y asigno la siguiente

**Sin intervención manual. Automático. 🚀**

---

**Fecha:** 2026-08-07  
**Sistema:** Cursor Auto-Work v1.0  
**Rama:** claude/peskids-cursor-avance-1ortri  
**Contacto:** cboteros1@gmail.com
