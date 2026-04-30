#!/usr/bin/env node
/**
 * Test script to simulate growth-outreach.sh --dry-run
 * Shows what emails would be generated for all 15 tier-1 targets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetsFile = path.join(__dirname, '../data/growth/tier1-targets.json');

// Read targets
const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf-8'));

console.log('=' .repeat(80));
console.log('Growth Week 1 Agencias Outreach — DRY-RUN EMAIL PREVIEW');
console.log('=' .repeat(80));
console.log(`\nLoaded ${targets.length} target contacts\n`);

targets.forEach((target, idx) => {
  const { name, email, company, specialization } = target;
  const subject = `Hey ${name}, Opsly automates your ${specialization} workflows`;

  console.log(`\n[${'─'.repeat(76)}]`);
  console.log(`[${idx + 1}/${targets.length}] ${name} <${email}>`);
  console.log(`     Company: ${company} | Specialization: ${specialization}`);
  console.log(`['─'.repeat(76)]`);
  console.log(`\nSubject:\n  ${subject}\n`);
  console.log(`Body Preview:\n`);

  const bodyPreview = `  Hi ${name},

  I've been following what ${company} does, and I think Opsly could save your
  team significant time on ${specialization} workflows.

  We work with agencies like yours to automate repetitive tasks—everything from
  lead qualification to client onboarding. The result? Your team focuses on
  high-impact work, not manual processes.

  Here's what we've seen:
  - 40+ hours/month saved per team member
  - 70% faster client onboarding
  - Fewer manual errors

  Would you be open to a 15-min demo?

  Demo link: https://ops.smiletripcare.com/demo

  Best,
  Opsly Growth Team`;

  console.log(bodyPreview);
  console.log('\n');
});

console.log('=' .repeat(80));
console.log('SUMMARY');
console.log('=' .repeat(80));
console.log(`✓ Total emails ready to send: ${targets.length}`);
console.log(`✓ Template version: 1.0`);
console.log(`✓ Expected conversion rate: 20%`);
console.log(`✓ Projected ARPU per tenant: $299`);
console.log(`✓ Expected weekly revenue if all convert: $${(targets.length * 0.2 * 299).toFixed(2)}`);
console.log('\nTo send for real, run:');
console.log('  doppler run --project ops-intcloudsysops --config prd -- ./scripts/growth-outreach.sh\n');
