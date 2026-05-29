import { describe, expect, it, vi } from 'vitest';

import {
  demoTenantConfigs,
} from '../../../packages/opsly-core/__tests__/fixtures/demo-tenants.js';
import { createConversationalRuntime } from '../src/runtime.js';
import type { TranscriptionPort } from '../src/ports.js';

describe('ConversationalRuntime', () => {
  it('routes Panini text to UPDATE_COLLECTION', async () => {
    const runtime = createConversationalRuntime({
      tenants: demoTenantConfigs,
      aiProvider: 'mock',
    });

    const response = await runtime.handle({
      channel: 'web',
      tenantSlug: 'panini-lab',
      messageType: 'text',
      content: 'update collection album 2026',
    });

    expect(response.ok).toBe(true);
    expect(response.intent).toBe('UPDATE_COLLECTION');
    expect(response.eventIds).toHaveLength(1);
  });

  it('routes Peskids text to REPORT_ABSENCE in shadow', async () => {
    const runtime = createConversationalRuntime({
      tenants: demoTenantConfigs,
      aiProvider: 'mock',
    });

    const response = await runtime.handle({
      channel: 'whatsapp',
      tenantSlug: 'peskids',
      sender: '+15551234567',
      messageType: 'text',
      content: 'report absence for Thiago',
    });

    expect(response.ok).toBe(true);
    expect(response.intent).toBe('REPORT_ABSENCE');
    expect(response.runtime.event?.status).toBe('accepted');
  });

  it('uses TranscriptionPort for audio before understand', async () => {
    const transcription: TranscriptionPort = {
      processText: async (text) => text,
      processAudio: vi.fn(async () => 'update collection from voice'),
      processImage: vi.fn(async () => 'image transcript'),
    };

    const runtime = createConversationalRuntime({
      tenants: demoTenantConfigs,
      aiProvider: 'mock',
      ports: { transcription },
    });

    await runtime.handle({
      channel: 'voice',
      tenantSlug: 'panini-lab',
      messageType: 'audio_url',
      content: 'https://example.com/audio.webm',
    });

    expect(transcription.processAudio).toHaveBeenCalledOnce();
  });

  it('core src has no domain hardcoding', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const srcRoot = join(fileURLToPath(new URL('../src', import.meta.url)));
    const forbidden = /panini|sticker|student|absence|peskids|smiletripcare/i;

    const walk = (dir: string): string[] => {
      const entries = readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(full);
        }
        return entry.name.endsWith('.ts') ? [full] : [];
      });
    };

    for (const file of walk(srcRoot)) {
      expect(readFileSync(file, 'utf8')).not.toMatch(forbidden);
    }
  });
});
