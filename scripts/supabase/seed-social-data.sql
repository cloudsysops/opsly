-- Seed featured streamers
INSERT INTO featured_streamers (name, platform, description, active) VALUES
  ('Ibai Llanos', 'Twitch', 'Esports & Gaming commentator', true),
  ('Auronplay', 'Twitch', 'Gaming & variety content', true),
  ('Pokimane', 'Twitch', 'Gaming & community builder', true),
  ('Valkyrae', 'Twitch', 'Gaming & entertainment', true),
  ('TheGrefG', 'Twitch', 'Fortnite & competitive gaming', true),
  ('Spreen', 'Twitch', 'Gaming & content creator', true)
ON CONFLICT DO NOTHING;

-- Seed content templates
INSERT INTO content_templates (category, template_name, prompt_text, language) VALUES
  ('viral', 'streamer_reaction', 'Create viral caption for {streamer} reacting to {opsly_theme}. {language}. Add emoji, #OpslyLife', 'es'),
  ('viral', 'streamer_reaction', 'Create viral TikTok caption: {streamer} + {opsly_theme}. {language}. 30-50 words.', 'en'),
  ('educational', 'education_entertaining', 'Explain {opsly_theme} Twitch-style. {language}. 35-50 words. Hook: intriguing. End: #Opsly', 'es')
ON CONFLICT DO NOTHING;

-- Verify
SELECT COUNT(*) AS streamers_count FROM featured_streamers;
SELECT COUNT(*) AS templates_count FROM content_templates;
