-- Migration: Social Reels & Shorts Automation Tables
-- Part of Opsly Social Media Automation (Syra extension)

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type VARCHAR(20) CHECK (content_type IN ('reel', 'short', 'post')),
  language VARCHAR(5) CHECK (language IN ('es', 'en', 'es-en')),
  platforms TEXT[] DEFAULT ARRAY['instagram', 'tiktok', 'youtube'],
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT NOT NULL,
  hashtags TEXT[],
  streamer_featured VARCHAR(100),
  duration_seconds INT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50),
  template_name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  language VARCHAR(5),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS featured_streamers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  platform VARCHAR(30),
  description TEXT,
  clip_urls TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_language ON social_posts(language);
