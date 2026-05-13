#!/usr/bin/env node
/**
 * Welcome briefing para agentes nuevos
 * Muestra contexto vivo (AGENTS.md, VISION.md, estado actual)
 * Uso: node scripts/agent-welcome-briefing.mjs [--agent-name=<name>]
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readFile(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function extractSection(content, sectionName) {
  if (!content) return '';

  // Buscar ## Section Name o # Section Name
  const regex = new RegExp(`^#{1,2}\\s+${sectionName}.*?(?=^#{1,2}\\s|$)`, 'gims');
  const match = content.match(regex);
  if (!match) return '';

  // Extraer solo las primeras líneas
  const lines = match[0].split('\n').slice(1, 10);
  return lines.join('\n').trim();
}

function getGitInfo() {
  try {
    const branch = execSync('git branch --show-current', { cwd: root, encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --pretty=%s', { cwd: root, encoding: 'utf8' }).trim();
    const commitsAhead = execSync('git rev-list --count origin/main..HEAD 2>/dev/null || echo 0', {
      cwd: root,
      encoding: 'utf8',
    }).trim();

    return { branch, lastCommit, commitsAhead };
  } catch {
    return { branch: 'unknown', lastCommit: 'unknown', commitsAhead: '0' };
  }
}

function generateWelcome(agentName = 'Agent') {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Welcome to Opsly 🚀                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Agent info
  console.log(`🤖 Agent: ${agentName}`);
  console.log('');

  // Git state
  const gitInfo = getGitInfo();
  console.log('📍 Repository State:');
  console.log(`   Branch: ${gitInfo.branch}`);
  console.log(`   Last commit: ${gitInfo.lastCommit}`);
  console.log(`   Ahead: ${gitInfo.commitsAhead} commits`);
  console.log('');

  // Vision
  const visionPath = join(root, 'VISION.md');
  const vision = readFile(visionPath);
  const visionSnippet = extractSection(vision, 'VISION|Product');
  console.log('🎯 Product Vision:');
  if (visionSnippet) {
    console.log(visionSnippet.split('\n').slice(0, 3).join('\n').replace(/^/gm, '   '));
  } else {
    console.log('   (Read VISION.md for product north star)');
  }
  console.log('');

  // AGENTS.md status
  const agentsPath = join(root, 'AGENTS.md');
  const agents = readFile(agentsPath);
  const statusSnippet = extractSection(agents, 'Status|Current Phase');
  console.log('📊 Current Status:');
  if (statusSnippet) {
    console.log(statusSnippet.split('\n').slice(0, 3).join('\n').replace(/^/gm, '   '));
  } else {
    console.log('   Read AGENTS.md for operational status');
  }
  console.log('');

  // Brain:research
  console.log('🧠 Context Optimization (Token Saving):');
  console.log('   When you need context, use brain:research:');
  console.log('   • "investigar X" → Searches Obsidian brain');
  console.log('   • Saves 60-70% tokens vs full context');
  console.log('   • Returns: {question, answer, sources, confidence}');
  console.log('   • MCP tool: brain:research');
  console.log('');

  // Available tools
  console.log('🔧 Available Tools:');
  console.log('   MCP Tools:');
  console.log('     • brain:search           - Full-text search');
  console.log('     • brain:semantic-search  - Similarity match');
  console.log('     • brain:research         - Iterative investigation');
  console.log('     • brain:graph            - Knowledge graph');
  console.log('     • brain:get              - Retrieve specific doc');
  console.log('');
  console.log('   Skills (pre-loaded):');
  console.log('     • opsly-context          - Current state');
  console.log('     • opsly-brain-researcher - Investigation');
  console.log('     • opsly-api, opsly-bash, opsly-infra (by type)');
  console.log('');

  // Next steps
  console.log('📋 Your First Steps:');
  console.log('   1. Read AGENTS.md (source of truth)');
  console.log('   2. Check VISION.md (product north)');
  console.log('   3. Use brain:research for investigation');
  console.log('   4. Create PR for any code changes');
  console.log('');

  // Key constraints
  console.log('⚡ Key Constraints:');
  console.log('   • No K8s / Swarm / nginx (use Docker Compose)');
  console.log('   • No secrets in code (use Doppler)');
  console.log('   • No "any" in TypeScript');
  console.log('   • brain:research for context (not full dumps)');
  console.log('');

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Ready to work! Questions? Check docs/brain/ or ask AGENTS.md  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  let agentName = process.env.AGENT_NAME || 'Agent';

  for (const arg of args) {
    if (arg.startsWith('--agent-name=')) {
      agentName = arg.replace('--agent-name=', '');
    }
  }

  generateWelcome(agentName);
}

export { generateWelcome };
main();
