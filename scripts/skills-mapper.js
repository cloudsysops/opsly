#!/usr/bin/env node
/**
 * Mapea skills por tipo de agente y prioridad
 * Genera manifest de skills disponibles
 * Uso: node scripts/skills-mapper.js --agent-name=<name> --agent-type=<type> [--output=json]
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAgentType } from './agent-detect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skillsPath = join(root, 'packages', 'skills', 'user');

// Prioridades base
const SKILL_PRIORITY = {
  'opsly-context': 'CRITICAL',
  'opsly-quantum': 'CRITICAL',
  'opsly-autonomous': 'CRITICAL',
  'opsly-brain-researcher': 'HIGH',
  'opsly-api': 'HIGH',
  'opsly-bash': 'HIGH',
  'opsly-frontend': 'HIGH',
  'opsly-supabase': 'HIGH',
  'opsly-infra': 'HIGH',
  'opsly-mcp': 'HIGH',
  'opsly-architect-senior': 'HIGH',
  'opsly-orchestrator': 'HIGH',
  'opsly-qa': 'MEDIUM',
  'opsly-billing': 'MEDIUM',
  'opsly-discord': 'MEDIUM',
};

function loadSkillMetadata(skillName) {
  try {
    const manifestPath = join(skillsPath, skillName, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return {
      name: skillName,
      version: manifest.version || '1.0.0',
      priority: manifest.priority || SKILL_PRIORITY[skillName] || 'LOW',
      category: manifest.category || 'general',
      description: manifest.description || '',
      capabilities: manifest.capabilities || [],
      triggers: manifest.triggers || [],
      examples: manifest.examples || [],
    };
  } catch (e) {
    return {
      name: skillName,
      version: '1.0.0',
      priority: SKILL_PRIORITY[skillName] || 'LOW',
      category: 'general',
      description: '',
      capabilities: [],
      error: e.message,
    };
  }
}

function mapSkillsForAgent(agentName) {
  const detection = detectAgentType(agentName);
  const baseSkills = detection.skills || [];

  console.log(`🎯 Skills Mapping for: ${agentName}`);
  console.log(`   Type: ${detection.detected_type}`);
  console.log('');

  // Cargar metadata de skills
  const skillMetadata = {};
  try {
    const dirs = readdirSync(skillsPath, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      const skillName = dir.name;
      skillMetadata[skillName] = loadSkillMetadata(skillName);
    }
  } catch (e) {
    console.warn('⚠️  Could not load all skill metadata:', e.message);
  }

  // Ordenar por prioridad
  const priorityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
  const mappedSkills = baseSkills
    .map(skillName => skillMetadata[skillName] || loadSkillMetadata(skillName))
    .sort((a, b) => {
      const aIdx = priorityOrder[a.priority] || 5;
      const bIdx = priorityOrder[b.priority] || 5;
      return aIdx - bIdx;
    });

  return {
    agent_name: agentName,
    agent_type: detection.detected_type,
    total_skills: mappedSkills.length,
    skills: mappedSkills,
    injection_order: mappedSkills.map(s => s.name),
  };
}

function main() {
  const args = process.argv.slice(2);
  let agentName = '';
  let outputFormat = 'text';

  for (const arg of args) {
    if (arg.startsWith('--agent-name=')) {
      agentName = arg.replace('--agent-name=', '');
    }
    if (arg.startsWith('--output=')) {
      outputFormat = arg.replace('--output=', '');
    }
  }

  if (!agentName) {
    console.error('❌ No agent name provided');
    console.error('Usage: node scripts/skills-mapper.js --agent-name=<name> [--output=json]');
    process.exit(1);
  }

  const result = mapSkillsForAgent(agentName);

  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`📚 Skills Manifest: ${agentName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${result.total_skills} skills`);
    console.log('');
    console.log('📖 Injection Order (by priority):');

    let currentPriority = '';
    for (const skill of result.skills) {
      if (skill.priority !== currentPriority) {
        currentPriority = skill.priority;
        console.log(`\n${currentPriority}:`);
      }
      console.log(`  • ${skill.name.replace('opsly-', '')} (v${skill.version})`);
      if (skill.description) {
        console.log(`    ${skill.description.substring(0, 60)}...`);
      }
    }

    console.log('');
    console.log('🔗 Load in this order:');
    for (const skill of result.injection_order) {
      console.log(`   ${skill}`);
    }
    console.log('');
  }

  return result;
}

export { mapSkillsForAgent, loadSkillMetadata };
main();
