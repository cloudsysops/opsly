import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/franchisee/operations/manual/[pageId] - Get a single manual page with content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Access restricted to selected franchisees" },
        { status: 403 }
      );
    }

    const { pageId } = await params;

    const page = await db.manualPage.findUnique({
      where: { id: pageId },
      include: {
        section: {
          select: { id: true, title: true, icon: true },
        },
      },
    });

    if (!page || page.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check acknowledgment status
    const ack = await db.manualAcknowledgment.findUnique({
      where: {
        prospectId_pageId: {
          prospectId: prospect.id,
          pageId,
        },
      },
    });

    const acknowledged = ack
      ? ack.versionNumber >= page.currentVersion
      : false;

    // Get sibling pages for prev/next navigation
    const siblingPages = await db.manualPage.findMany({
      where: {
        sectionId: page.sectionId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const currentIndex = siblingPages.findIndex((p) => p.id === pageId);
    const prevPage = currentIndex > 0 ? siblingPages[currentIndex - 1] : null;
    const nextPage =
      currentIndex < siblingPages.length - 1
        ? siblingPages[currentIndex + 1]
        : null;

    return NextResponse.json({
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        excerpt: page.excerpt,
        requiresAcknowledgment: page.requiresAcknowledgment,
        currentVersion: page.currentVersion,
        updatedAt: page.updatedAt,
        section: page.section,
      },
      acknowledged,
      ackRecord: ack
        ? {
            pageId: ack.pageId,
            acknowledgedAt: ack.acknowledgedAt.toISOString(),
            isOutdated: ack.versionNumber < page.currentVersion,
          }
        : null,
      prevPage,
      nextPage,
    });
  } catch (error) {
    console.error("Error fetching manual page:", error);
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
  }
}
