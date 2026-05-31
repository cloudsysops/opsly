# Skills → Obsidian Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar 63 notas Obsidian enlazadas desde los skills de Opsly, con MOC de arranque rápido y piloto peskids completamente enriquecido.

**Architecture:** Un script Node.js ESM (`sync-skills-to-brain.js`) lee `skills/index.json` + `manifest.json` + frontmatter de `SKILL.md` y genera `docs/brain/skills/*.md`. El frontmatter opcional (`session_context`, `subagents`, `when_not`) en `SKILL.md` enriquece las notas. `opsly-peskids` es el piloto enriquecido.

**Tech Stack:** Node.js ESM, js-yaml (ya en root devDeps), fs/path built-ins.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `scripts/sync-skills-to-brain.js` | CREATE | Lee skills, genera notas Obsidian |
| `packages/skills/user/opsly-peskids/SKILL.md` | MODIFY | Agregar frontmatter enriquecido |
| `docs/brain/skills/README.md` | GENERATED | MOC con tabla arranque rápido |
| `docs/brain/skills/opsly-peskids.md` | GENERATED | Piloto enriquecido |
| `docs/brain/skills/*.md` | GENERATED | 62 notas restantes |
| `scripts/git-session-brief.sh` | MODIFY | Agregar referencia a brain/skills |

---

### Task 1: Enriquecer SKILL.md de opsly-peskids

**Files:**
- Modify: `packages/skills/user/opsly-peskids/SKILL.md`

- [ ] **Step 1: Agregar frontmatter enriquecido**

Reemplazar el frontmatter actual:
```yaml
---
name: opsly-peskids
description: Peskids tenant-specific product and operations work. Use when changing landing, admin, teacher, support, families, auth, routes, docs, or deployment for the Peskids tenant.
session_context: "trabajo en peskids — landing, auth, familias, teacher, admin, deploy"
subagents:
  - opsly-frontend
  - opsly-api
  - opsly-qa
  - opsly-supabase
when_not: "Si el cambio aplica a todos los tenants, usa opsly-tenant en vez de este skill. No usar para cambios globales de arquitectura."
---
```

- [ ] **Step 2: Commit**
```bash
git add packages/skills/user/opsly-peskids/SKILL.md
git commit -m "feat(peskids): enriquecer SKILL.md con session_context, subagents y when_not"
```

---

### Task 2: Crear script sync-skills-to-brain.js

**Files:**
- Create: `scripts/sync-skills-to-brain.js`

- [ ] **Step 1: Crear el script**

```js
#!/usr/bin/env node
// sync-skills-to-brain.js — Genera notas Obsidian desde skills manifests
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILLS_INDEX = join(ROOT, 'skills/index.json');
const SKILLS_DIR = join(ROOT, 'packages/skills/user');
const BRAIN_SKILLS_DIR = join(ROOT, 'docs/brain/skills');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  try { return yaml.load(match[1]) || {}; } catch { return {}; }
}

function readJsonSafe(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function buildNote(skill, manifest, enriched) {
  const triggers = manifest?.triggers || [];
  const crossRefs = manifest?.crossReferences || [];
  const sessionCtx = enriched?.session_context || '';
  const subagents = enriched?.subagents || [];
  const whenNot = enriched?.when_not || '';

  const crossRefLinks = crossRefs.map(r => `[[${r}]]`).join(' · ');
  const subagentLines = subagents.map(s => `- [[${s}]]`).join('\n');

  const frontmatter = yaml.dump({
    name: skill.name,
    version: skill.version || '1.0.0',
    category: skill.category || 'uncategorized',
    priority: skill.priority || 'medium',
    triggers: triggers.slice(0, 8),
    cross_refs: crossRefs,
    ...(sessionCtx ? { session_context: sessionCtx } : {}),
    ...(subagents.length ? { subagents } : {}),
    ...(whenNot ? { when_not: whenNot } : {}),
    tags: ['opsly/skill', `opsly/${skill.category || 'misc'}`],
  }).trim();

  const skillPath = `packages/skills/user/${skill.name}/SKILL.md`;
  const tenantLink = skill.category === 'operations' && skill.name.includes('peskids')
    ? '\n- [[brain/tenants/peskids|Tenant: peskids]]' : '';

  let body = `---\n${frontmatter}\n---\n\n# ${skill.name}\n\n> ${skill.description || ''}\n`;

  if (sessionCtx) body += `\n## Cuándo cargar\n${sessionCtx}\n`;
  if (subagents.length) body += `\n## Subagentes recomendados\n${subagentLines}\n`;
  if (whenNot) body += `\n## Cuándo NO\n${whenNot}\n`;
  if (crossRefs.length) body += `\n## Cross-refs\n${crossRefLinks}\n`;

  body += `\n## Links\n- [SKILL.md](../../../${skillPath})${tenantLink}\n`;

  return body;
}

