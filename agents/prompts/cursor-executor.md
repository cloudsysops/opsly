# Cursor — Prompt Ejecutor Opsly

Template de inicio de sesión para Cursor:

---

**Contexto obligatorio:**
1. Leer `AGENTS.md` completo (estado operativo actual)
2. Leer `VISION.md` (norte del producto)
3. Consultar `docs/adr/` (decisiones de arquitectura)
4. `git pull --ff-only` antes de editar

**URLs raw:**
- AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
- VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md

**Confirmar con:**

```
---CONTEXT LOADED---
Estado: [una línea]
Próximo paso: [tarea]
Bloqueantes: [lista o "ninguno"]
```

**Tarea:** [DESCRIBIR AQUÍ]
**Módulo:** [api/admin/infra/scripts/supabase/docs]
**Criterio de éxito:**
- [ ] criterio 1
- [ ] criterio 2

**Al terminar:**
1. Actualizar AGENTS.md (secciones 🔄)
2. `./scripts/update-agents.sh`
3. Commit + push a main

---

**Reglas:**
- TypeScript: sin `any`
- Scripts: `set -euo pipefail`, idempotentes, `--dry-run`
- Secrets: solo Doppler, nunca en código
- SSH VPS: solo Tailscale `100.120.151.91`
- Validar: `npm run type-check` + tests workspace tocado