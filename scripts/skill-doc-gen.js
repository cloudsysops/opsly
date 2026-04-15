#!/usr/bin/env node
/**
 * skill-doc-gen.js — Generador de documentación de skills
 * Genera README, API docs, y matrices de skills
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = join(__dirname, "..", "skills");
const USER_SKILLS = join(SKILLS_ROOT, "user");
const INDEX_PATH = join(SKILLS_ROOT, "index.json");

function loadIndex() {
  return JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
}

function loadSkill(name) {
  const mdPath = join(USER_SKILLS, name, "SKILL.md");
  const manifestPath = join(USER_SKILLS, name, "manifest.json");

  return {
    name,
    content: existsSync(mdPath) ? readFileSync(mdPath, "utf-8") : null,
    manifest: existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf-8")) : null
  };
}

function generateTable(skills) {
  const rows = [
    "| Priority | Skill | Description | Triggers |",
    "|----------|-------|-------------|----------|"
  ];

  for (const s of skills) {
    const triggers = (s.manifest?.triggers || []).slice(0, 3).join(", ");
    rows.push(`| ${s.manifest?.priority || "?"} | \`${s.name}\` | ${s.manifest?.description || ""} | ${triggers} |`);
  }

  return rows.join("\n");
}

function generateCrossRefMatrix(skills) {
  const names = skills.map(s => s.name);
  const matrix = [["", ...names.map(n => n.replace("opsly-", ""))]];

  for (const skill of skills) {
    const refs = skill.manifest?.crossReferences || [];
    const row = [skill.name.replace("opsly-", "")];
    for (const other of skills) {
      row.push(refs.includes(other.name) ? "✅" : "");
    }
    matrix.push(row);
  }

  return matrix.map(r => `| ${r.join(" | ")} |`).join("\n");
}

function generateTriggerMap(skills) {
  const triggerMap = {};

  for (const skill of skills) {
    for (const trigger of skill.manifest?.triggers || []) {
      if (!triggerMap[trigger]) {
        triggerMap[trigger] = [];
      }
      triggerMap[trigger].push(skill.name);
    }
  }

  const lines = ["## Trigger → Skills Map", "", "| Trigger | Skills |", "|---------|-------|"];

  const sorted = Object.entries(triggerMap).sort((a, b) => b[1].length - a[1].length);
  for (const [trigger, skillNames] of sorted) {
    lines.push(`| \`${trigger}\` | ${skillNames.join(", ")} |`);
  }

  return lines.join("\n");
}

function generateSkillDetail(skill) {
  const lines = [
    `# ${skill.name}`,
    "",
    skill.manifest?.description || "",
    "",
    "## Metadata",
    "",
    `- Priority: ${skill.manifest?.priority || "?"}`,
    `- Version: ${skill.manifest?.version || "?"}`,
    `- Category: ${skill.manifest?.category || "?"}`,
    ""
  ];

  if (skill.manifest?.triggers?.length > 0) {
    lines.push("## Triggers");
    lines.push("");
    lines.push(skill.manifest.triggers.map(t => `- \`${t}\``).join("\n"));
    lines.push("");
  }

  if (skill.manifest?.crossReferences?.length > 0) {
    lines.push("## Related Skills");
    lines.push("");
    lines.push(skill.manifest.crossReferences.map(s => `- \`${s}\``).join("\n"));
    lines.push("");
  }

  if (skill.manifest?.examples?.length > 0) {
    lines.push("## Examples");
    lines.push("");
    for (const ex of skill.manifest.examples) {
      lines.push("```json");
      lines.push(JSON.stringify(ex, null, 2));
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function generateCompleteDoc() {
  const index = loadIndex();
  const skills = index.skills.map(s => loadSkill(s.name));

  const readme = `# Skills Opsly

> Sistema de skills para agentes IA autónomos en Opsly
> Versión: ${index.version} | Generado: ${new Date().toISOString()}

## Tabla de Skills

${generateTable(skills)}

${generateTriggerMap(skills)}

## Matriz de Dependencias

${generateCrossRefMatrix(skills)}

## Detalles por Skill

`;

  for (const skill of skills) {
    readme += `\n---\n\n${generateSkillDetail(skill)}\n`;
  }

  return readme;
}

function generateApiDoc() {
  const index = loadIndex();
  const skills = index.skills.map(s => loadSkill(s.name));

  const apiDoc = `# Skills API

> Documentación de la API de skills para integración

## Funciones Exportadas

### findSkills(query: string): SkillMatch[]

Busca skills por query con fuzzy matching.

\`\`\`typescript
import { findSkills } from './skill-finder.js';

const matches = findSkills('crear api route');
// [{ name: 'opsly-api', score: 45, triggers: [...] }]
\`\`\`

### suggestChain(query: string): string[]

Sugiere una cadena de skills para una query.

\`\`\`typescript
import { suggestChain } from './skill-finder.js';

const chain = suggestChain('crear api route');
// ['opsly-context', 'opsly-api', 'opsly-supabase']
\`\`\`

### loadSkillContent(name: string): SkillContent

Carga el contenido de un skill.

\`\`\`typescript
import { loadSkillContent } from './skill-finder.js';

const skill = loadSkillContent('opsly-api');
// { name: 'opsly-api', content: '...', manifest: {...} }
\`\`\`

### loadSkillsChain(chain: string[]): SkillContent[]

Carga múltiples skills en una cadena.

\`\`\`typescript
import { loadSkillsChain } from './skill-finder.js';

const skills = loadSkillsChain(['opsly-context', 'opsly-api']);
\`\`\`

## Tipos

\`\`\`typescript
interface SkillMatch {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  triggers: string[];
  crossReferences: string[];
  path: string;
}

interface SkillContent {
  name: string;
  content: string;
  manifest: SkillManifest | null;
}

interface SkillManifest {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  inputSchema?: object;
  outputSchema?: object;
  crossReferences?: string[];
  examples?: Array<{ input: object; output: object }>;
}
\`\`\`

## CLI

\`\`\`bash
# Buscar skills
node scripts/skill-finder.js "mi query"

# Modo autónomo
node scripts/skill-finder.js "mi query" --autonomous

# JSON output
node scripts/skill-finder.js "mi query" --json

# Auto-cargar
node scripts/skill-loader.js --context "mi query"

# Validar todos
bash scripts/skill-autoload.sh validate
\`\`\`
`;

  return apiDoc;
}

const cmd = process.argv[2] || "all";
const outputPath = process.argv[3];

if (cmd === "readme" || cmd === "all") {
  const content = generateCompleteDoc();
  if (outputPath) {
    writeFileSync(outputPath, content);
    console.log(`✅ README generado: ${outputPath}`);
  } else {
    console.log(content);
  }
}

if (cmd === "api" || cmd === "all") {
  const content = generateApiDoc();
  const path = outputPath || join(SKILLS_ROOT, "API.md");
  writeFileSync(path, content);
  console.log(`✅ API docs generadas: ${path}`);
}

if (cmd === "triggers") {
  const index = loadIndex();
  const skills = index.skills.map(s => loadSkill(s.name));
  console.log(generateTriggerMap(skills));
}

if (cmd === "matrix") {
  const index = loadIndex();
  const skills = index.skills.map(s => loadSkill(s.name));
  console.log(generateCrossRefMatrix(skills));
}
