#!/usr/bin/env node
// .agents/github-webhook-handler.ts
// GitHub webhook listener for auto-sync on main branch push
// Run: node .agents/github-webhook-handler.ts
// Or: systemctl enable opsly-webhook && systemctl start opsly-webhook

import { createServer } from 'http';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const REPO_PATH = process.env.REPO_PATH || '/opt/opsly';
const LOG_FILE = '/var/log/opsly-webhook.log';

function log(msg: string, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${msg}`;
  console.log(logLine);

  try {
    fs.appendFileSync(LOG_FILE, logLine + '\n');
  } catch (e) {
    // Silently fail if can't write log
  }
}

function verifySignature(payload: Buffer, signature: string): boolean {
  if (!SECRET) {
    log('WARNING: GITHUB_WEBHOOK_SECRET not set, skipping verification', 'WARN');
    return true;
  }

  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

async function handlePush(payload: any) {
  const ref = payload.ref; // refs/heads/main
  const branch = ref.split('/').pop();
  const commits = payload.commits || [];

  log(`Push to ${branch}: ${commits.length} commits`);

  if (branch !== 'main') {
    log(`Ignoring push to ${branch} (not main)`, 'DEBUG');
    return;
  }

  // Run sync script
  try {
    log('🔄 Triggering auto-sync...');
    const result = execSync(`cd ${REPO_PATH} && bash .agents/vps-auto-sync.sh 2>&1`, {
      encoding: 'utf8',
      timeout: 60000 // 60s timeout
    });
    log('✅ Sync completed:\n' + result);
  } catch (error: any) {
    log(`❌ Sync failed: ${error.message}`, 'ERROR');

    // Notify Discord on failure
    notifyDiscord({
      color: 16711680, // Red
      title: '❌ VPS Auto-Sync Failed',
      fields: [
        { name: 'Branch', value: branch, inline: true },
        { name: 'Error', value: error.message, inline: false },
        { name: 'Time', value: new Date().toISOString(), inline: true }
      ]
    });
  }
}

async function notifyDiscord(embed: any) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  try {
    const url = new URL(webhook);
    const https = require('https');

    const payload = JSON.stringify({ embeds: [embed] });
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(webhook, options, (res: any) => {
      res.on('data', () => {}); // Drain response
    });

    req.on('error', (e: any) => {
      log(`Discord notification failed: ${e.message}`, 'WARN');
    });

    req.write(payload);
    req.end();
  } catch (e: any) {
    log(`Failed to send Discord notification: ${e.message}`, 'WARN');
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;

      log(`Received ${event} event`, 'DEBUG');

      // Verify signature
      const payload = Buffer.from(body);
      if (!verifySignature(payload, signature || '')) {
        log('❌ Invalid webhook signature', 'ERROR');
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }

      const data = JSON.parse(body);

      // Handle push to main
      if (event === 'push') {
        await handlePush(data);
      }

      res.writeHead(200);
      res.end('OK');
    } catch (error: any) {
      log(`Error processing webhook: ${error.message}`, 'ERROR');
      res.writeHead(500);
      res.end('Internal error');
    }
  });
});

server.listen(PORT, () => {
  log(`🚀 GitHub webhook listener running on port ${PORT}`);
  log(`Set GitHub webhook URL to: http://100.120.151.91:${PORT}/webhook`);
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
