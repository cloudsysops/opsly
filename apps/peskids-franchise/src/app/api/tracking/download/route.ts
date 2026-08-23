import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ActivityType } from '@prisma/client';

export const dynamic = "force-dynamic";

// POST /api/tracking/download - Track document downloads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, documentName, source } = body;

    if (!fileName || !documentName) {
      return NextResponse.json(
        { error: 'fileName and documentName are required' },
        { status: 400 }
      );
    }

    // Check if user is logged in as a prospect
    const session = await auth();

    if (session?.user?.email && session.user.role === 'PROSPECT') {
      // Find the prospect
      const prospect = await db.prospect.findUnique({
        where: { email: session.user.email },
      });

      if (prospect) {
        // Log activity on prospect profile
        await db.prospectActivity.create({
          data: {
            prospectId: prospect.id,
            activityType: ActivityType.DOCUMENT_DOWNLOADED,
            description: `Downloaded "${documentName}"`,
            metadata: {
              fileName,
              fileType: fileType || 'pdf',
              source: source || 'website',
              downloadedAt: new Date().toISOString(),
            },
          },
        });

        console.log(`[Download Tracking] Prospect ${prospect.email} downloaded "${documentName}"`);
      }
    }

    // Also track in CustomEvent for analytics (visitor tracking)
    const visitorId = request.cookies.get('stc_visitor_id')?.value;
    const sessionId = request.cookies.get('stc_session_id')?.value;

    if (visitorId && sessionId) {
      await db.customEvent.create({
        data: {
          visitorId,
          sessionId,
          eventType: 'DOWNLOAD',
          eventName: 'pdf_download',
          eventCategory: 'engagement',
          pagePath: source || '/investment',
          fileName,
          fileType: fileType || 'pdf',
          metadata: {
            documentName,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking download:', error);
    // Don't fail the download if tracking fails
    return NextResponse.json({ success: true });
  }
}
