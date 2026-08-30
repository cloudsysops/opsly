import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { syncManualPageToKnowledgeBase } from "@/lib/knowledge-base/pipeline";

export const dynamic = 'force-dynamic';

// POST /api/admin/operations/manual/pages/[id]/publish - Publish a page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.manualPage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (existing.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Page is already published' },
        { status: 400 }
      );
    }

    const page = await db.manualPage.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: session.user.email,
      },
    });

    console.log(
      `[Manual] Page "${page.title}" published by ${session.user.email}`
    );

    // Sync to RAG knowledge base for Earl AI
    syncManualPageToKnowledgeBase(id).catch(console.error);

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        title: page.title,
        status: page.status,
        publishedAt: page.publishedAt,
        publishedBy: page.publishedBy,
      },
    });
  } catch (error) {
    console.error('Error publishing manual page:', error);
    return NextResponse.json(
      { error: 'Failed to publish page' },
      { status: 500 }
    );
  }
}
