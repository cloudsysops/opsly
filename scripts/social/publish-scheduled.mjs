#!/usr/bin/env node
// scripts/social/publish-scheduled.mjs
// Publishes scheduled social_posts to Instagram Reels, TikTok, and YouTube Shorts.
// Requires: SUPABASE_URL, SUPABASE_KEY, META_ACCESS_TOKEN, TIKTOK_ACCESS_TOKEN, YOUTUBE_API_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function publishToInstagram(post) {
  const response = await fetch('https://graph.instagram.com/v18.0/me/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: post.video_url,
      caption: `${post.caption}\n\n${post.hashtags.join(' ')}`,
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  });
  if (!response.ok) throw new Error(`Instagram API error: ${response.status}`);
  return response.json();
}

async function publishToTikTok(post) {
  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: post.title,
        description: `${post.caption}\n\n${post.hashtags.join(' ')}`,
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: post.video_url,
      },
    }),
  });
  if (!response.ok) throw new Error(`TikTok API error: ${response.status}`);
  return response.json();
}

async function publishToYouTube(post) {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.YOUTUBE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: post.title,
          description: `${post.caption}\n\n${post.hashtags.join(' ')}`,
          tags: post.hashtags,
          categoryId: '24',
        },
        status: { privacyStatus: 'public' },
      }),
    },
  );
  if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
  return response.json();
}

const PLATFORM_PUBLISHERS = {
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
  youtube: publishToYouTube,
};

async function updatePostStatus(postId, status, errorMsg) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  if (errorMsg) {
    updateData.engagement_metrics = { error: errorMsg };
  }
  const { error } = await supabase.from('social_posts').update(updateData).eq('id', postId);
  if (error) console.error(`Failed to update post ${postId}:`, error.message);
}

async function publishScheduledReels() {
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(5);

  if (error) {
    console.error('Error fetching scheduled posts:', error.message);
    process.exit(1);
  }

  console.log(`Publicando ${posts.length} Reels...`);

  for (const post of posts) {
    let allOk = true;
    for (const platform of post.platforms) {
      const publisher = PLATFORM_PUBLISHERS[platform];
      if (!publisher) {
        console.log(`Skipping unknown platform: ${platform}`);
        continue;
      }
      try {
        await publisher(post);
        console.log(`Publicado en ${platform}: ${post.id}`);
      } catch (err) {
        console.error(`Error en ${platform}: ${err.message}`);
        allOk = false;
      }
    }
    await updatePostStatus(post.id, allOk ? 'published' : 'failed', allOk ? null : 'partial failure');
  }
}

publishScheduledReels().catch((err) => {
  console.error('Error en publicación:', err.message);
  process.exit(1);
});
