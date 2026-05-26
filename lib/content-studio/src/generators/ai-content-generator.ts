import { z } from 'zod';
import type { LLMClient } from '../llm/client.js';
import type {
  AIGenerationParams,
  AIContentResult,
  BilingualCaption,
  ContentDraft,
  ReelScene,
} from '../types.js';

// ─── Zod schema for structured AI output ─────────────────────────────────────

const ReelSceneSchema = z.object({
  scene: z.string(),
  copy: z.string(),
  duration_sec: z.number().int().min(3).max(30),
});

const BilingualCaptionSchema = z.object({
  platform: z.string(),
  es: z.string(),
  en: z.string(),
  hashtags: z.array(z.string()),
  characterCount: z.number().int(),
});

const AIOutputSchema = z.object({
  story_hook_es: z.string().max(300),
  story_hook_en: z.string().max(300),
  call_to_action_es: z.string().max(120),
  call_to_action_en: z.string().max(120),
  image_prompt: z.string().max(500),
  reel_script: z.array(ReelSceneSchema).min(2).max(8),
  captions: z.array(BilingualCaptionSchema),
});

type AIOutput = z.infer<typeof AIOutputSchema>;

// ─── Topic prompts ────────────────────────────────────────────────────────────

const topicSystem: Record<AIGenerationParams['topic'], string> = {
  opsly: `You are a social media content creator for Opsly — an AI-powered DevOps automation platform that helps engineering teams ship faster with autonomous agents, LLM orchestration, and multi-tenant SaaS infrastructure. Your tone is technical yet approachable. You celebrate shipping, automation wins, and engineering excellence. Never mention competitors.`,

  technology: `You are a tech content creator who makes complex engineering and AI topics accessible and inspiring. You cover topics like: LLMs in production, agent architectures, DevOps automation, cloud infrastructure, open source, and the future of software engineering. Your tone is knowledgeable, curious, and forward-thinking.`,

  motivation: `You are a content creator for founders, engineers, and builders. Your content is about the mindset required to build great products: resilience, focus, shipping under constraints, learning fast, and the joy of creation. Your tone is authentic, energetic, and personal — not generic motivational fluff. Think Pieter Levels, Naval, or Paul Graham in short-video format.`,
};

const topicHashtags: Record<AIGenerationParams['topic'], string[]> = {
  opsly: [
    '#opsly',
    '#devops',
    '#automation',
    '#aiagents',
    '#shipping',
    '#engineering',
    '#saas',
    '#platformengineering',
  ],
  technology: [
    '#tech',
    '#engineering',
    '#ai',
    '#llm',
    '#softwareengineering',
    '#opensource',
    '#devtools',
    '#futureofwork',
  ],
  motivation: [
    '#buildinpublic',
    '#founder',
    '#solofounder',
    '#maker',
    '#shipping',
    '#mindset',
    '#entrepreneur',
    '#indiehacker',
  ],
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildUserPrompt(params: AIGenerationParams): string {
  const platforms = params.platforms?.length ? params.platforms : ['instagram', 'youtube', 'tiktok'];
  const hashtags = topicHashtags[params.topic].join(' ');
  const contextBlock = params.context ? `\n\nAdditional context: ${params.context}` : '';
  const tone = params.tone ?? 'friendly';

  return `Generate social media content for the topic: **${params.topic}**.
Tone: ${tone}.${contextBlock}

Create content for these platforms: ${platforms.join(', ')}.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "story_hook_es": "<hook opening in Spanish, ≤150 chars>",
  "story_hook_en": "<hook opening in English, ≤150 chars>",
  "call_to_action_es": "<closing CTA in Spanish, ≤80 chars>",
  "call_to_action_en": "<closing CTA in English, ≤80 chars>",
  "image_prompt": "<detailed DALL-E/Midjourney prompt for a visual that matches this content, ≤300 chars>",
  "reel_script": [
    { "scene": "Hook (0-3s)", "copy": "<copy text for this scene>", "duration_sec": 3 },
    { "scene": "Problem/Context", "copy": "<copy text>", "duration_sec": 8 },
    { "scene": "Solution/Insight", "copy": "<copy text>", "duration_sec": 12 },
    { "scene": "Proof/Example", "copy": "<copy text>", "duration_sec": 10 },
    { "scene": "CTA (last 5s)", "copy": "<closing copy>", "duration_sec": 5 }
  ],
  "captions": [
    ${platforms.map((p) => `{ "platform": "${p}", "es": "<caption in Spanish with hashtags ${hashtags}>", "en": "<caption in English with hashtags ${hashtags}>", "hashtags": ${JSON.stringify(topicHashtags[params.topic].slice(0, 5))}, "characterCount": 0 }`).join(',\n    ')}
  ]
}

Rules:
- characterCount for each caption must equal the actual length of the longer caption (es or en)
- reel_script total duration must be between 30 and 90 seconds
- captions must include relevant hashtags naturally
- Content must feel authentic, not corporate or generic
- Do NOT wrap the JSON in markdown code blocks`;
}

// ─── Parse and validate AI response ──────────────────────────────────────────

function parseAIResponse(raw: string): AIOutput {
  // Strip markdown code blocks if model adds them despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI response is not valid JSON. Got: ${cleaned.slice(0, 200)}`);
  }

  // Fix characterCount (the model often sets it to 0)
  if (parsed && typeof parsed === 'object' && 'captions' in parsed) {
    const p = parsed as Record<string, unknown>;
    if (Array.isArray(p.captions)) {
      p.captions = p.captions.map((cap: Record<string, unknown>) => ({
        ...cap,
        characterCount: Math.max(
          String(cap.es ?? '').length,
          String(cap.en ?? '').length
        ),
      }));
    }
  }

  return AIOutputSchema.parse(parsed);
}

