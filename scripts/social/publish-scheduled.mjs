#!/usr/bin/env node
// scripts/social/publish-scheduled.mjs
// Publishes scheduled social_posts to Instagram Reels, TikTok, and YouTube Shorts.
// Requires: SUPABASE_URL, SUPABASE_KEY, META_ACCESS_TOKEN, TIKTOK_ACCESS_TOKEN, YOUTUBE_API_KEY

import { createClient } from '@supabase/supabase-js';

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

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

async function updatePostStatus(supabase, postId, status, errorMsg) {
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

export async function publishScheduledReels(options = {}) {
  const supabase = getSupabase();

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(5);

  if (error) {
    throw new Error(`Error fetching scheduled posts: ${error.message}`);
  }

  console.log(`Publicando ${posts.length} Reels...`);
  const results = [];

  for (const post of posts) {
    let allOk = true;
    const postResults = { id: post.id, platforms: {} };

    for (const platform of post.platforms) {
      const publisher = PLATFORM_PUBLISHERS[platform];
      if (!publisher) {
        console.log(`Skipping unknown platform: ${platform}`);
        continue;
      }

      if (options.dryRun) {
        console.log(`[DRY RUN] Would publish to ${platform}: ${post.id}`);
        postResults.platforms[platform] = 'dry-run';
        continue;
      }

      try {
        await publisher(post);
        console.log(`Publicado en ${platform}: ${post.id}`);
        postResults.platforms[platform] = 'ok';
      } catch (err) {
        console.error(`Error en ${platform}: ${err.message}`);
        postResults.platforms[platform] = err.message;
        allOk = false;
      }
    }

    if (!options.dryRun) {
      await updatePostStatus(
        supabase,
        post.id,
        allOk ? 'published' : 'failed',
        allOk ? null : 'partial failure',
      );
    }
    results.push(postResults);
  }

  return results;
}

export async function listPosts(options = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('social_posts')
    .select('id, title, caption, status, language, streamer_featured, scheduled_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error listing posts: ${error.message}`);
  return data;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''));
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  publishScheduledReels({ dryRun }).catch((err) => {
    console.error('Error en publicacion:', err.message);
    process.exit(1);
  });
}
