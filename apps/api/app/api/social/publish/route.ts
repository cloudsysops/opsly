// apps/api/app/api/social/publish/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { multiPlatformPublisher } from '@/lib/social/adapters/publisher';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { content_id, platforms, content } = (await request.json()) as {
      content_id: string;
      platforms: string[];
      content: Record<string, unknown>;
    };

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    // Publish to all platforms
    const results = await multiPlatformPublisher.publishToAll(
      content as Parameters<typeof multiPlatformPublisher.publishToAll>[0],
      platforms
    );

    // Store results in database
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Update scheduled_posts status
    for (const result of results) {
      if (result.success) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            published_url: result.url,
          })
          .eq('platform', result.platform)
          .eq('content_id', content_id);
      } else {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'failed' })
          .eq('platform', result.platform)
          .eq('content_id', content_id);
      }
    }

    return NextResponse.json({
      status: 'published',
      content_id,
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error('Publishing failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Publishing failed',
      },
      { status: 500 }
    );
  }
}
