#!/usr/bin/env tsx
/**
 * Client Plan CLI - Generate a launch plan for a client
 * Phase 3 of Opsly Agency Operating System
 *
 * Usage:
 *   npm run client:plan -- --tenant-slug peskids
 *   npm run client:plan -- --tenant-slug peskids --dry-run
 *   npm run client:plan -- --tenant-slug peskids --output launch-plan.md
 */

import fs from 'fs';
import path from 'path';

interface LaunchStep {
  step: number;
  task: string;
  owner: string;
  time: string;
  gate: string;
  details?: string[];
  blockers?: string[];
}

interface LaunchPlan {
  tenant_name: string;
  tenant_slug: string;
  created_at: string;
  total_time: string;
  steps: LaunchStep[];
  timeline: string;
  success_criteria: string[];
  next_steps: string[];
}

const LAUNCH_STEPS: LaunchStep[] = [
  {
    step: 1,
    task: 'Sales Intake',
    owner: 'Sales',
    time: '5 min',
    gate: 'Client requirements frozen',
    details: [
      'Confirm use case and workflow types',
      'Identify CRM integration needs',
      'Set success metrics',
      'Prepare onboarding timeline',
    ],
    blockers: [
      'Unclear requirements → require written spec',
      'CRM migration requested → offer as Phase 2 add-on',
    ],
  },
  {
    step: 2,
    task: 'Tenant Setup',
    owner: 'Ops',
    time: '3 min',
    gate: 'Tenant config validated',
    details: [
      'Create tenant config file (config/tenants/{slug}.json)',
      'Validate schema against client-launch.schema.json',
      'Generate tenant database schema',
      'Create Supabase RLS policies',
    ],
    blockers: ['Doppler secrets missing → bootstrap via vps-dragon'],
  },
  {
    step: 3,
    task: 'CRM Setup',
    owner: 'Ops',
    time: '4 min',
    gate: 'GHL location synced',
    details: [
      'Link GoHighLevel location ID',
      'Configure custom fields mapping',
      'Test lead sync webhook',
      'Verify CRM field validation',
    ],
    blockers: [
      'GHL API key missing → fetch from Doppler prd',
      'Location ID invalid → request from client',
    ],
  },
  {
    step: 4,
    task: 'Landing Setup',
    owner: 'Ops',
    time: '3 min',
    gate: 'Form renders locally',
    details: [
      'Deploy tenant landing app (apps/{tenant})',
      'Configure lead capture form',
      'Test form submission locally',
      'Verify thank-you page redirect',
    ],
    blockers: ['Build fails → check node_modules and rebuild'],
  },
  {
    step: 5,
    task: 'Automation Setup',
    owner: 'Ops',
    time: '3 min',
    gate: 'n8n webhook live',
    details: [
      'Deploy n8n workflows to VPS',
      'Configure webhook secrets in Doppler',
      'Test lead→CRM sync end-to-end',
      'Enable monitoring and error logging',
    ],
    blockers: [
      'VPS Redis offline → SSH and check docker ps',
      'n8n workflows outdated → pull latest from repo',
    ],
  },
  {
    step: 6,
    task: 'Deploy',
    owner: 'DevOps',
    time: '4 min',
    gate: 'Build passes + type-check clean',
    details: [
      'Run: npm run build',
      'Run: npm run type-check',
      'Run: npm run validate-structure',
      'Create Docker image for tenant app',
      'Push to GHCR registry',
    ],
    blockers: [
      'Type errors → fix TypeScript compilation',
      'Audit vulnerabilities → update dependencies',
      'CI pipeline failure → check logs on GitHub Actions',
    ],
  },
  {
    step: 7,
    task: 'Smoke Test',
    owner: 'QA',
    time: '2 min',
    gate: '5 checks pass',
    details: [
      '✓ Health check: GET /api/health → 200',
      '✓ Form load: GET /forms/lead-capture → renders',
      '✓ Form submit: POST /api/leads → 200 + email alert',
      '✓ CRM sync: Verify lead in GHL within 10 sec',
      '✓ Admin panel: Login and view submissions',
    ],
    blockers: [
      'Form 404 → check routing in next.config.js',
      'CRM not syncing → test n8n webhook manually',
      'Admin blocked → verify auth session',
    ],
  },
  {
    step: 8,
    task: 'Client Demo',
    owner: 'Sales',
    time: '5 min',
    gate: 'Client signs off',
    details: [
      'Walk through landing page experience',
      'Submit test lead and show CRM result',
      'Demo admin panel and reporting',
      'Confirm branding and copy match requirements',
      'Get verbal approval to go live',
    ],
    blockers: ['Demo domain inaccessible → check Traefik reverse proxy on VPS'],
  },
  {
    step: 9,
    task: 'Handoff',
    owner: 'Ops',
    time: '1 min',
    gate: 'Credentials transferred',
    details: [
      'Send admin login credentials (securely)',
      'Share landing page URL and GHL integration details',
      'Provide runbook: docs/tenants/{tenant}/RUNBOOK.md',
      'Schedule 1-week check-in call',
    ],
    blockers: [],
  },
  {
    step: 10,
    task: 'Monthly Ops (async, not in launch)',
    owner: 'Ops',
    time: '0 min',
    gate: 'Recurring automated',
    details: [
      'Monitor error rates and CRM sync latency',
      'Backup database and logs',
      'Update dependencies and security patches',
      'Monthly cost reconciliation',
    ],
    blockers: [],
  },
];

