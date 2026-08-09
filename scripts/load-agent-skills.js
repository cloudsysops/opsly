#!/usr/bin/env node

/**
 * Load Agent Skills for Opsly Sessions
 *
 * Integrates Addy Osmani's agent-skills into Opsly development workflows.
 * Automatically bridges production best practices to Opsly domain context.
 *
 * Usage:
 *   node scripts/load-agent-skills.js --phase build --context api
 *   node scripts/load-agent-skills.js --phase test --autonomous
 *   node scripts/load-agent-skills.js --list-all
 */

const fs = require('fs');
const path = require('path');

// Canonical vendored pack (synced from addyosmani/agent-skills).
// Prefer skills/vendor; keep vendor/agent-skills as optional clone fallback.
const AGENT_SKILLS_PATH_PRIMARY = path.join(__dirname, '..', 'skills', 'vendor', 'agent-skills');
const AGENT_SKILLS_PATH_FALLBACK = path.join(__dirname, '..', 'vendor', 'agent-skills');
const OPSLY_BRIDGE_PATH = path.join(__dirname, '..', 'skills', 'user', 'opsly-agent-skills-bridge');
const SKILLS_INDEX_PATH = path.join(__dirname, '..', 'skills', 'index.json');

function resolveAgentSkillsRoot() {
  if (fs.existsSync(path.join(AGENT_SKILLS_PATH_PRIMARY, 'using-agent-skills', 'SKILL.md'))) {
    return { root: AGENT_SKILLS_PATH_PRIMARY, layout: 'flat' };
  }
  if (fs.existsSync(path.join(AGENT_SKILLS_PATH_FALLBACK, 'skills'))) {
    return { root: path.join(AGENT_SKILLS_PATH_FALLBACK, 'skills'), layout: 'nested' };
  }
  if (fs.existsSync(AGENT_SKILLS_PATH_FALLBACK)) {
    return { root: AGENT_SKILLS_PATH_FALLBACK, layout: 'flat' };
  }
  return { root: AGENT_SKILLS_PATH_PRIMARY, layout: 'flat' };
}

const AGENT_SKILLS_RESOLVED = resolveAgentSkillsRoot();
const AGENT_SKILLS_PATH = AGENT_SKILLS_RESOLVED.root;

// Phase mapping
const PHASE_MAP = {
  define: ['interview-me', 'spec-driven-development', 'idea-refine'],
  plan: ['planning-and-task-breakdown', 'doubt-driven-development'],
  build: ['incremental-implementation', 'test-driven-development', 'context-engineering'],
  verify: ['browser-testing-with-devtools', 'debugging-and-error-recovery', 'observability-and-instrumentation'],
  review: ['code-review-and-quality', 'security-and-hardening', 'performance-optimization', 'observability-and-instrumentation'],
  simplify: ['code-simplification'],
  ship: ['shipping-and-launch', 'deprecation-and-migration', 'ci-cd-and-automation', 'git-workflow-and-versioning', 'observability-and-instrumentation']
};

// Domain-specific context mappings
const DOMAIN_CONTEXT = {
  'api': {
    skill: 'api-and-interface-design',
    guide: 'OpenAPI first, Zod schema validation, multi-tenant isolation checks',
    template: 'skills/templates/template-api-route.md'
  },
  'frontend': {
    skill: 'frontend-ui-engineering',
    guide: 'React components, accessibility checklist, performance (CLS/LCP)',
    template: 'skills/templates/template-react-component.md'
  },
  'orchestrator': {
    skill: 'orchestration-patterns',
    guide: 'BullMQ jobs, Hive task decomposition, error recovery',
    template: 'skills/templates/template-orchestrator-job.md'
  },
  'test': {
    skill: 'test-driven-development',
    guide: 'Multi-tenant test isolation, Vitest + mocks, coverage gates',
    template: 'skills/templates/template-test.md'
  },
  'security': {
    skill: 'security-and-hardening',
    guide: 'Doppler secrets, Zero-Trust portals, Cyber Neo scans, audit logs',
    template: 'docs/04-infrastructure/SECURITY_CHECKLIST.md'
  },
  'infra': {
    skill: 'ci-cd-and-automation',
    guide: 'Docker Compose (no K8s default), Traefik, VPS provisioning, canary deploy',
    template: 'docs/04-infrastructure/VPS-PROVISIONING-STANDARD.md'
  }
};

