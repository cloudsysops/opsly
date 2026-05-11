#!/usr/bin/env node
// scripts/social/seed-data.mjs
// Seeds featured_streamers and content_templates into Supabase.
// Requires: SUPABASE_URL, SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const STREAMERS = [
  { name: 'Ibai Llanos', platform: 'Twitch', description: 'Esports & Gaming commentator' },
  { name: 'Auronplay', platform: 'Twitch', description: 'Gaming & variety content' },
  { name: 'Pokimane', platform: 'Twitch', description: 'Gaming & community builder' },
  { name: 'Valkyrae', platform: 'Twitch', description: 'Gaming & entertainment' },
  { name: 'TheGrefG', platform: 'Twitch', description: 'Fortnite & competitive gaming' },
  { name: 'Spreen', platform: 'Twitch', description: 'Gaming & content creator' },
];

const TEMPLATES = [
  {
    category: 'viral',
    template_name: 'streamer_reaction',
    prompt_text:
      'Create a viral Instagram Reel caption (30-50 words) where {streamer} reacts to {opsly_theme}. Language: {language}. Make it editorialized, add emoji, end with #OpslyLife or #DevOpsRevolution.',
    language: 'es',
  },
  {
    category: 'viral',
    template_name: 'streamer_reaction',
    prompt_text:
      'Create a viral TikTok caption (30-50 words) where {streamer} reacts to {opsly_theme}. Language: {language}. Make it edgy, funny, end with relevant hashtags.',
    language: 'en',
  },
  {
    category: 'educational',
    template_name: 'education_entertaining',
    prompt_text:
      'Explain {opsly_theme} like you are a Twitch streamer. 35-50 words. Language: {language}. Start with intriguing hook. End with #Opsly #{topic}',
    language: 'es',
  },
];

async function seedData() {
  console.log('Seeding featured_streamers...');
  const { error: streamerError } = await supabase
    .from('featured_streamers')
    .upsert(STREAMERS, { onConflict: 'name', ignoreDuplicates: true });

  if (streamerError) throw new Error(`Streamers: ${streamerError.message}`);
  console.log(`  ${STREAMERS.length} streamers inserted`);

  console.log('Seeding content_templates...');
  const { error: templateError } = await supabase
    .from('content_templates')
    .insert(TEMPLATES);

  if (templateError) throw new Error(`Templates: ${templateError.message}`);
  console.log(`  ${TEMPLATES.length} templates inserted`);

  console.log('Seed completed successfully');
}

seedData().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
