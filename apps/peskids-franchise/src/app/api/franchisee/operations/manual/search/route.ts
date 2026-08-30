import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/operations/manual/search?q=term - Search published manual pages
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify franchisee access
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    if (prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json(
        { error: 'Access restricted to selected franchisees' },
        { status: 403 }
      );
    }

    const q = request.nextUrl.searchParams.get('q');

    if (!q || q.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const searchTerm = q.trim();

    const pages = await db.manualPage.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
          { excerpt: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: 20,
    });

    return NextResponse.json({
      results: pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        section: p.section,
        currentVersion: p.currentVersion,
        publishedAt: p.publishedAt,
      })),
      query: searchTerm,
      count: pages.length,
    });
  } catch (error) {
    console.error('Error searching manual pages:', error);
    return NextResponse.json(
      { error: 'Failed to search pages' },
      { status: 500 }
    );
  }
}
