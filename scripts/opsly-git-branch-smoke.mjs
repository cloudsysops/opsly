#!/usr/bin/env node
/**
 * Smoke: Git Branch Orchestrator (registry only, no git mutations).
 * OPSLY_ROOT must point at repo root.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OPSLY_ROOT?.trim() || join(__dirname, '..');

async function main() {
  const policyPath = join(ROOT, 'config', 'git-branch-policy.json');
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  console.log('policy:', policy.branch_pattern);
  console.log('integration:', policy.integration_pattern);

  const mod = await import(join(ROOT, 'lib', 'git-branch-orchestrator', 'dist', 'index.js'));

  process.env.OPSLY_ROOT = ROOT;
  process.env.OPSLY_GIT_DRY_RUN = '1';

  const plan = await mod.createBranchPlan({
    tenant_slug: 'smoke',
    initiative: 'chatops-mvp',
    tasks: mod.defaultChatOpsMvpTasks(),
    plan_only: true,
  });

  console.log('integration_branch:', plan.integration_branch);
  for (const e of plan.entries) {
    console.log(' ', e.branch_name, '→', e.target_branch, `(${e.worker_id})`);
  }

  const assign = await mod.assignWorkerToBranch({
    tenant_slug: 'smoke',
    initiative: 'chatops-mvp',
    task_slug: 'ai-gateway-retry',
    task_type: 'implementation',
    worker_id: 'opencode',
  });
  console.log('assign:', assign.entry.branch_name, assign.opsly_job_type_hint);
  console.log('merge_advisor:', assign.merge_advisor?.recommended_action);

  const dispatch = await mod.dispatchChatOps({
    tenant_slug: 'smoke',
    action: 'assign_from_message',
    message: 'Review integration branch with Hermes',
  });
  console.log('dispatch worker:', dispatch.assign?.entry.worker_id);

  console.log('\nOK — Git Branch Orchestrator smoke passed (dry-run)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