function parseArgs(): { tenantSlug?: string; output?: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  const result = { tenantSlug: undefined as string | undefined, output: undefined as string | undefined, dryRun: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-slug' && i + 1 < args.length) {
      result.tenantSlug = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      result.output = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}

function generatePlan(tenantSlug: string): LaunchPlan {
  const tenantConfig = path.join(process.cwd(), 'config', 'tenants', `${tenantSlug}.json`);
  let tenantName = tenantSlug;

  if (fs.existsSync(tenantConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(tenantConfig, 'utf-8'));
      tenantName = config.tenant_name || tenantSlug;
    } catch {
      console.warn(`⚠️  Could not parse tenant config, using slug as name`);
    }
  }

  const plan: LaunchPlan = {
    tenant_name: tenantName,
    tenant_slug: tenantSlug,
    created_at: new Date().toISOString(),
    total_time: '30 minutes (operational), ~25 minutes (wall-clock)',
    steps: LAUNCH_STEPS,
    timeline: 'Steps 1-5 sequential (client + ops time), 6-9 parallelizable where possible',
    success_criteria: [
      '✓ Form submission creates lead in Supabase',
      '✓ Lead syncs to GHL within 10 seconds',
      '✓ Admin can view all submissions',
      '✓ Client receives email notification',
      '✓ No errors in production logs',
    ],
    next_steps: [
      'Review this plan with the ops team',
      'Confirm resource availability for each step',
      'Set launch date and time',
      'Prepare deployment checklist',
      'Brief team on blockers and recovery procedures',
    ],
  };

  return plan;
}

function formatPlan(plan: LaunchPlan): string {
  let output = '';
  output += `# Launch Plan: ${plan.tenant_name}\n\n`;
  output += `**Slug:** \`${plan.tenant_slug}\`  \n`;
  output += `**Created:** ${plan.created_at}\n`;
  output += `**Total Time:** ${plan.total_time}\n\n`;

  output += `## Timeline\n${plan.timeline}\n\n`;

  output += `## 10-Step Launch Process\n\n`;

  for (const step of plan.steps) {
    output += `### Step ${step.step}: ${step.task}\n`;
    output += `**Owner:** ${step.owner} | **Time:** ${step.time} | **Gate:** ${step.gate}\n\n`;

    if (step.details && step.details.length > 0) {
      output += `**Activities:**\n`;
      for (const detail of step.details) {
        output += `- ${detail}\n`;
      }
      output += '\n';
    }

    if (step.blockers && step.blockers.length > 0) {
      output += `⚠️ **Known Blockers:**\n`;
      for (const blocker of step.blockers) {
        output += `- ${blocker}\n`;
      }
      output += '\n';
    }
  }

  output += `## Success Criteria\n`;
  for (const criterion of plan.success_criteria) {
    output += `${criterion}\n`;
  }

  output += `\n## Next Steps\n`;
  for (const step of plan.next_steps) {
    output += `- ${step}\n`;
  }

  return output;
}

async function main() {
  try {
    const { tenantSlug, output, dryRun } = parseArgs();

    if (!tenantSlug) {
      throw new Error('--tenant-slug is required');
    }

    console.log(`\n📋 Generating launch plan for: ${tenantSlug}`);

    const plan = generatePlan(tenantSlug);
    const formatted = formatPlan(plan);

    if (dryRun) {
      console.log('\n[DRY-RUN] Would generate plan:');
      console.log(formatted);
    } else if (output) {
      fs.writeFileSync(output, formatted);
      console.log(`\n✅ Launch plan saved to: ${output}`);
    } else {
      console.log('\n' + formatted);
    }

    console.log(`\n💡 To deploy this client, run:`);
    console.log(`   npm run client:deploy -- --tenant-slug ${tenantSlug}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}`);
    } else {
      console.error(`\n❌ Unknown error`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
