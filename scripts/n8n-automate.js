#!/usr/bin/env node
/**
 * n8n-automate.js — Autonomous n8n expert mode for Opsly
 * Usage: node scripts/n8n-automate.js --tenant smiletripcare --mode expert
 */

const https = require('https');

async function automateN8n({ tenant, mode, strategies }) {
  const webhook = `https://n8n-${tenant}.ops.smiletripcare.com/webhook/n8n-expert`;
  
  const payload = {
    prompt: `Act as expert n8n autonomous agent for Opsly.
    
    Mission:
    1. Analyze .n8n/1-workflows/ in ${tenant}
    2. Optimize for maximum income (Bitcoin generation)
    3. Improve platform automation (scripts/hooks/workflows)
    4. Reduce LLM costs (route to Ollama when possible)
    5. Auto-commit improvements with docs(n8n): prefix
    
    Strategies: ${strategies.join(', ')}
    Context: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md`,
    tenant_slug: ${tenant},
    request_id: ${Date.now()}
  `};

  return new Promise((resolve, reject) => {
    const req = https.request(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// CLI
const args = process.argv.slice(2);
const tenant = args.find(a => a.startsWith('--tenant='))?.split('=')[1] || 'smiletripcare';
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'expert';
const strategies = (args.find(a => a.startsWith('--strategies='))?.split('=')[1] || 'bitcoin-production,cost-reduction').split(',');

automateN8n({ tenant, mode, strategies }).then(result => {
  console.log(`✅ n8n expert mode activated: ${result.status}`);
  console.log(result.data);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
