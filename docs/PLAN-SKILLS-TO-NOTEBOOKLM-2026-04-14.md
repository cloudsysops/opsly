# Plan: Alimentar NotebookLM con Skills para Todos los Agentes
**Fecha:** 2026-04-14
**ADR:** `docs/adr/ADR-025-notebooklm-knowledge-layer.md`
**Objetivo:** Todos los agentes (Claude, Cursor, Copilot, OpenCode, Hermes) consultan NotebookLM al inicio y tienen acceso al conocimiento de skills.

---

## Inventario de Skills

| Skill | Path | Descripción | Prioridad |
|-------|------|-------------|-----------|
| `opsly-context` | `skills/user/opsly-context/` | Contexto obligatorio al inicio de sesión | CRÍTICA |
| `opsly-architect-senior` | `skills/user/opsly-architect-senior/` | Diagnóstico arquitectónico, ADRs, riesgos | CRÍTICA |
| `opsly-quantum` | `skills/user/opsly-quantum/` | Orquestación segura, scripts opsly-quantum.sh | ALTA |
| `opsly-llm` | `skills/user/opsly-llm/` | Llamadas via LLM Gateway | ALTA |
| `opsly-api` | `skills/user/opsly-api/` | Rutas API apps/api | ALTA |
| `opsly-bash` | `skills/user/opsly-bash/` | Scripts en scripts/ | ALTA |
| `opsly-mcp` | `skills/user/opsly-mcp/` | Tools MCP OpenClaw | MEDIA |
| `opsly-supabase` | `skills/user/opsly-supabase/` | Migraciones, SQL platform | MEDIA |
| `opsly-discord` | `skills/user/opsly-discord/` | notify-discord.sh | MEDIA |
| `opsly-tenant` | `skills/user/opsly-tenant/` | Onboarding tenants | MEDIA |
| `opsly-feedback-ml` | `skills/user/opsly-feedback-ml/` | Feedback + ML | MEDIA |
| `opsly-agent-teams` | `skills/user/opsly-agent-teams/` | BullMQ / TeamManager | MEDIA |
| `opsly-notebooklm` | `skills/user/opsly-notebooklm/` | Agente NotebookLM | MEDIA |
| `opsly-google-cloud` | `skills/user/opsly-google-cloud/` | GCP, Drive, BigQuery | MEDIA |

---

## Arquitectura del Pipeline de Skills → NotebookLM

```
skills/user/*/SKILL.md
        │
        ▼
scripts/skills-to-notebooklm.mjs
        │
        ▼
    NotebookLM
        │
        ▼
Agentes consultan: "Qué skill usar para X?"
```

---

## FASE 1: Script de Sync (30 min)

### 1.1 Crear `scripts/skills-to-notebooklm.mjs`

```javascript
#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { executeNotebookLM } from "@intcloudsysops/notebooklm-agent";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SKILLS_DIR = join(root, "skills/user");

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  match[1].split("\n").forEach(line => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length) {
      meta[key.trim()] = valueParts.join(":").trim();
    }
  });
  return meta;
}

function skillToMarkdown(skillDir, skillFile) {
  const content = readFileSync(skillFile, "utf8");
  const skillName = skillDir.replace("opsly-", "").replace(/-/g, "_");
  const meta = extractFrontmatter(content);

  return `# Skill: ${meta.name || skillName}
**Descripción:** ${meta.description || "Sin descripción"}
**Cuándo usar:** ${meta.when || "No especificado"}
**Owner:** ${meta.owner || "platform"}
---
${content}
`;
}

async function main() {
  const nb = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  if (!nb) {
    process.stderr.write("NOTEBOOKLM_NOTEBOOK_ID no configurado.\n");
    process.exit(1);
  }

  const skills = readdirSync(SKILLS_DIR).filter(d => d.startsWith("opsly-"));

  let n = 0;
  for (const skillDir of skills) {
    const skillFile = join(SKILLS_DIR, skillDir, "SKILL.md");
    try {
      const markdown = skillToMarkdown(skillDir, skillFile);
      const r = await executeNotebookLM({
        action: "add_source",
        tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG || "platform",
        notebook_id: nb,
        source_type: "text",
        title: `skill_${skillDir}.md`,
        text: markdown,
      });
      if (r.success) n++;
    } catch (e) {
      process.stderr.write(`ERR ${skillDir}: ${e.message}\n`);
    }
  }

  process.stdout.write(`✅ Synced ${n}/${skills.length} skills a NotebookLM\n`);
}

await main();
```

