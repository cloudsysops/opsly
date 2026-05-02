#!/usr/bin/env node
/**
 * Slack notifications via webhook (Block Kit format)
 * Uso: node scripts/slack-notify.js <title> <message> <status> [channel]
 * Statuses: success (green), warning (yellow), error (red), info (blue)
 * Env: SLACK_WEBHOOK_URL (required), SLACK_CHANNEL (optional, defaults to #opsly-automation)
 */

const url = process.env.SLACK_WEBHOOK_URL?.trim();
if (!url) {
  console.warn('⚠️ SLACK_WEBHOOK_URL no definido — Slack notifications disabled');
  process.exit(0); // Non-fatal, allow other notifications
}

const title = process.argv[2] || 'Notification';
const message = process.argv[3] || '—';
const status = process.argv[4] || 'info';
const channel = process.argv[5] || process.env.SLACK_CHANNEL || '#opsly-automation';

// Color mapping for status
const colors = {
  success: '#2ecc71', // green
  warning: '#f39c12', // yellow
  error: '#e74c3c', // red
  info: '#3498db', // blue
};

const color = colors[status] || colors.info;

// Convert emoji titles for Slack context
const titleWithEmoji = title
  .replace('✅', ':white_check_mark:')
  .replace('🚀', ':rocket:')
  .replace('📊', ':bar_chart:')
  .replace('🚨', ':rotating_light:')
  .replace('⚙️', ':gear:')
  .replace('📍', ':round_pushpin:');

async function notify() {
  const body = {
    channel,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: titleWithEmoji,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}_`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Slack ${String(res.status)}: ${text.slice(0, 200)}`);
    }

    console.log('✅ Slack notification sent');
  } catch (e) {
    console.error('❌ Slack notification failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

notify();