function buildMOC(skills) {
  const byCategory = {};
  for (const s of skills) {
    const cat = s.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }

  const quickStart = `## Arranque rápido por contexto

| Contexto de sesión | Skills a cargar |
|--------------------|-----------------|
| trabajo en peskids | [[opsly-peskids]], [[opsly-frontend]], [[opsly-api]], [[opsly-qa]] |
| nueva ruta API | [[opsly-api]], [[opsly-supabase]] |
| deploy / infra | [[opsly-infra]], [[opsly-qa]] |
| billing / Stripe | [[opsly-billing]], [[opsly-stripe-marketplace]] |
| diagnóstico monorepo | [[opsly-quantum]], [[opsly-context]] |
| crear/editar skill | [[opsly-skill-creator]] |
| LLM Gateway | [[opsly-llm]] |
| orchestrator / BullMQ | [[opsly-orchestrator]] |
| arquitectura / ADR | [[opsly-architect-senior]] |
| seguridad | [[opsly-shield]] |
`;

  const catSections = Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, items]) => {
      const lines = items
        .sort((a, b) => (a.name > b.name ? 1 : -1))
        .map(s => `- [[${s.name}]] — ${s.description?.slice(0, 60) || ''}`)
        .join('\n');
      return `### ${cat}\n${lines}`;
    })
    .join('\n\n');

  return `---
status: generated
owner: operations
tags:
  - opsly/brain
  - opsly/skills
  - moc
---

# Skills Brain MOC

Generado por \`scripts/sync-skills-to-brain.js\`. No editar a mano.

${quickStart}
---

## Skills por categoría

${catSections}
`;
}

// Main
mkdirSync(BRAIN_SKILLS_DIR, { recursive: true });

const index = JSON.parse(readFileSync(SKILLS_INDEX, 'utf-8'));
const skills = index.skills || [];
let enriched = 0;

for (const skill of skills) {
  const manifestPath = join(SKILLS_DIR, skill.name, 'manifest.json');
  const skillMdPath = join(SKILLS_DIR, skill.name, 'SKILL.md');

  const manifest = readJsonSafe(manifestPath);
  const skillFm = existsSync(skillMdPath)
    ? parseFrontmatter(readFileSync(skillMdPath, 'utf-8'))
    : {};

  if (skillFm.session_context || skillFm.subagents || skillFm.when_not) enriched++;

  const note = buildNote(skill, manifest, skillFm);
  writeFileSync(join(BRAIN_SKILLS_DIR, `${skill.name}.md`), note);
}

writeFileSync(join(BRAIN_SKILLS_DIR, 'README.md'), buildMOC(skills));

console.log(`✅ ${skills.length} notas generadas en docs/brain/skills/`);
console.log(`   📌 ${enriched} skill(s) enriquecidos con session_context/subagents/when_not`);
console.log(`   📚 MOC actualizado: docs/brain/skills/README.md`);
```

- [ ] **Step 2: Verificar que js-yaml está disponible**
```bash
node -e "import('js-yaml').then(m => console.log('js-yaml OK:', m.default.dump({ok:true})))"
```
Expected: `js-yaml OK: ok: true\n`

- [ ] **Step 3: Correr el script**
```bash
node scripts/sync-skills-to-brain.js
```
Expected:
```
✅ 63 notas generadas en docs/brain/skills/
   📌 1 skill(s) enriquecidos con session_context/subagents/when_not
   📚 MOC actualizado: docs/brain/skills/README.md
```

- [ ] **Step 4: Verificar notas generadas**
```bash
ls docs/brain/skills/ | wc -l
# Expected: 64 (63 skills + README.md)

head -20 docs/brain/skills/opsly-peskids.md
# Expected: frontmatter con session_context, subagents, when_not

grep -c "Arranque rápido" docs/brain/skills/README.md
# Expected: 1
```

- [ ] **Step 5: Commit**
```bash
git add scripts/sync-skills-to-brain.js docs/brain/skills/
git commit -m "feat(brain): sync script + 63 notas Obsidian generadas desde skills manifests"
```

---

### Task 3: Actualizar git-session-brief.sh

**Files:**
- Modify: `scripts/git-session-brief.sh` (última línea antes del cierre)

- [ ] **Step 1: Agregar referencia a brain/skills al final del script**

Antes de la última línea (`fi` del bloque de recomendación), agregar:
```bash
echo ""
echo "📚 Skills:"
echo "   → node scripts/skill-finder.js \"<tema>\" para cadena de skills"
echo "   → docs/brain/skills/README.md para mapa completo en Obsidian"
```

- [ ] **Step 2: Verificar output**
```bash
bash scripts/git-session-brief.sh 2>/dev/null | tail -5
```
Expected: últimas líneas incluyen `📚 Skills:` y la referencia a `docs/brain/skills/README.md`

- [ ] **Step 3: Commit**
```bash
git add scripts/git-session-brief.sh
git commit -m "feat(session): agregar referencia a brain/skills en session brief"
```

---

## Criterios de éxito

- [ ] `docs/brain/skills/` contiene 64 archivos (63 notas + README.md)
- [ ] `opsly-peskids.md` tiene `session_context`, `subagents`, `when_not` y backlink a `[[brain/tenants/peskids]]`
- [ ] `docs/brain/skills/README.md` tiene tabla de arranque rápido con ≥8 filas
- [ ] `node scripts/sync-skills-to-brain.js` corre sin errores
- [ ] `bash scripts/git-session-brief.sh` imprime referencia a `docs/brain/skills/README.md`