// ─── Map AI output → ContentDraft ────────────────────────────────────────────

function mapToDraft(
  output: AIOutput,
  params: AIGenerationParams,
  draftId: string
): ContentDraft {
  const lang = params.language;
  const storyHook = lang === 'en' ? output.story_hook_en : output.story_hook_es;
  const cta = lang === 'en' ? output.call_to_action_en : output.call_to_action_es;

  const captions = output.captions.map((cap: BilingualCaption) => ({
    platform: cap.platform,
    text: lang === 'en' ? cap.en : cap.es,
    hashtags: cap.hashtags,
    characterCount: lang === 'en' ? cap.en.length : cap.es.length,
  }));

  const copyKit: ContentDraft['copy_paste_kit'] = {
    instagram_caption: findCaption(output.captions, 'instagram', lang),
    facebook_caption: findCaption(output.captions, 'facebook', lang),
    linkedin_caption: findCaption(output.captions, 'linkedin', lang),
    x_caption: findCaption(output.captions, 'x', lang),
    tiktok_script: findCaption(output.captions, 'tiktok', lang),
    youtube_shorts_script: findCaption(output.captions, 'youtube', lang),
  };

  return {
    id: draftId,
    tenant_slug: params.tenant_slug,
    event_id: `ai-${params.topic}-${Date.now()}`,
    title: titleForTopic(params.topic, lang),
    story_hook: storyHook,
    captions,
    image_prompt: output.image_prompt,
    reel_script: output.reel_script as ReelScene[],
    call_to_action: cta,
    compliance_flags: [],
    state: 'ready_to_copy',
    created_at: new Date().toISOString(),
    copy_paste_kit: copyKit,
  };
}

function findCaption(
  caps: BilingualCaption[],
  platform: string,
  lang: 'es' | 'en' | 'both'
): string {
  const cap = caps.find((c) => c.platform === platform);
  if (!cap) return '';
  return lang === 'en' ? cap.en : cap.es;
}

function titleForTopic(topic: AIGenerationParams['topic'], lang: 'es' | 'en' | 'both'): string {
  const titles: Record<AIGenerationParams['topic'], { es: string; en: string }> = {
    opsly: { es: 'Contenido Opsly', en: 'Opsly Content' },
    technology: { es: 'Tecnología', en: 'Technology Insight' },
    motivation: { es: 'Motivación Builder', en: 'Builder Motivation' },
  };
  return lang === 'en' ? titles[topic].en : titles[topic].es;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate AI-powered content for a given topic.
 *
 * @example
 * const client = createLLMClient();
 * const draft = await generateAIContent(
 *   { topic: 'opsly', tenant_slug: 'acme', language: 'both', platforms: ['instagram', 'youtube', 'tiktok'] },
 *   client
 * );
 */
export async function generateAIContent(
  params: AIGenerationParams,
  client: LLMClient
): Promise<ContentDraft> {
  const system = topicSystem[params.topic];
  const user = buildUserPrompt(params);

  const raw = await client.complete(system, user, 2048);
  const output = parseAIResponse(raw);

  const draftId = `ai-${params.topic}-${params.tenant_slug}-${Date.now()}`;
  return mapToDraft(output, params, draftId);
}

/**
 * Generate content and return full bilingual result (both es and en).
 * Useful when you want to keep both language versions.
 */
export async function generateAIContentBilingual(
  params: Omit<AIGenerationParams, 'language'>,
  client: LLMClient
): Promise<AIContentResult> {
  const fullParams: AIGenerationParams = { ...params, language: 'both' };
  const system = topicSystem[params.topic];
  const user = buildUserPrompt(fullParams);

  const raw = await client.complete(system, user, 2048);
  const output = parseAIResponse(raw);

  return {
    topic: params.topic,
    language: 'both',
    story_hook: output.story_hook_es, // primary (es)
    call_to_action: output.call_to_action_es,
    image_prompt: output.image_prompt,
    reel_script: output.reel_script as ReelScene[],
    captions: output.captions,
  };
}
