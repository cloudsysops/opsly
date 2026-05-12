// Scheduler for delayed post publishing

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const ONE_HOUR_MS = 3600000;

export interface ScheduleJob {
  content_id: string;
  platforms: string[];
  scheduled_for: Date;
  content: {
    twitter?: { threads: string[]; hashtags: string[] };
    linkedin?: { title: string; body: string; tags: string[] };
    discord?: { content: string; embeds: Array<Record<string, unknown>> };
    slack?: { text: string; blocks: Array<Record<string, unknown>> };
  };
}

export class PostScheduler {
  private supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  async schedulePost(job: ScheduleJob): Promise<string> {
    const delay = Math.max(0, job.scheduled_for.getTime() - Date.now());

    console.warn(`📅 Scheduling post for ${job.scheduled_for.toISOString()}`);

    // Store in database with scheduled_at
    const { data, error } = await this.supabase
      .from('scheduled_posts')
      .insert({
        content_id: job.content_id,
        platforms: job.platforms,
        scheduled_at: job.scheduled_for.toISOString(),
        content: job.content,
        status: 'scheduled',
      })
      .select();

    if (error) {
      throw error;
    }

    const jobId = data?.[0]?.id as string;

    // In production, this would use BullMQ
    // For now, set a timeout (only if < 1 hour)
    if (delay < ONE_HOUR_MS) {
      setTimeout(() => {
        this.publishScheduledPost(jobId).catch(console.error);
      }, delay);
    }

    return jobId;
  }

  private async publishScheduledPost(jobId: string): Promise<void> {
    try {
      console.warn(`📤 Publishing scheduled post: ${jobId}`);

      const { data, error } = await this.supabase.from('scheduled_posts').select().eq('id', jobId);

      if (error || !data?.length) {
        console.error('Post not found:', jobId);
        return;
      }

      const post = data[0] as Record<string, unknown>;

      // Call publish endpoint
      const response = await fetch('http://localhost:3000/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: post.content_id,
          platforms: post.platforms,
          content: post.content,
        }),
      });

      if (!response.ok) {
        console.error('Publishing failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error publishing scheduled post:', error);
    }
  }

  async getScheduledPosts(limit = 30): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from('scheduled_posts')
      .select()
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching scheduled posts:', error);
      return [];
    }

    return data || [];
  }
}

export const postScheduler = new PostScheduler();
