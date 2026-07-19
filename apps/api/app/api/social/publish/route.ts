// apps/api/app/api/social/publish/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  multiPlatformPublisher,
  type ContentPayload,
  type PublishResult,
} from '../../../../lib/social/adapters/publisher';
import { capturePublishEvent, capturePublishError } from '../../../../lib/knowledge/syra-capture';
import { getServiceClient } from '../../../../lib/supabase';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { requireAdminAccess } from '../../../../lib/auth';

type PublishBody = {
  content_id: string;
  platforms: string[];
  content: ContentPayload;
  request_id?: string;
};

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: HTTP_STATUS.BAD_REQUEST });
}

function validatePublishBody(body: PublishBody): NextResponse | null {
  if (!body.content_id?.trim()) {
    return badRequest('content_id required');
  }
  if (!body.content) {
    return badRequest('Content required');
  }
  if (!body.platforms?.length) {
    return badRequest('platforms required');
  }
  return null;
}

async function syncScheduledPostsWithResults(
  results: PublishResult[],
  contentId: string,
  sessionRequestId: string | undefined
): Promise<void> {
  const supabase = getServiceClient().schema('platform');
  for (const result of results) {
    if (result.success) {
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          published_url: result.url,
          request_id: sessionRequestId,
        })
        .eq('platform', result.platform)
        .eq('content_id', contentId);
    } else {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', request_id: sessionRequestId })
        .eq('platform', result.platform)
        .eq('content_id', contentId);
    }
  }
}

function scheduleSuccessKnowledgeCapture(
  results: PublishResult[],
  platforms: string[],
  successCount: number
): void {
  if (successCount <= 0) {
    return;
  }
  void Promise.resolve()
    .then(() =>
      capturePublishEvent('social_media_published', platforms, {
        platforms_published: results
          .filter((r: PublishResult) => r.success)
          .map((r: PublishResult) => r.platform),
        total_posts: results.length,
        success_rate: successCount / results.length,
      })
    )
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Knowledge capture warning:', msg);
    });
}

function scheduleFailureKnowledgeCaptures(results: PublishResult[], contentId: string): void {
  for (const result of results) {
    const publishError = result.error;
    if (!result.success && publishError) {
      void Promise.resolve()
        .then(() => capturePublishError(result.platform, publishError, `Content ID: ${contentId}`))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('Knowledge capture warning:', msg);
        });
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError as unknown as NextResponse;
  }

  try {
    const body = (await request.json()) as PublishBody;
    const errResponse = validatePublishBody(body);
    if (errResponse) {
      return errResponse;
    }

    const { content_id: contentId, platforms, content, request_id: sessionRequestId } = body;
    const results = await multiPlatformPublisher.publishToAll(content, platforms);

    await syncScheduledPostsWithResults(results, contentId, sessionRequestId);

    const successCount = results.filter((r: PublishResult) => r.success).length;
    const failureCount = results.filter((r: PublishResult) => !r.success).length;

    scheduleSuccessKnowledgeCapture(results, platforms, successCount);
    scheduleFailureKnowledgeCaptures(results, contentId);

    return NextResponse.json({
      status: 'published',
      content_id: contentId,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Publishing failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Publishing failed',
      },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
