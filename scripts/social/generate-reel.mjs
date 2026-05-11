#!/usr/bin/env node
// scripts/social/generate-reel.mjs
// Generates a daily Reel/Short caption using Claude AI and saves it to Supabase.
// Requires: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY)

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const FAMOUS_STREAMERS = [
  { name: 'Ibai Llanos', platform: 'Twitch', specialty: 'Esports, Gaming', language: 'es' },
  { name: 'Auronplay', platform: 'Twitch', specialty: 'Gaming, Variety', language: 'es' },
  { name: 'Pokimane', platform: 'Twitch', specialty: 'Gaming, Community', language: 'en' },
  { name: 'Valkyrae', platform: 'Twitch', specialty: 'Gaming, Entertainment', language: 'en' },
  { name: 'TheGrefG', platform: 'Twitch', specialty: 'Fortnite, Gaming', language: 'es' },
  { name: 'Spreen', platform: 'Twitch', specialty: 'Gaming, Content', language: 'es' },
];

export const OPSLY_THEMES = [
  'multi-tenant architecture',
  'infrastructure as code',
  'DevOps automation',
  'cloud scalability',
  'observability & monitoring',
  'API-first design',
  'real-time data pipelines',
  'distributed systems',
];

export const PROMPT_TEMPLATES = {
  streamer_reaction: `
    Genera un caption VIRAL de 30-50 palabras para un Reel de Instagram/Short de YouTube
    sobre "{streamer}" reaccionando a "{opsly_theme}".
    Lenguaje: {language}

    El caption debe:
    - Ser editorializado (opinión, humor, provocador)
    - Incluir un emoji relevante al inicio
    - Terminar con CTA (Call to Action): "#OpslyLife", "#DevOpsRevolution", o similar
    - Mezclar Twitch/Gaming con infraestructura tech

    Devuelve SOLO el caption, sin comillas ni explicación adicional.
  `,

  streamer_clip_mashup: `
    Eres un editor de Reels especializado en contenido "mashup" que mezcla:
    1. Clips de {streamer} (reacción, gameplay, moment épico)
    2. Visualización técnica de {opsly_theme} (gráficas, código, arquitectura)

    Crea un caption para este Reel que:
    - Tenga 25-40 palabras
    - Use idioma: {language}
    - Haga la conexión entre el "hype moment" del streamer y la feature técnica
    - Termine con hashtags: #Opsly #DevOps #{streamer_name}

    Devuelve SOLO el caption.
  `,

  education_entertaining: `
    Crea un caption educativo pero ENTRETENIDO para un Short que explica "{opsly_theme}".
    El formato:
    - Nivel: "explica como si hablaras en Twitch"
    - Lengua: {language}
    - Longitud: 35-50 palabras
    - Gancho inicial (primeros 3 palabras) debe ser intrigante: "Mira qué...", "No sabías que...", "La mayoría falla en..."

    Hashtags finales: #Opsly #Tech #{tema_simplificado}

    Devuelve SOLO el caption.
  `,
};

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateHashtags(theme, language, streamerName) {
  const base = ['#Opsly', '#DevOps', '#SaaS', '#CloudInfra', '#TechViral'];
  const langSpecific =
    language === 'es'
      ? ['#DevOpsEs', '#TechLatino', '#CódigoViral']
      : ['#DevOpsLife', '#CloudNative', '#TechTok'];
  const streamerHash = `#${streamerName.replace(/\s+/g, '')}`;
  const themeHash = `#${theme.split(' ')[0]}`;
  return [...base, ...langSpecific, streamerHash, themeHash];
}

export function getNextPublishTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString();
}

function buildPrompt(template, streamer, theme, language) {
  return template
    .replace('{streamer}', streamer.name)
    .replace('{opsly_theme}', theme)
    .replace('{language}', language)
    .replace('{streamer_name}', streamer.name.toLowerCase().replace(/\s+/g, ''))
    .replace('{tema_simplificado}', theme.split(' ')[0].toLowerCase());
}

export async function generateDailyReel(options = {}) {
  const streamer = options.streamer
    ? FAMOUS_STREAMERS.find((s) => s.name.toLowerCase().includes(options.streamer.toLowerCase())) ||
      pickRandom(FAMOUS_STREAMERS)
    : pickRandom(FAMOUS_STREAMERS);

  const theme = options.theme || pickRandom(OPSLY_THEMES);
  const language = options.language || (Math.random() < 0.66 ? 'es' : 'en');
  const template = pickRandom(Object.values(PROMPT_TEMPLATES));
  const finalPrompt = buildPrompt(template, streamer, theme, language);

  console.log(`Generando Reel...`);
  console.log(`Streamer: ${streamer.name} | Tema: ${theme} | Idioma: ${language}`);

  if (options.dryRun) {
    const caption = `[DRY RUN] ${streamer.name} x ${theme} (${language})`;
    const hashtags = generateHashtags(theme, language, streamer.name);
    const result = {
      id: 'dry-run',
      title: `${streamer.name} reacts to ${theme}`,
      caption,
      hashtags,
      status: 'draft',
    };
    console.log('Reel generado (dry-run):');
    console.log(`  Caption: ${caption}`);
    console.log(`  Hashtags: ${hashtags.join(' ')}`);
    return result;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: finalPrompt }],
  });

  const caption = message.content[0].text.trim();
  const hashtags = generateHashtags(theme, language, streamer.name);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('social_posts')
    .insert([
      {
        title: `${streamer.name} reacts to ${theme}`,
        description: `Viral Reel mashup: ${streamer.name} + Opsly ${theme}`,
        content_type: 'reel',
        language,
        platforms: ['instagram', 'tiktok', 'youtube'],
        caption,
        hashtags,
        streamer_featured: streamer.name,
        status: 'draft',
        scheduled_at: getNextPublishTime(),
      },
    ])
    .select();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  console.log('Reel creado:');
  console.log(`  Caption: ${caption}`);
  console.log(`  Hashtags: ${hashtags.join(' ')}`);
  console.log(`  ID: ${data[0].id}`);
  return data[0];
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''));
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  generateDailyReel({ dryRun }).catch((err) => {
    console.error('Error generando Reel:', err.message);
    process.exit(1);
  });
}
