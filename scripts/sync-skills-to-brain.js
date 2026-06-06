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

  const fmObj = {
    name: skill.name,
    version: skill.version || '1.0.0',
    category: skill.category || 'uncategorized',
    priority: skill.priority || 'medium',
    triggers: triggers.slice(0, 8),
    cross_refs: crossRefs,
  };
  if (sessionCtx) fmObj.session_context = sessionCtx;
  if (subagents.length) fmObj.subagents = subagents;
  if (whenNot) fmObj.when_not = whenNot;
  fmObj.tags = ['opsly/skill', `opsly/${skill.category || 'misc'}`];

  const frontmatter = yaml.dump(fmObj).trim();
  const skillPath = `packages/skills/user/${skill.name}/SKILL.md`;
  const isPeskids = skill.name === 'opsly-peskids';

  let body = `---\n${frontmatter}\n---\n\n# ${skill.name}\n\n> ${skill.description || ''}\n`;

  if (sessionCtx) body += `\n## Cuándo cargar\n${sessionCtx}\n`;
  if (subagents.length) body += `\n## Subagentes recomendados\n${subagentLines}\n`;
  if (whenNot) body += `\n## Cuándo NO\n${whenNot}\n`;
  if (crossRefs.length) body += `\n## Cross-refs\n${crossRefLinks}\n`;

  const tenantLink = isPeskids ? '\n- [[brain/tenants/peskids|Tenant: peskids]]' : '';
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
        .map(s => `- [[${s.name}]] — ${(s.description || '').slice(0, 70)}`)
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

Generado por \`scripts/sync-skills-to-brain.js\`. No editar a mano — regenerar con:
\`\`\`bash
node scripts/sync-skills-to-brain.js
\`\`\`

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
let enrichedCount = 0;

for (const skill of skills) {
  const manifestPath = join(SKILLS_DIR, skill.name, 'manifest.json');
  const skillMdPath = join(SKILLS_DIR, skill.name, 'SKILL.md');

  const manifest = readJsonSafe(manifestPath);
  const skillFm = existsSync(skillMdPath)
    ? parseFrontmatter(readFileSync(skillMdPath, 'utf-8'))
    : {};

  if (skillFm.session_context || skillFm.subagents || skillFm.when_not) enrichedCount++;

  const note = buildNote(skill, manifest, skillFm);
  writeFileSync(join(BRAIN_SKILLS_DIR, `${skill.name}.md`), note);
}

writeFileSync(join(BRAIN_SKILLS_DIR, 'README.md'), buildMOC(skills));

console.log(`✅ ${skills.length} notas generadas en docs/brain/skills/`);
console.log(`   📌 ${enrichedCount} skill(s) enriquecidos con session_context/subagents/when_not`);
console.log(`   📚 MOC actualizado: docs/brain/skills/README.md`);
