import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import {
  paniniLabTenantConfig,
} from '../../../apps/panini-lab/config/tenant.config.js';
import {
  peskidsTenantConfig,
} from '../../../apps/peskids/config/tenant.config.js';
import {
  smileTripCareTenantConfig,
} from '../../../apps/smiletripcare/config/tenant.config.js';
import {
  createOpslyCore,
  createAiGateway,
  createGeminiGateway,
  AiProviderNotConfiguredError,
} from '../src/index.js';
import { AgentRuntime } from '../src/agent-runtime/runtime.js';
import { EventBuilder } from '../src/event-builder/builder.js';
import type { TenantConfig } from '../src/types/index.js';
import { InMemoryEventLogStore } from '../src/observability/event-log.js';
import { createTenantRegistry } from '../src/tenant-config/registry.js';
import { MockWorkflowDispatcher } from '../src/workflow-dispatcher/dispatcher.js';

const demoTenants = [
  paniniLabTenantConfig,
  peskidsTenantConfig,
  smileTripCareTenantConfig,
] as const;

function createTestCore(eventLog = new InMemoryEventLogStore()) {
  return createOpslyCore({
    tenants: demoTenants,
    aiProvider: 'mock',
    eventLog,
  });
}

describe('Opsly OS Core MVP', () => {
  it('Panini UPDATE_COLLECTION (hackathon utterance)', async () => {
    const { runtime, eventLog } = createTestCore();

    const result = await runtime.handle({
      tenantSlug: 'panini-lab',
      utterance: 'Tengo la 10 de Colombia y repetida la 30',
    });

    expect(result.error).toBeUndefined();
    expect(result.event?.intent).toBe('UPDATE_COLLECTION');
    expect(result.event?.status).toBe('dispatched');

    const logged = await eventLog.listByTenant('panini-lab');
    expect(logged).toHaveLength(1);
    expect(logged[0]?.intent).toBe('UPDATE_COLLECTION');
  });

  it('Peskids REPORT_ABSENCE shadow (hackathon utterance)', async () => {
    const { runtime, eventLog } = createTestCore();

    const result = await runtime.handle({
      tenantSlug: 'peskids',
      utterance: 'Soy la mamá de Thiago, hoy no va a clase porque tiene fiebre',
    });

    expect(result.error).toBeUndefined();
    expect(result.event?.intent).toBe('REPORT_ABSENCE');
    expect(result.event?.status).toBe('accepted');

    const logged = await eventLog.listByTenant('peskids');
    expect(logged[0]?.metadata).toMatchObject({ mode: 'shadow' });
  });

  it('SmileTripCare CREATE_LEAD shadow (hackathon utterance)', async () => {
    const { runtime } = createTestCore();

    const result = await runtime.handle({
      tenantSlug: 'smiletripcare',
      utterance: 'Necesito una valoración dental',
    });

    expect(result.code).toBeUndefined();
    expect(result.event?.intent).toBe('CREATE_LEAD');
    expect(result.event?.status).toBe('accepted');
  });

  it('stub AI provider throws controlled error', async () => {
    const gateway = createAiGateway({ provider: 'openai' });
    const tenant = demoTenants[0];

    await expect(
      gateway.parseIntent(
        { tenantSlug: tenant.slug, utterance: 'hello' },
        tenant,
      ),
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
  });

  it('rejects intent not allowed for tenant', async () => {
    const strictTenant: TenantConfig = {
      slug: 'strict-demo',
      displayName: 'Strict Demo',
      mode: 'demo',
      allowedIntents: ['ALLOWED_ONLY'],
      intentKeywords: {
        BLOCKED_INTENT: ['blocked phrase only'],
      },
      intents: {
        ALLOWED_ONLY: {
          name: 'ALLOWED_ONLY',
          description: 'Allowed',
          workflow: { kind: 'internal', ref: 'allowed' },
        },
        BLOCKED_INTENT: {
          name: 'BLOCKED_INTENT',
          description: 'Blocked',
          workflow: { kind: 'internal', ref: 'blocked' },
        },
      },
    };

    const { runtime } = createOpslyCore({
      tenants: [strictTenant],
      aiProvider: 'mock',
    });

    const result = await runtime.handle({
      tenantSlug: 'strict-demo',
      utterance: 'blocked phrase only please',
    });

    expect(result.code).toBe('INTENT_NOT_ALLOWED');
    expect(result.event?.status).toBe('rejected');
  });

  it('returns UNKNOWN_TENANT for unknown slug', async () => {
    const { runtime } = createTestCore();

    const result = await runtime.handle({
      tenantSlug: 'does-not-exist',
      utterance: 'anything',
    });

    expect(result.code).toBe('UNKNOWN_TENANT');
    expect(result.event).toBeNull();
  });

  it('marks live events as failed when dispatch does not complete', async () => {
    const tenant: TenantConfig = {
      slug: 'live-demo',
      displayName: 'Live Demo',
      mode: 'live',
      allowedIntents: ['ESCALATE'],
      intentKeywords: {
        ESCALATE: ['escalate'],
      },
      intents: {
        ESCALATE: {
          name: 'ESCALATE',
          description: 'Escalate a live event',
          workflow: { kind: 'internal', ref: 'escalate-live' },
        },
      },
    };
    const eventLog = new InMemoryEventLogStore();
    const runtime = new AgentRuntime({
      registry: createTenantRegistry([tenant]),
      aiGateway: createAiGateway({ provider: 'mock' }),
      eventBuilder: new EventBuilder(),
      dispatcher: {
        dispatch: async () => ({
          workflowRef: 'escalate-live',
          dispatched: false,
          detail: 'downstream-offline',
        }),
      },
      eventLog,
    });

    const result = await runtime.handle({
      tenantSlug: tenant.slug,
      utterance: 'please escalate this',
    });

    expect(result.code).toBe('DISPATCH_FAILED');
    expect(result.event?.status).toBe('failed');
    await expect(eventLog.listByTenant(tenant.slug)).resolves.toEqual([
      expect.objectContaining({ status: 'failed' }),
    ]);
  });

  it('guards mock dispatches for unknown intents', async () => {
    const dispatcher = new MockWorkflowDispatcher();

    await expect(
      dispatcher.dispatch(
        {
          id: 'evt_1',
          requestId: 'req_1',
          tenantSlug: 'demo',
          intent: 'UNKNOWN_INTENT',
          payload: {},
          status: 'accepted',
          createdAt: new Date().toISOString(),
        },
        {
          slug: 'demo',
          displayName: 'Demo',
          mode: 'demo',
          allowedIntents: [],
          intents: {},
        },
      ),
    ).resolves.toEqual({
      workflowRef: '',
      dispatched: false,
      detail: 'unknown-intent',
    });
  });

  it('sends Gemini API keys via header instead of query params', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"intent":"UPDATE_COLLECTION","payload":{},"confidence":0.8}' }],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const gateway = createGeminiGateway({
      apiKey: 'test-key',
      fetchImpl,
    });

    await gateway.parseIntent(
      {
        tenantSlug: paniniLabTenantConfig.slug,
        utterance: 'update collection album 2026',
      },
      paniniLabTenantConfig,
    );

    const firstCall = fetchImpl.mock.calls[0] as unknown as
      | [string, RequestInit | undefined]
      | undefined;

    expect(firstCall).toBeDefined();

    const [url, init] = firstCall!;

    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    );
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': 'test-key',
      },
    });
  });

  it('core source has no tenant-specific business hardcoding', () => {
    const srcRoot = join(fileURLToPath(new URL('../src', import.meta.url)));
    const forbidden = /panini|peskids|smiletripcare|smile.?trip.?care/i;
    const files = collectTsFiles(srcRoot).filter((file) => !file.includes('/cli/'));

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content, `forbidden tenant reference in ${file}`).not.toMatch(forbidden);
    }
  });
});

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}
