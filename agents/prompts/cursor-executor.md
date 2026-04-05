# Cursor — Prompt Ejecutor Opsly

Template de inicio de sesión para Cursor:

---

Lee `AGENTS.md`, `VISION.md` y `docs/adr/`.

Confirma con:

---CONTEXT LOADED---
Estado: [una línea]
Próximo paso: [tarea]
Bloqueantes: [lista o "ninguno"]
---

Tarea: [DESCRIBIR AQUÍ]
Módulo: [api/admin/infra/scripts/supabase/docs]
Criterio de éxito:

- [ ] criterio 1
- [ ] criterio 2

Al terminar genera el bloque HANDOFF y corre:

`./scripts/update-agents.sh`

---
