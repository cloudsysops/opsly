-- Seed data for social media automation tables.
-- Run after migration 0053: psql $SUPABASE_DATABASE_URL < scripts/supabase/seed-social-data.sql

INSERT INTO featured_streamers (name, platform, description) VALUES
  ('Ibai Llanos', 'Twitch', 'Esports & Gaming'),
  ('Auronplay', 'Twitch', 'Gaming & Variety'),
  ('Pokimane', 'Twitch', 'Gaming & Community'),
  ('Valkyrae', 'Twitch', 'Gaming & Entertainment'),
  ('TheGrefG', 'Twitch', 'Fortnite & Gaming'),
  ('Spreen', 'Twitch', 'Gaming & Content')
ON CONFLICT DO NOTHING;

INSERT INTO content_templates (category, template_name, prompt_text, language, tags) VALUES
  ('viral', 'streamer_reaction',
   'Genera un caption VIRAL de 30-50 palabras para un Reel sobre "{streamer}" reaccionando a "{opsly_theme}". Lenguaje: {language}. Incluir emoji al inicio, terminar con CTA.',
   'es', ARRAY['viral', 'streamer', 'reaction']),
  ('viral', 'streamer_reaction',
   'Generate a VIRAL 30-50 word caption for a Reel about "{streamer}" reacting to "{opsly_theme}". Include emoji at start, end with CTA.',
   'en', ARRAY['viral', 'streamer', 'reaction']),
  ('viral', 'streamer_clip_mashup',
   'Create a 25-40 word caption mashup: clips de {streamer} + visualizacion tecnica de {opsly_theme}. Idioma: {language}. Hashtags: #Opsly #DevOps #{streamer_name}.',
   'es', ARRAY['mashup', 'clip', 'technical']),
  ('educational', 'education_entertaining',
   'Caption educativo estilo Twitch sobre "{opsly_theme}". 35-50 palabras. Gancho intrigante. Hashtags: #Opsly #Tech #{tema_simplificado}.',
   'es', ARRAY['educational', 'tutorial', 'twitch']),
  ('educational', 'education_entertaining',
   'Educational Twitch-style caption about "{opsly_theme}". 35-50 words. Intriguing hook. Hashtags: #Opsly #Tech #{tema_simplificado}.',
   'en', ARRAY['educational', 'tutorial', 'twitch'])
ON CONFLICT DO NOTHING;
