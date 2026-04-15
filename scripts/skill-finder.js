#!/usr/bin/env node
/**
 * skill-finder.js — Buscador inteligente de skills con fuzzy matching
 * Uso: node scripts/skill-finder.js "mi query" [--autonomous]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_INDEX = join(__dirname, "../skills/index.json");

// Fuzzy matching simple
function fuzzyMatch(str, pattern) {
  const s = str.toLowerCase();
  const p = pattern.toLowerCase();
  let pi = 0;
  for (let i = 0; i < s.length && pi < p.length; i++) {
    if (s[i] === p[pi]) pi++;
  }
  return pi === p.length;
}

// TF-IDF simple scoring
function scoreSkill(skill, query) {
  const q = query.toLowerCase();
  const words = q.split(/\s+/);
  let score = 0;

  for (const trigger of skill.triggers || []) {
    const t = trigger.toLowerCase();
    if (t === q) score += 50;
    else if (t.includes(q)) score += 25;
    else if (q.includes(t)) score += 15;
    else if (fuzzyMatch(t, q)) score += 10;
    for (const w of words) {
      if (t.includes(w)) score += 5;
    }
  }

  if (skill.name?.toLowerCase().includes(q)) score += 10;
  if (skill.description?.toLowerCase().includes(q)) score += 8;
  if (skill.category?.toLowerCase().includes(q)) score += 5;

  const priority = { critical: 20, high: 10, medium: 5, low: 2 };
  score += priority[skill.priority] || 0;

  return score;
}

export function findSkills(query) {
  const data = JSON.parse(readFileSync(SKILLS_INDEX, "utf-8"));
  const matches = [];

  for (const skill of data.skills) {
    const score = scoreSkill(skill, query);
    if (score > 0) {
      const matchedTriggers = (skill.triggers || []).filter(
        t => t.toLowerCase().includes(query.toLowerCase()) ||
             query.toLowerCase().includes(t.toLowerCase()) ||
             fuzzyMatch(t, query)
      );
      matches.push({ ...skill, score, matchedTriggers });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function suggestChain(query) {
  const matches = findSkills(query);
  if (matches.length === 0) return [];

  const chain = matches.map(s => s.name);

  // Auto-add context if not present
  if (!chain.includes("opsly-context") && matches[0].priority === "critical") {
    chain.unshift("opsly-context");
  }

  return chain;
}

export function getSkillPath(name) {
  const data = JSON.parse(readFileSync(SKILLS_INDEX, "utf-8"));
  const skill = data.skills.find(s => s.name === name);
  return skill?.path || `skills/user/${name}/`;
}

export function loadSkill(name) {
  const path = getSkillPath(name);
  const skillPath = join(__dirname, "..", path);
  const mdPath = join(skillPath, "SKILL.md");
  const manifestPath = join(skillPath, "manifest.json");

  const result = { name, path: skillPath };

  if (existsSync(mdPath)) {
    result.content = readFileSync(mdPath, "utf-8");
  }

  if (existsSync(manifestPath)) {
    result.manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  }

  return result;
}

export function loadSkillsChain(chain) {
  return chain.map(name => loadSkill(name));
}

// CLI
function formatOutput(matches, query, autonomous = false) {
  if (matches.length === 0) {
    return { status: "no_match", query, skills: [] };
  }

  if (autonomous) {
    const chain = suggestChain(query);
    return {
      status: "match",
      query,
      chain,
      primary: matches[0].name,
      confidence: matches[0].score > 30 ? "high" : matches[0].score > 15 ? "medium" : "low",
      skills: matches.slice(0, 5).map(s => ({
        name: s.name,
        score: s.score,
        triggers: s.matchedTriggers
      }))
    };
  }

  return {
    status: "match",
    query,
    skills: matches.map(s => ({
      name: s.name,
      priority: s.priority,
      score: s.score,
      path: s.path,
      triggers: s.matchedTriggers,
      crossReferences: s.crossReferences || []
    }))
  };
}

const query = process.argv.slice(2).filter(a => !a.startsWith("--")).join(" ");
const autonomous = process.argv.includes("--autonomous");
const json = process.argv.includes("--json");

if (!query) {
  console.log("Usage: skill-finder.js <query> [--autonomous] [--json]");
  console.log("Examples:");
  console.log("  skill-finder.js 'crear ruta api'");
  console.log("  skill-finder.js 'mcp tool' --autonomous");
  console.log("  skill-finder.js 'debug' --json");
  process.exit(1);
}

const matches = findSkills(query);
const output = formatOutput(matches, query, autonomous);

if (json) {
  console.log(JSON.stringify(output, null, 2));
} else {
  if (autonomous) {
    console.log(`\n🎯 Autonomy Mode — Query: "${query}"`);
    console.log(`   Chain: ${output.chain.join(" → ")}`);
    console.log(`   Confidence: ${output.confidence}`);
  } else {
    console.log(`\n🔍 Skills for: "${query}"`);
    console.log("─".repeat(60));
    const emoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "⚪" };
    for (const s of output.skills) {
      console.log(`\n${emoji[s.priority]} ${s.name} (score: ${s.score})`);
      console.log(`   📁 ${s.path}`);
      if (s.triggers.length > 0) {
        console.log(`   🏷️  ${s.triggers.join(", ")}`);
      }
    }
  }
}