### 1.2 Actualizar package.json

```bash
# Añadir script:
"skills:to-notebooklm": "node scripts/skills-to-notebooklm.mjs"
```

---

## FASE 2: Queries Predefinidas (30 min)

```markdown
## Queries predefinidas en NotebookLM

### Nuevo agente (inicio de sesión)
"Eres el arquitecto senior de Opsly. Resume en 5 bullets:
1. Qué se decidió hoy
2. Qué está bloqueado
3. Qué es prioritario
4. Qué skill usar para [tarea del usuario]
5. Qué NO hacer"

### Antes de tocar código
"Qué skill aplicar para esta tarea: [tarea]
Qué decisiones ADR son relevantes
Qué archivos tocar (no tocar)"

### Para debugging
"Qué skills aplicar para resolver: [problema]
Qué decisiones ADRs aplican"

### Para onboarding de tenant
"Qué skill usar para onboarding de tenant
Qué scripts ejecutar"
```

---

## FASE 3: Hook de Inicio Universal (30 min)

### Actualizar docs/AGENTS-GLOBAL-CONTEXT.md

```markdown
## 🧠 NotebookLM — Knowledge Layer Universal

**Skills en NotebookLM:** Todos los skills se syncronizan automáticamente.

**Query startup obligatorio:**
"Eres el arquitecto senior de Opsly. Resume en 5 bullets:
1. Qué se decidió hoy
2. Qué está bloqueado
3. Qué es prioritario
4. Qué skill usar para [tarea]
5. Qué NO hacer"

**Comandos:**
| Acción | Comando |
|--------|---------|
| Sync skills → NotebookLM | `npm run skills:to-notebooklm` |
| Sync docs + skills | `npm run notebooklm:sync` |
| Query NotebookLM | `npm run notebooklm:query "<pregunta>"`
```

---

## FASE 4: Skill Routing Inteligente (30 min)

```typescript
// En apps/orchestrator/src/lib/notebooklm-client.ts
export function matchSkillToQuery(query: string): string | undefined {
  const skillKeywords = {
    "opsly-context": ["inicio", "sesión", "contexto", "estado"],
    "opsly-architect-senior": ["arquitectura", "adr", "riesgo", "decisión"],
    "opsly-quantum": ["orquestar", "worker", "bullmq", "cola"],
    "opsly-llm": ["llm", "modelo", "gpt", "claude", "ollama"],
    "opsly-api": ["api", "ruta", "endpoint", "handler"],
    "opsly-bash": ["script", "bash", "sh"],
    "opsly-tenant": ["tenant", "onboard", "cliente", "alta"],
    "opsly-mcp": ["mcp", "tool", "notebooklm"],
  };

  const lower = query.toLowerCase();
  for (const [skill, kws] of Object.entries(skillKeywords)) {
    if (kws.some(k => lower.includes(k))) return skill;
  }
  return undefined;
}
```

---

## FASE 5: Validación (15 min)

```bash
# 1. Sync todos los skills
NOTEBOOKLM_NOTEBOOK_ID=<id> npm run skills:to-notebooklm

# 2. Query de prueba
node scripts/query-notebooklm.mjs "¿Qué skill usar para hacer onboarding de un nuevo tenant?"

# 3. Query contexto
node scripts/query-notebooklm.mjs "¿Cuál es el estado actual de Opsly?"
```

---

## Tiempo total estimado: 2h 15min

| Fase | Tiempo | Entregable |
|------|--------|------------|
| FASE 1 | 30 min | `scripts/skills-to-notebooklm.mjs` |
| FASE 2 | 30 min | Query templates en NotebookLM |
| FASE 3 | 30 min | Prompt universal en skills + AGENTS-GLOBAL-CONTEXT |
| FASE 4 | 30 min | Index inteligente + skill routing |
| FASE 5 | 15 min | Validación |
| **Total** | **2h 15min** | Pipeline completo |

---

## Referencias

- `scripts/docs-to-notebooklm.mjs` (referencia)
- `scripts/skills-to-notebooklm.mjs` (pendiente implementar)
- `docs/AGENTS-GLOBAL-CONTEXT.md`
- `docs/adr/ADR-025-notebooklm-knowledge-layer.md`
- `skills/user/*/SKILL.md`
