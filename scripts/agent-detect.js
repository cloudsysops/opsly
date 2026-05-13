#!/usr/bin/env node
/**
 * Detecta tipo de agente y propone configuración
 * Uso: node scripts/agent-detect.js [--agent-name=<name>] [--output=json|text]
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Detector de tipo de agente
const AGENT_PATTERNS = {
  'architect-supervisor|architect|supervisor|planner': {
    type: 'planner',
    role: 'planner',
    model: 'llama3.2:latest',
    fallback_model: 'anthropic/claude-3-5-sonnet',
    daily_budget_usd: 1.5,
    rate_limit: { requests_per_minute: 6, tokens_per_minute: 12000 },
    allowed_tools: ['plan', 'delegate', 'summarize', 'route_task', 'mcp_tool'],
    allowed_paths: ['apps/', 'config/', 'docs/', 'scripts/'],
    specialization: ['planning', 'architecture', 'routing'],
  },
  'backend|api|executor|worker|opencode': {
    type: 'executor',
    role: 'executor',
    model: 'deepseek-coder:6.7b',
    fallback_model: 'anthropic/claude-3-5-haiku',
    daily_budget_usd: 1.2,
    rate_limit: { requests_per_minute: 5, tokens_per_minute: 10000 },
    allowed_tools: ['read_file', 'write_file', 'run_tests', 'enqueue_job', 'mcp_tool'],
    allowed_paths: ['apps/', 'lib/', 'packages/'],
    specialization: ['coding', 'testing', 'api-development'],
  },
  'frontend|ui|portal|admin|cursor': {
    type: 'executor',
    role: 'executor',
    model: 'codellama:7b',
    fallback_model: 'openrouter/gpt-4o-mini',
    daily_budget_usd: 0.8,
    rate_limit: { requests_per_minute: 5, tokens_per_minute: 8000 },
    allowed_tools: ['read_file', 'write_file', 'run_tests', 'mcp_tool'],
    allowed_paths: ['apps/admin/', 'apps/portal/', 'apps/frontend/'],
    specialization: ['frontend', 'react', 'ui-development'],
  },
  'infra|devops|docker|deployment|hermes': {
    type: 'tool',
    role: 'tool',
    model: 'llama3.2:latest',
    fallback_model: 'openrouter/claude-3.5-haiku',
    daily_budget_usd: 0.5,
    rate_limit: { requests_per_minute: 3, tokens_per_minute: 6000 },
    allowed_tools: ['bash', 'docker_ps', 'health_check', 'logs_tail', 'mcp_tool'],
    allowed_paths: ['infra/', 'scripts/', 'docs/'],
    specialization: ['infrastructure', 'devops', 'deployment'],
  },
  'codex|code-review|analysis|qa': {
    type: 'specialist',
    role: 'architect',
    model: 'gpt-4o',
    fallback_model: 'anthropic/claude-3-5-sonnet',
    daily_budget_usd: 2.5,
    rate_limit: { requests_per_minute: 4, tokens_per_minute: 15000 },
    allowed_tools: ['read_file', 'analyze_codebase', 'code_review', 'mcp_tool'],
    allowed_paths: ['apps/', 'config/', 'docs/', 'supabase/'],
    specialization: ['code-review', 'architecture-design', 'quality-assurance'],
  },
};

// Skills por tipo de agente
const SKILLS_BY_TYPE = {
  planner: ['opsly-context', 'opsly-architect-senior', 'opsly-quantum', 'opsly-skill-creator'],
  executor: ['opsly-context', 'opsly-api', 'opsly-bash', 'opsly-supabase', 'opsly-mcp'],
  tool: ['opsly-context', 'opsly-infra', 'opsly-orchestrator', 'opsly-qa'],
  specialist: ['opsly-context', 'opsly-architect-senior', 'opsly-qa', 'opsly-billing'],
};

function detectAgentType(agentName) {
  const lowerName = (agentName || '').toLowerCase();

  for (const [patterns, config] of Object.entries(AGENT_PATTERNS)) {
    const patternList = patterns.split('|');
    for (const pattern of patternList) {
      if (lowerName.includes(pattern.trim())) {
        return {
          success: true,
          agent_name: agentName,
          detected_type: config.type,
          confidence: 'high',
          config,
          skills: SKILLS_BY_TYPE[config.type] || [],
        };
      }
    }
  }

  // Default fallback
  return {
    success: false,
    agent_name: agentName,
    detected_type: 'executor',
    confidence: 'low',
    message: `Unknown agent type. Defaulting to 'executor'. Available patterns: ${Object.keys(AGENT_PATTERNS).join(', ')}`,
    config: AGENT_PATTERNS['backend|api|executor|worker|opencode'],
    skills: SKILLS_BY_TYPE['executor'] || [],
  };
}

function main() {
  const args = process.argv.slice(2);
  let agentName = process.env.AGENT_NAME || '';
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
    console.error('Usage: node scripts/agent-detect.js --agent-name=<name> [--output=json|text]');
    process.exit(1);
  }

  const result = detectAgentType(agentName);

  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`🤖 Agent Detection`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${result.agent_name}`);
    console.log(`Type: ${result.detected_type}`);
    console.log(`Confidence: ${result.confidence}`);
    if (result.message) {
      console.log(`⚠️  ${result.message}`);
    }
    console.log('');
    console.log(`💼 Default Config:`);
    console.log(`   Model: ${result.config.model}`);
    console.log(`   Budget: $${result.config.daily_budget_usd}/day`);
    console.log(`   Rate limit: ${result.config.rate_limit.requests_per_minute} req/min`);
    console.log('');
    console.log(`📚 Skills to inject:`);
    for (const skill of result.skills) {
      console.log(`   • ${skill}`);
    }
    console.log('');
  }

  return result;
}

export { detectAgentType, SKILLS_BY_TYPE };
main();
