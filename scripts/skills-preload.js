#!/usr/bin/env node
/**
 * Pre-carga skills en memoria para agent session
 * Genera .agent-skills-manifest.json con skills ready-to-load
 * Uso: node scripts/skills-preload.js --agent-name=<name> [--save]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapSkillsForAgent } from './skills-mapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skillsPath = join(root, 'packages', 'skills', 'user');

function preloadSkills(agentName, saveToFile = false) {
  console.log(`⚡ Pre-loading Skills: ${agentName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Mapear skills
  const skillsMap = mapSkillsForAgent(agentName);

  // Cargar contenido de skills (precarga)
  const preloadedSkills = {};
  let loaded = 0;
  let failed = 0;

  console.log('');
  console.log('📦 Loading skill content...');

  for (const skill of skillsMap.skills) {
    try {
      // Leer SKILL.md
      const skillPath = join(skillsPath, skill.name, 'SKILL.md');
      const content = readFileSync(skillPath, 'utf8');

      // Extraer primera línea como summary
      const summary = content.split('\n')[0].replace(/^#\s+/, '');

      preloadedSkills[skill.name] = {
        loaded: true,
        priority: skill.priority,
        size_bytes: Buffer.byteLength(content),
        triggers: skill.triggers,
      };

      console.log(`   ✅ ${skill.name}`);
      loaded += 1;
    } catch (e) {
      preloadedSkills[skill.name] = {
        loaded: false,
        error: e.message,
        priority: skill.priority,
      };
      console.log(`   ❌ ${skill.name} (${e.message})`);
      failed += 1;
    }
  }

  console.log('');
  console.log(`✅ Loaded ${loaded}/${skillsMap.skills.length} skills`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} skills failed to load`);
  }

  const manifest = {
    agent_name: agentName,
    preload_timestamp: new Date().toISOString(),
    total_skills: skillsMap.total_skills,
    loaded_skills: loaded,
    failed_skills: failed,
    skills: preloadedSkills,
    injection_order: skillsMap.injection_order,
  };

  if (saveToFile) {
    const stateDir = join(root, '.agent-bootstrap-state');
    // Create state dir if missing
    try {
      require('fs').mkdirSync(stateDir, { recursive: true });
    } catch {}
    const outputPath = join(stateDir, `.skills-${agentName}.manifest.json`);
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(`💾 Manifest saved: ${outputPath}`);
  }

  console.log('');
  return manifest;
}

function main() {
  const args = process.argv.slice(2);
  let agentName = '';
  let saveFile = false;

  for (const arg of args) {
    if (arg.startsWith('--agent-name=')) {
      agentName = arg.replace('--agent-name=', '');
    }
    if (arg === '--save') {
      saveFile = true;
    }
  }

  if (!agentName) {
    console.error('❌ No agent name provided');
    console.error('Usage: node scripts/skills-preload.js --agent-name=<name> [--save]');
    process.exit(1);
  }

  preloadSkills(agentName, saveFile);
}

export { preloadSkills };
main();
