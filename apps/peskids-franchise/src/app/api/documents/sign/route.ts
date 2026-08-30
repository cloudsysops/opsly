import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmbeddedSignUrl } from "@/lib/dropboxsign/requests";
import { isDropboxSignConfigured } from "@/lib/dropboxsign/client";
import { SignatureStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isDropboxSignConfigured()) {
      return NextResponse.json(
        { error: "Document signing is not configured" },
        { status: 503 }
      );
    }

    const { documentId, signatureId } = await request.json();

    if (!documentId || !signatureId) {
      return NextResponse.json(
        { error: "Missing documentId or signatureId" },
        { status: 400 }
      );
    }

    // Verify the document belongs to this prospect
    const document = await db.prospectDocument.findFirst({
      where: {
        id: documentId,
        prospectId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if already signed
    if (document.signatureStatus === SignatureStatus.SIGNED) {
      return NextResponse.json(
        { error: "Document has already been signed" },
        { status: 400 }
      );
    }

    // Get embedded sign URL from Dropbox Sign
    const signUrl = await getEmbeddedSignUrl(signatureId);

    // Update document status to viewed
    if (document.signatureStatus === SignatureStatus.SENT) {
      await db.prospectDocument.update({
        where: { id: documentId },
        data: {
          signatureStatus: SignatureStatus.VIEWED,
          viewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      signUrl,
    });
  } catch (error) {
    console.error("Error getting sign URL:", error);
    return NextResponse.json(
      { error: "Failed to get signing URL" },
      { status: 500 }
    );
  }
}
