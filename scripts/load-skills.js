#!/usr/bin/env node
/**
 * Opsly Skills CLI
 * Carga, lista y busca skills disponibles para agentes IA
 * 
 * Uso:
 *   node scripts/load-skills.js list                    # Lista todos los skills
 *   node scripts/load-skills.js show <skill-name>       # Muestra detalles de un skill
 *   node scripts/load-skills.js search <query>         # Busca skills por关键词
 *   node scripts/load-skills.js context                 # Carga contexto de sesión (alias de opsly-context)
 *   node scripts/load-skills.js bootstrap               # Carga todos los skills esenciales para nueva sesión
 * 
 * Como módulo:
 *   const { loadAllSkills, getSkill, searchSkills } = require('./scripts/load-skills.js');
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SKILLS_INDEX = join(REPO_ROOT, "skills", "index.json");
const SKILLS_DIR = join(REPO_ROOT, "skills", "user");

function loadIndex() {
  if (!existsSync(SKILLS_INDEX)) {
    throw new Error(`Índice no encontrado: ${SKILLS_INDEX}`);
  }
  return JSON.parse(readFileSync(SKILLS_INDEX, "utf8"));
}

function loadSkillMarkdown(skillName) {
  const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
  if (!existsSync(skillPath)) {
    return null;
  }
  return readFileSync(skillPath, "utf8");
}

function loadAllSkills() {
  const index = loadIndex();
  const skills = [];
  
  for (const skill of index.skills) {
    const markdown = loadSkillMarkdown(skill.name);
    skills.push({
      ...skill,
      content: markdown
    });
  }
  
  return {
    index,
    skills
  };
}

function getSkill(skillName) {
  const { skills } = loadAllSkills();
  const skill = skills.find(s => s.name === skillName);
  
  if (!skill) {
    const available = skills.map(s => s.name).join(", ");
    throw new Error(`Skill "${skillName}" no encontrado. Disponibles: ${available}`);
  }
  
  return skill;
}

function searchSkills(query) {
  const { skills } = loadAllSkills();
  const q = query.toLowerCase();
  
  return skills.filter(skill => {
    return (
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q) ||
      skill.category.toLowerCase().includes(q) ||
      skill.triggers.some(t => t.toLowerCase().includes(q))
    );
  });
}

function listSkills(category = null) {
  const index = loadIndex();
  
  if (category) {
    const cats = index.categories[category];
    if (!cats) {
      throw new Error(`Categoría "${category}" no encontrada. Disponibles: ${Object.keys(index.categories).join(", ")}`);
    }
    return cats.map(name => index.skills.find(s => s.name === name));
  }
  
  return index.skills;
}

function bootstrapSession() {
  const { skills } = loadAllSkills();
  
  const critical = skills.filter(s => s.priority === "critical");
  const high = skills.filter(s => s.priority === "high");
  
  return {
    session: {
      must_load: critical.map(s => ({
        name: s.name,
        reason: "Priority critical para cualquier sesión"
      })),
      recommended: high.filter(s => !critical.includes(s)).map(s => ({
        name: s.name,
        reason: "Priority high para trabajo efectivo"
      }))
    },
    auto_load: [
      "opsly-context",
      "opsly-quantum"
    ],
    search_hint: "Usa 'search' con palabras clave para encontrar skills adicionales"
  };
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

try {
  switch (command) {
    case "list":
      const list = listSkills(arg);
      console.log("\n📋 Skills disponibles en Opsly:\n");
      for (const skill of list) {
        console.log(`  ${skill.priority === "critical" ? "⭐" : "  "}${skill.name}`);
        console.log(`     └─ ${skill.description}`);
        console.log(`     └─ Categoría: ${skill.category} | Priority: ${skill.priority}`);
        console.log();
      }
      break;
      
    case "show":
      if (!arg) {
        console.error("Uso: show <skill-name>");
        process.exit(1);
      }
      const skill = getSkill(arg);
      console.log(`\n🎯 Skill: ${skill.name}`);
      console.log(`   Versión: ${skill.version}`);
      console.log(`   Descripción: ${skill.description}`);
      console.log(`   Categoría: ${skill.category}`);
      console.log(`   Priority: ${skill.priority}`);
      console.log(`   Cuándo usar: ${skill.usage}`);
      console.log(`   Triggers: ${skill.triggers.join(", ")}`);
      if (skill.requires) {
        console.log(`   Requiere: ${skill.requires}`);
      }
      console.log(`\n📄 SKILL.md:`);
      console.log(skill.content || "(no encontrado)");
      break;
      
    case "search":
      if (!arg) {
        console.error("Uso: search <query>");
        process.exit(1);
      }
      const results = searchSkills(arg);
      console.log(`\n🔍 Resultados para "${arg}":\n`);
      if (results.length === 0) {
        console.log("  No se encontraron skills.");
      } else {
        for (const r of results) {
          console.log(`  ${r.name} - ${r.description}`);
        }
      }
      break;
      
    case "context":
      const ctxSkill = getSkill("opsly-context");
      console.log("\n🧠 Contexto de sesión (opsly-context):");
      console.log(ctxSkill.content);
      break;
      
    case "bootstrap":
      const bs = bootstrapSession();
      console.log("\n🚀 Bootstrap de sesión:");
      console.log("\n  📌 DEBE CARGAR:");
      for (const s of bs.session.must_load) {
        console.log(`    - ${s.name}: ${s.reason}`);
      }
      console.log("\n  📖 RECOMENDADO:");
      for (const s of bs.session.recommended) {
        console.log(`    - ${s.name}: ${s.reason}`);
      }
      console.log(`\n  Auto-load: ${bs.auto_load.join(", ")}`);
      console.log(`  ${bs.search_hint}`);
      break;
      
    default:
      console.log(`
⚡ Opsly Skills CLI

Uso: node scripts/load-skills.js <command> [args]

Commands:
  list [category]     Lista todos los skills o los de una categoría
  show <name>         Muestra detalles de un skill específico
  search <query>      Busca skills por关键词
  context             Carga el skill opsly-context (bootstrap de sesión)
  bootstrap           Muestra qué skills cargar al iniciar una sesión

Categorías disponibles:
  bootstrap, master, architecture, development, ai, integration, 
  database, operations, orchestration, notifications, optimization

Ejemplos:
  node scripts/load-skills.js list
  node scripts/load-skills.js list ai
  node scripts/load-skills.js show opsly-api
  node scripts/load-skills.js search "docker"
  node scripts/load-skills.js bootstrap
`);
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}