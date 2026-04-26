import type { DetectedIntent, OutputChannel } from './types.js';

export interface FormattedApiPayload {
  content: string;
  intent: DetectedIntent;
  quality_score?: number;
  channel: OutputChannel;
}

export function formatResponse(
  content: string,
  channel: OutputChannel | undefined,
  meta: { intent: DetectedIntent; quality_score?: number }
): { content: string; formatted?: unknown } {
  if (channel === undefined) {
    return { content };
  }

  const ch = channel;

  if (ch === 'api') {
    const payload: FormattedApiPayload = {
      content,
      intent: meta.intent,
      quality_score: meta.quality_score,
      channel: 'api',
    };
    return { content: JSON.stringify(payload), formatted: payload };
  }

  if (ch === 'discord') {
    let body = content;
    if (body.length > 2000) {
      body = `${body.slice(0, 1990)}\n… *(truncado)*`;
    }
    return { content: body };
  }

  if (ch === 'portal_chat') {
    return { content };
  }

  if (ch === 'cursor') {
    const block = content.includes('#!/usr/bin/env bash')
      ? content
      : `#!/usr/bin/env bash\nset -euo pipefail\n\n# Generado por Opsly LLM Gateway\n${content}`;
    return { content: block };
  }

  if (ch === 'email') {
    const esc = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html><html><body><pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${esc}</pre></body></html>`;
    return { content: html };
  }

  return { content };
}
