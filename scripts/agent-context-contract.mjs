#!/usr/bin/env node
/**
 * Canonical, provider-neutral contract for agent context and token usage.
 * This is intentionally small enough to run before any provider is invoked.
 */

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CONTRACT_PATH = join(ROOT, 'config', 'agent-context-contract.json');
const SKILL_ROOTS = [join(ROOT, 'packages', 'skills', 'user'), join(ROOT, 'skills', 'user')];

const REQUIRED_LIMITS = {
  max_context_tokens: 12000,
  max_output_tokens: 1600,
  max_auto_loaded_skills: 3,
  max_research_iterations: 3,
};

async function loadContract() {
  return JSON.parse(await readFile(CONTRACT_PATH, 'utf8'));
}

function validateObject(contract, overrides = {}) {
  const candidate = {
    ...contract,
    ...overrides,
    defaults: { ...contract.defaults, ...(overrides.defaults ?? {}) },
  };
  const errors = [];

  if (candidate.status !== 'enforced') errors.push('status must be enforced');
  for (const [key, limit] of Object.entries(REQUIRED_LIMITS)) {
    if (candidate.defaults[key] > limit) {
      errors.push(`${key} exceeds safe limit ${limit}`);
    }
  }
  if (candidate.defaults.require_gateway !== true) errors.push('require_gateway must be true');
  if (candidate.defaults.require_usage_metadata !== true) {
    errors.push('require_usage_metadata must be true');
  }
  if (!Array.isArray(candidate.bootstrap?.required_files) || candidate.bootstrap.required_files.length === 0) {
    errors.push('bootstrap.required_files must not be empty');
  }
  if (!Array.isArray(candidate.bootstrap?.required_skills) || candidate.bootstrap.required_skills.length === 0) {
    errors.push('bootstrap.required_skills must not be empty');
  }

  return { valid: errors.length === 0, errors, contract: candidate };
}

async function validateContract(overrides = {}) {
  const contract = await loadContract();
  const result = validateObject(contract, overrides);
  for (const file of contract.bootstrap.required_files) {
    try {
      await readFile(join(ROOT, file));
    } catch {
      result.valid = false;
      result.errors.push(`missing bootstrap file: ${file}`);
    }
  }
  for (const skill of contract.bootstrap.required_skills) {
    if (!(await hasSkill(skill))) {
      result.valid = false;
      result.errors.push(`missing bootstrap skill: ${skill}`);
    }
  }
  return result;
}

async function hasSkill(skill) {
  for (const root of SKILL_ROOTS) {
    try {
      await access(join(root, skill, 'SKILL.md'));
      return true;
    } catch {
      // Try the next canonical skill root.
    }
  }
  return false;
}

function detectDomain(task, contract) {
  const normalized = task.toLowerCase();
  for (const [domain, triggers] of Object.entries(contract.skill_selection.triggers)) {
    if (triggers.some((trigger) => normalized.includes(trigger))) return domain;
  }
  return null;
}

async function buildAgentBrief({ agent = 'unknown', task = '' } = {}) {
  const validation = await validateContract();
  if (!validation.valid) throw new Error(validation.errors.join('; '));

  const { contract } = validation;
  const domain = detectDomain(task, contract);
  const skills = [...contract.skill_selection.always];
  if (domain) skills.push(contract.skill_selection.domain_skills[domain]);
  if (domain && domain !== 'qa') skills.push(contract.skill_selection.verification_skill);
  const uniqueSkills = [...new Set(skills)].slice(0, contract.defaults.max_auto_loaded_skills);
  for (const skill of uniqueSkills) {
    if (!(await hasSkill(skill))) throw new Error(`missing selected skill: ${skill}`);
  }
  const skillFiles = uniqueSkills.map((skill) => `packages/skills/user/${skill}/SKILL.md`);

  return {
    agent,
    task,
    domain,
    skills: uniqueSkills,
    skill_files: skillFiles,
    limits: {
      context_tokens: contract.defaults.max_context_tokens,
      output_tokens: contract.defaults.max_output_tokens,
      research_iterations: contract.defaults.max_research_iterations,
    },
    requirements: {
      gateway: contract.defaults.require_gateway,
      usage_metadata: contract.defaults.require_usage_metadata,
      request_id: contract.defaults.require_request_id,
      tenant_slug_when_scoped: contract.defaults.require_tenant_slug_when_scoped,
    },
    bootstrap_files: contract.bootstrap.required_files,
    prompt: [
      'Usa el contrato canónico de contexto de Opsly.',
      `Skills cargados: ${uniqueSkills.join(', ')}.`,
      `Límite de contexto: ${contract.defaults.max_context_tokens} tokens; salida: ${contract.defaults.max_output_tokens}.`,
      'No cargues todo el repositorio: lee solo archivos relevantes y busca localmente.',
      'Usa brain:research para investigación documentada; no para cada consulta.',
      `Lee solo estos SKILL.md antes de actuar: ${skillFiles.join(', ')}.`,
      'Toda llamada de modelo pasa por OpenClaw -> apps/llm-gateway con metadatos de uso.',
    ].join(' '),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'validate';
  const taskIndex = args.indexOf('--task');
  const agentIndex = args.indexOf('--agent');
  const task = taskIndex >= 0 ? args[taskIndex + 1] ?? '' : '';
  const agent = agentIndex >= 0 ? args[agentIndex + 1] ?? 'unknown' : 'unknown';

  if (command === 'brief') {
    console.log(JSON.stringify(await buildAgentBrief({ agent, task }), null, 2));
    return;
  }

  const result = await validateContract();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

export { buildAgentBrief, validateContract, validateObject };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