// Load agent-skills metadata
function loadAgentSkillsMetadata() {
  const skillsDir = AGENT_SKILLS_PATH;
  if (!fs.existsSync(skillsDir)) {
    return [];
  }
  const skills = fs.readdirSync(skillsDir).filter(f => {
    const fullPath = path.join(skillsDir, f);
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
  });

  return skills.map(skill => ({
    name: skill,
    path: path.join(skillsDir, skill),
    skillFile: path.join(skillsDir, skill, 'SKILL.md'),
    exists: fs.existsSync(path.join(skillsDir, skill, 'SKILL.md'))
  }));
}

// Load skill content
function loadSkillContent(skillPath) {
  try {
    return fs.readFileSync(skillPath, 'utf8');
  } catch (e) {
    return null;
  }
}

// Generate phase-specific guidance
function generatePhaseGuidance(phase, context) {
  const skills = PHASE_MAP[phase] || [];
  const domainInfo = DOMAIN_CONTEXT[context] || {};

  return {
    phase,
    context: context || 'general',
    principles: getPhaseInstructions(phase),
    agentSkills: skills,
    opslyContext: domainInfo.guide || 'Apply Opsly multi-tenant, Doppler-secrets, no-`any` rules',
    template: domainInfo.template || 'skills/templates/template-generic.md',
    checklist: generateChecklist(phase, context)
  };
}

// Phase-specific instructions
function getPhaseInstructions(phase) {
  const instructions = {
    define: [
      'Interview stakeholders and gather requirements',
      'Write spec first (Zod schema + OpenAPI if API)',
      'Link to architecture decision if major change'
    ],
    plan: [
      'Break task into small, independently valuable slices',
      'Each slice: compiles, tests pass, merges clean',
      'Estimate slices in hours, not days'
    ],
    build: [
      'Write tests before code (TDD)',
      'Implement slice incrementally',
      'Validate multi-tenant isolation at each step'
    ],
    verify: [
      'Run browser tests / E2E for UI changes',
      'Debug failures systematically',
      'Ensure production readiness'
    ],
    review: [
      'Check no `any` in TypeScript',
      'Verify multi-tenant isolation (tenant_slug scopes)',
      'Run security audit (Cyber Neo, secrets scan)',
      'Performance: <200ms API, CLS/LCP for UI'
    ],
    simplify: [
      'Extract to lib/ if >200 lines or shared',
      'Prefer clarity over cleverness',
      'Refactor before shipping'
    ],
    ship: [
      'Feature flags for new features',
      'Canary deploy: staging → prod',
      'Deprecation: 2-week notice + migration guide',
      'Post-deploy smoke test'
    ]
  };

  return instructions[phase] || [];
}

// Generate context-aware checklist
function generateChecklist(phase, context) {
  const baseChecklist = {
    define: ['Spec written', 'Stakeholders interviewed', 'Requirements clear', 'Acceptance criteria defined'],
    plan: ['Tasks broken down', 'Each slice <8h', 'Dependencies clear', 'Order validated'],
    build: ['Tests written first', 'Code passes type-check', 'Multi-tenant isolation verified', 'No `any` in TS'],
    verify: ['Tests pass', 'Browser tests green', 'Smoke tests pass', 'No regressions detected'],
    review: ['Code reviewed', 'Security audit pass', 'Performance checked', 'Docs updated'],
    simplify: ['Extracted to lib/ if needed', 'Comments removed (were misleading)', 'Functions named clearly', 'Test coverage >80%'],
    ship: ['Feature flags set', 'Canary deployed', 'Monitoring configured', 'Rollback plan ready']
  };

  const contextChecks = {
    api: ['OpenAPI spec updated', 'Zod schema validated', 'Multi-tenant scopes verified', 'Rate limiting added'],
    frontend: ['Accessibility checked (a11y)', 'Mobile responsive', 'CLS/LCP measured', 'Dark mode works'],
    orchestrator: ['BullMQ job type added', 'Hive subtasks defined', 'Error handlers present', 'Retry logic tested'],
    security: ['Secrets in Doppler', 'No hardcoded keys', 'Audit log entry added', 'Cyber Neo scan pass']
  };

  const checklist = baseChecklist[phase] || [];
  if (contextChecks[context]) {
    checklist.push(...contextChecks[context]);
  }

  return checklist;
}

