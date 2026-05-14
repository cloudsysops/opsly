#!/usr/bin/env node
/**
 * Auto-registra agentes nuevos en agents-team.json
 * Uso: node scripts/agent-registry-sync.js --agent-name=<name> --type=<type> [--dry-run]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAgentType, SKILLS_BY_TYPE } from './agent-detect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const AGENTS_TEAM_FILE = join(root, 'config', 'agents-team.json');

function loadAgentsTeam() {
  try {
    return JSON.parse(readFileSync(AGENTS_TEAM_FILE, 'utf8'));
  } catch (e) {
    console.error('❌ Cannot load agents-team.json:', e.message);
    process.exit(1);
  }
}

function saveAgentsTeam(data) {
  writeFileSync(AGENTS_TEAM_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function agentExists(agents, agentName) {
  return agents.agents.some(a => a.name === agentName || a.id === agentName);
}

function registerAgent(agentName, dryRun = false) {
  console.log(`🤖 Agent Registration: ${agentName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Detectar tipo
  const detection = detectAgentType(agentName);
  if (!detection.success && detection.confidence === 'low') {
    console.warn(`⚠️  Low confidence detection. Using defaults.`);
  }

  // Cargar team config
  const agentsTeam = loadAgentsTeam();

  // Verificar si ya existe
  if (agentExists(agentsTeam, agentName)) {
    console.log(`✅ Agent already registered: ${agentName}`);
    return { success: true, action: 'already_registered' };
  }

  // Crear entry nuevo
  const newAgent = {
    id: agentName.toLowerCase().replace(/\s+/g, '-'),
    name: agentName,
    role: detection.config.role,
    model: detection.config.model,
    fallback_model: detection.config.fallback_model,
    daily_budget_usd: detection.config.daily_budget_usd,
    local_only: false,
    rate_limit: detection.config.rate_limit,
    allowed_tools: detection.config.allowed_tools,
    allowed_paths: detection.config.allowed_paths,
    specialization: detection.config.specialization || [],
    _registered_at: new Date().toISOString(),
    _detected_type: detection.detected_type,
  };

  console.log('📋 New Agent Configuration:');
  console.log(`   ID: ${newAgent.id}`);
  console.log(`   Name: ${newAgent.name}`);
  console.log(`   Type: ${newAgent.role}`);
  console.log(`   Model: ${newAgent.model}`);
  console.log(`   Budget: $${newAgent.daily_budget_usd}/day`);
  console.log(`   Rate: ${newAgent.rate_limit.requests_per_minute} req/min`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes made');
    console.log('');
    return { success: true, action: 'dry_run', agent: newAgent };
  }

  // Agregar agent
  agentsTeam.agents.push(newAgent);

  // Guardar
  saveAgentsTeam(agentsTeam);

  console.log('✅ Agent registered in agents-team.json');
  console.log(`   Total agents: ${agentsTeam.agents.length}`);
  console.log('');

  return { success: true, action: 'registered', agent: newAgent };
}

function main() {
  const args = process.argv.slice(2);
  let agentName = '';
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--agent-name=')) {
      agentName = arg.replace('--agent-name=', '');
    }
    if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  if (!agentName) {
    console.error('❌ No agent name provided');
    console.error('Usage: node scripts/agent-registry-sync.js --agent-name=<name> [--dry-run]');
    process.exit(1);
  }

  registerAgent(agentName, dryRun);
}

export { registerAgent, loadAgentsTeam, saveAgentsTeam };
main();
