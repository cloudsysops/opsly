import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSignatureRequest } from "@/lib/dropboxsign/requests";
import { isDropboxSignConfigured } from "@/lib/dropboxsign/client";
import { DocumentType, SignatureStatus } from "@prisma/client";

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

    const { documentType, templateId, fileUrl } = await request.json();

    if (!documentType || !Object.values(DocumentType).includes(documentType)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Get the prospect
    const prospect = await db.prospect.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Check if document already exists
    const existingDoc = await db.prospectDocument.findUnique({
      where: {
        prospectId_documentType: {
          prospectId: prospect.id,
          documentType: documentType as DocumentType,
        },
      },
    });

    // If already signed, don't allow re-signing
    if (existingDoc?.signatureStatus === SignatureStatus.SIGNED) {
      return NextResponse.json(
        { error: "Document has already been signed" },
        { status: 400 }
      );
    }

    // Create signature request with Dropbox Sign
    const result = await createSignatureRequest({
      documentType: documentType as DocumentType,
      signerEmail: prospect.email,
      signerName: `${prospect.firstName} ${prospect.lastName}`,
      templateId,
      fileUrl,
    });

    // Upsert the document record
    const document = await db.prospectDocument.upsert({
      where: {
        prospectId_documentType: {
          prospectId: prospect.id,
          documentType: documentType as DocumentType,
        },
      },
      update: {
        signatureRequestId: result.signatureRequestId,
        signatureStatus: SignatureStatus.SENT,
        sentAt: new Date(),
        expiresAt: result.expiresAt,
        signedAt: null,
        viewedAt: null,
      },
      create: {
        prospectId: prospect.id,
        documentType: documentType as DocumentType,
        signatureRequestId: result.signatureRequestId,
        signatureStatus: SignatureStatus.SENT,
        sentAt: new Date(),
        expiresAt: result.expiresAt,
      },
    });

    // Log the activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "DOCUMENT_SIGNED",
        description: `Signature request sent for ${documentType}`,
        metadata: {
          documentType,
          signatureRequestId: result.signatureRequestId,
          action: "sent",
        },
      },
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      signatureRequestId: result.signatureRequestId,
      signerSignatureId: result.signerSignatureId,
    });
  } catch (error) {
    console.error("Error creating signature request:", error);
    return NextResponse.json(
      { error: "Failed to create signature request" },
      { status: 500 }
    );
  }
}