// List all available agent-skills
function listAllSkills() {
  const skills = loadAgentSkillsMetadata();
  console.log('\n📚 Available Agent Skills:');
  console.log('━'.repeat(60));

  Object.entries(PHASE_MAP).forEach(([phase, phaseSkills]) => {
    console.log(`\n📍 ${phase.toUpperCase()}:`);
    phaseSkills.forEach(skill => {
      const found = skills.find(s => s.name === skill);
      const status = found && found.exists ? '✓' : '✗';
      console.log(`   ${status} ${skill}`);
    });
  });

  console.log('\n🎯 Domain Contexts:');
  Object.entries(DOMAIN_CONTEXT).forEach(([context, info]) => {
    console.log(`   • ${context}: ${info.guide}`);
  });

  console.log('\n');
}

// Main handler
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list-all') || args.includes('--list')) {
    listAllSkills();
    return;
  }

  let phase = null;
  let context = null;
  let autonomous = args.includes('--autonomous');

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) phase = args[++i];
    if (args[i] === '--context' && args[i + 1]) context = args[++i];
  }

  if (!phase) {
    console.log(`
🚀 Agent Skills Loader for Opsly

Usage:
  node scripts/load-agent-skills.js --phase <phase> [--context <context>] [--autonomous]

Phases: define, plan, build, verify, review, simplify, ship
Contexts: api, frontend, orchestrator, test, security, infra

Examples:
  node scripts/load-agent-skills.js --phase build --context api
  node scripts/load-agent-skills.js --phase test --autonomous
  node scripts/load-agent-skills.js --list-all

    `);
    return;
  }

  // Generate and output guidance
  const guidance = generatePhaseGuidance(phase, context);

  console.log(`\n✨ Agent Skills: ${phase.toUpperCase()}${context ? ` [${context}]` : ''}`);
  console.log('━'.repeat(70));

  console.log(`\n📖 Principles (from agent-skills):`);
  guidance.principles.forEach(p => console.log(`   • ${p}`));

  if (guidance.opslyContext) {
    console.log(`\n🔒 Opsly Context:`);
    console.log(`   ${guidance.opslyContext}`);
  }

  console.log(`\n✅ Checklist:`);
  guidance.checklist.forEach(item => console.log(`   [ ] ${item}`));

  if (guidance.template) {
    console.log(`\n📋 Template: ${guidance.template}`);
  }

  console.log(`\n📚 Agent Skills to Review (root: ${AGENT_SKILLS_PATH}):`);
  guidance.agentSkills.forEach(skill => {
    const skillFile = path.join(AGENT_SKILLS_PATH, skill, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      console.log(`   ✓ skills/vendor/agent-skills/${skill}/SKILL.md`);
    } else {
      console.log(`   ✗ missing ${skill}/SKILL.md`);
    }
  });

  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Review Opsly Bridge guide: ${OPSLY_BRIDGE_PATH}/SKILL.md`);
  console.log(`   2. Follow checklist items above`);
  console.log(`   3. Use template if available`);
  if (!autonomous) {
    console.log(`   4. Run with --autonomous flag to skip confirmations`);
  }

  console.log('\n');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
