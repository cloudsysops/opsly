#!/usr/bin/env node
/**
 * Sube todos los skills a NotebookLM como fuentes.
 * Cada skill se convierte a markdown con metadata extraída del frontmatter.
 * Uso: NOTEBOOKLM_NOTEBOOK_ID=<id> npm run skills:to-notebooklm
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SKILLS_DIR = join(root, "skills/user");

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  match[1].split("\n").forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) {
      meta[key] = value;
    }
  });
  return meta;
}

function skillToMarkdown(skillDir, skillFile) {
  const content = readFileSync(skillFile, "utf8");
  const skillName = skillDir.replace("opsly-", "").replace(/-/g, "_");
  const meta = extractFrontmatter(content);

  const header = `# Skill: ${meta.name || skillName}

> **Carpeta:** \`skills/user/${skillDir}/\`
> **Owner:** ${meta.owner || "platform"}
> **Cuándo usar:** ${meta.when || "No especificado"}

---

${content}
`;
  return header;
}

async function uploadSkill(skillDir, markdown, notebookId) {
  const { executeNotebookLM } = await import("@intcloudsysops/notebooklm-agent");

  return executeNotebookLM({
    action: "add_source",
    tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || "platform",
    notebook_id: notebookId,
    source_type: "text",
    title: `skill_${skillDir}.md`,
    text: markdown,
  });
}

async function main() {
  const notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  if (!notebookId || notebookId.length === 0) {
    process.stderr.write(
      "NOTEBOOKLM_NOTEBOOK_ID no configurado. Skip.\n",
    );
    process.exit(0);
  }

  let skills = [];
  try {
    skills = readdirSync(SKILLS_DIR).filter((d) =>
      d.startsWith("opsly-") && !d.startsWith("opsly-simplify"),
    );
  } catch {
    process.stderr.write(`Skills dir not found: ${SKILLS_DIR}\n`);
    process.exit(1);
  }

  process.stdout.write(`Found ${skills.length} skills to sync\n`);

  let success = 0;
  let failed = 0;

  for (const skillDir of skills) {
    const skillFile = join(SKILLS_DIR, skillDir, "SKILL.md");
    try {
      const markdown = skillToMarkdown(skillDir, skillFile);
      const result = await uploadSkill(skillDir, markdown, notebookId);

      if (result.success) {
        success++;
        process.stdout.write(`  ✅ ${skillDir}\n`);
      } else {
        failed++;
        process.stderr.write(
          `  ❌ ${skillDir}: ${result.error ?? "unknown error"}\n`,
        );
      }
    } catch (e) {
      failed++;
      process.stderr.write(
        `  ❌ ${skillDir}: ${e instanceof Error ? e.message : String(e)}\n`,
      );
    }
  }

  process.stdout.write(
    `\n✅ Synced ${success}/${skills.length} skills to NotebookLM\n`,
  );
  if (failed > 0) {
    process.stderr.write(`⚠️  ${failed} skills failed\n`);
  }
}

await main();
