#!/usr/bin/env node
/**
 * n8n-income.js — Generate Bitcoin income workflows for Opsly
 * Usage: node scripts/n8n-income.js --strategy bitcoin-production
 */

const STRATEGIES = {
  'bitcoin-production': {
    name: 'Bitcoin Income Generator',
    nodes: [
      { name: 'Invoice Paid', type: 'n8n-nodes-base.webhook', path: 'btc-payment' },
      { name: 'Convert to BTC', type: 'n8n-nodes-base.httpRequest', url: 'https://api.bitcoin-exchange.com/v1/convert' },
      { name: 'Log Income', type: 'n8n-nodes-base.supabase', table: 'platform.btc_income' },
      { name: 'Notify Discord', type: 'n8n-nodes-base.discord', text: '💰 BTC earned: ${{$json.amount_btc}}' }
    ]
  },
  'cost-optimization': {
    name: 'LLM Cost Reducer',
    nodes: [
      { name: 'Usage Threshold', type: 'n8n-nodes-base.webhook', path: 'usage-alert' },
      { name: 'Route to Ollama', type: 'n8n-nodes-base.httpRequest', url: 'http://100.80.41.29:11434/api/generate' },
      { name: 'Log Savings', type: 'n8n-nodes-base.supabase', table: 'platform.usage_events' }
    ]
  },
  'auto-deploy': {
    name: 'Auto Deploy on Merge',
    nodes: [
      { name: 'GitHub Push', type: 'n8n-nodes-base.webhook', path: 'github-push' },
      { name: 'VPS Deploy', type: 'n8n-nodes-base.ssh', command: 'cd /opt/opsly && git pull && docker compose -f infra/docker-compose.platform.yml up -d' },
      { name: 'Notify Discord', type: 'n8n-nodes-base.discord', text: '🚀 Deployed to production' }
    ]
  }
};

const args = process.argv.slice(2);
const strategyArg = args.find(a => a.startsWith('--strategy='))?.split('=')[1] || 'bitcoin-production';
const strategy = STRATEGIES[strategyArg];

if (!strategy) {
  console.error('Unknown strategy:', strategyArg);
  process.exit(1);
}

console.log(JSON.stringify(strategy, null, 2));
console.log(`\n✅ Strategy "${strategyArg}" ready to import to n8n`);
console.log(`Next: curl -X POST https://n8n-smiletripcare.ops.smiletripcare.com/webhook/import-workflow -d @workflow.json`);
