import { describe, it, expect, vi } from 'vitest';
import { generateAIContent, generateAIContentBilingual } from '../ai-content-generator.js';
import type { LLMClient } from '../../llm/client.js';
import type { AIGenerationParams } from '../../types.js';

// ─── Mock LLM output ──────────────────────────────────────────────────────────

const mockAIOutput = JSON.stringify({
  story_hook_es:
    'Opsly automatizó un deploy completo sin intervención humana hoy. Así funciona el futuro.',
  story_hook_en: 'Opsly ran a full deployment with zero human intervention today. This is the future.',
  call_to_action_es: 'Prueba Opsly gratis →',
  call_to_action_en: 'Try Opsly free →',
  image_prompt:
    'Futuristic server room with glowing blue AI nodes, dark background, cinematic lighting, 4K',
  reel_script: [
    { scene: 'Hook (0-3s)', copy: '¿Tu equipo sigue haciendo deploys manuales?', duration_sec: 3 },
    { scene: 'Problem', copy: 'Los errores humanos cuestan horas de rollback', duration_sec: 8 },
    { scene: 'Solution', copy: 'Opsly lo hace automático con agentes de IA', duration_sec: 12 },
    { scene: 'Proof', copy: '95% menos tiempo en operaciones de infra', duration_sec: 10 },
    { scene: 'CTA', copy: 'Únete a +200 equipos en opsly.io', duration_sec: 5 },
  ],
  captions: [
    {
      platform: 'instagram',
      es: 'Automatiza tu DevOps con IA. Opsly lo hace posible. #opsly #devops #automation',
      en: 'Automate your DevOps with AI. Opsly makes it possible. #opsly #devops #automation',
      hashtags: ['#opsly', '#devops', '#automation', '#aiagents', '#shipping'],
      characterCount: 72,
    },
    {
      platform: 'youtube',
      es: 'Mira cómo Opsly automatizó un deploy completo con agentes de IA #opsly #devops',
      en: 'Watch how Opsly automated a full deployment with AI agents #opsly #devops',
      hashtags: ['#opsly', '#devops', '#automation', '#aiagents', '#shipping'],
      characterCount: 73,
    },
    {
      platform: 'tiktok',
      es: 'POV: tu infra se gestiona sola 🤖 #opsly #devops #automation #fyp',
      en: 'POV: your infra manages itself 🤖 #opsly #devops #automation #fyp',
      hashtags: ['#opsly', '#devops', '#automation', '#aiagents', '#fyp'],
      characterCount: 65,
    },
  ],
});

function makeMockClient(response = mockAIOutput): LLMClient {
  return {
    complete: vi.fn().mockResolvedValue(response),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateAIContent', () => {
  const baseParams: AIGenerationParams = {
    topic: 'opsly',
    tenant_slug: 'test-tenant',
    language: 'es',
    platforms: ['instagram', 'youtube', 'tiktok'],
  };

  it('calls LLM client with system and user prompts', async () => {
    const client = makeMockClient();
    await generateAIContent(baseParams, client);
    expect(client.complete).toHaveBeenCalledOnce();
    const [system, user] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
    ];
    expect(system).toContain('Opsly');
    expect(user).toContain('opsly');
    expect(user).toContain('instagram');
  });

  it('returns a valid ContentDraft with state ready_to_copy', async () => {
    const draft = await generateAIContent(baseParams, makeMockClient());
    expect(draft.state).toBe('ready_to_copy');
    expect(draft.tenant_slug).toBe('test-tenant');
    expect(draft.story_hook).toBeTruthy();
    expect(draft.call_to_action).toBeTruthy();
    expect(draft.image_prompt).toBeTruthy();
    expect(draft.reel_script).toHaveLength(5);
  });

  it('reel_script total duration is within 30-90s', async () => {
    const draft = await generateAIContent(baseParams, makeMockClient());
    const totalSec = draft.reel_script!.reduce((s, sc) => s + sc.duration_sec, 0);
    expect(totalSec).toBeGreaterThanOrEqual(30);
    expect(totalSec).toBeLessThanOrEqual(90);
  });

  it('captions are generated for requested platforms', async () => {
    const draft = await generateAIContent(baseParams, makeMockClient());
    const platforms = draft.captions.map((c) => c.platform);
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('youtube');
    expect(platforms).toContain('tiktok');
  });

  it('uses English text when language is en', async () => {
    const draft = await generateAIContent({ ...baseParams, language: 'en' }, makeMockClient());
    expect(draft.story_hook).toContain('future'); // English hook
  });

  it('strips markdown code blocks from AI response', async () => {
    const wrapped = `\`\`\`json\n${mockAIOutput}\n\`\`\``;
    const draft = await generateAIContent(baseParams, makeMockClient(wrapped));
    expect(draft.story_hook).toBeTruthy();
  });

  it('throws on invalid JSON from LLM', async () => {
    const client = makeMockClient('not json at all');
    await expect(generateAIContent(baseParams, client)).rejects.toThrow(
      'AI response is not valid JSON'
    );
  });
});

describe('generateAIContent — topics', () => {
  it('uses technology topic system prompt', async () => {
    const client = makeMockClient();
    await generateAIContent(
      { topic: 'technology', tenant_slug: 't', language: 'es', platforms: ['instagram'] },
      client
    ).catch(() => {}); // may fail due to different mock shape — we only check the call
    const [system] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(system).toMatch(/tech|engineer|LLM/i);
  });

  it('uses motivation topic system prompt', async () => {
    const client = makeMockClient();
    await generateAIContent(
      { topic: 'motivation', tenant_slug: 't', language: 'es', platforms: ['instagram'] },
      client
    ).catch(() => {});
    const [system] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(system).toMatch(/founder|builder|mindset/i);
  });
});

describe('generateAIContentBilingual', () => {
  it('returns AIContentResult with both language captions', async () => {
    const result = await generateAIContentBilingual(
      {
        topic: 'opsly',
        tenant_slug: 'test-tenant',
        platforms: ['instagram', 'youtube', 'tiktok'],
      },
      makeMockClient()
    );

    expect(result.topic).toBe('opsly');
    expect(result.language).toBe('both');
    expect(result.story_hook).toBeTruthy();
    expect(result.reel_script.length).toBeGreaterThan(0);
    expect(result.captions[0]).toHaveProperty('es');
    expect(result.captions[0]).toHaveProperty('en');
  });
});
