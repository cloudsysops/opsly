#!/usr/bin/env node
/**
 * skill-loader.js — Auto-carga skills según contexto
 * Uso: node scripts/skill-loader.js <query>
 *       node scripts/skill-loader.js --context "crear api route"
 */

import { loadSkillsChain, suggestChain, findSkills } from "./skill-finder.js";

const query = process.argv.slice(2).filter(a => !a.startsWith("--")).join(" ");
const context = process.argv.includes("--context") ? query : query;

async function loadContextSkills() {
  console.log("\n⚡ Loading bootstrap skills...");

  const chain = suggestChain(context);

  console.log(`   Chain: ${chain.join(" → ")}\n`);

  const skills = loadSkillsChain(chain);

  for (const skill of skills) {
    console.log(`📖 ${skill.name}`);
    if (skill.content) {
      const lines = skill.content.split("\n").slice(0, 30);
      console.log(lines.map(l => `   ${l}`).join("\n"));
      if (skill.content.split("\n").length > 30) {
        console.log("   ... (truncated)");
      }
    }
    console.log();
  }

  return skills;
}

if (!query && !process.argv.includes("--context")) {
  console.log("Usage:");
  console.log("  skill-loader.js <query>        Load skills for query");
  console.log("  skill-loader.js --context <x>  Load context + query skills");
  console.log("  skill-loader.js --all         Load all skills");
  process.exit(1);
}

if (process.argv.includes("--all")) {
  const { readFileSync } = await import("fs");
  const data = JSON.parse(readFileSync("./skills/index.json", "utf-8"));
  const chain = data.skills.map(s => s.name);
  const skills = loadSkillsChain(chain);
  console.log(`\n📚 Loaded ${skills.length} skills\n`);
  for (const s of skills) {
    console.log(`✅ ${s.name}`);
  }
} else {
  await loadContextSkills();
}
