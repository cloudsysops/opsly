import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SignatureStatus } from "@prisma/client";
import { getDropboxSignConfig } from "@/lib/dropboxsign/client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Dropbox Sign webhook event types
type WebhookEventType =
  | "signature_request_sent"
  | "signature_request_viewed"
  | "signature_request_signed"
  | "signature_request_declined"
  | "signature_request_expired"
  | "signature_request_all_signed"
  | "signature_request_canceled";

interface WebhookEvent {
  event: {
    event_type: WebhookEventType;
    event_time: string;
  };
  signature_request: {
    signature_request_id: string;
    signatures: Array<{
      signature_id: string;
      signer_email_address: string;
      status_code: string;
      signed_at?: string;
    }>;
  };
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  const config = getDropboxSignConfig();
  if (!config.webhookSecret) {
    console.warn("Dropbox Sign webhook secret not configured");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Handle initial webhook verification (Hello World test)
    if (body.includes("event_type")) {
      const parsedBody = JSON.parse(body);
      if (parsedBody.event?.event_type === "callback_test") {
        // Return the event_hash for verification
        return new NextResponse(parsedBody.event?.event_hash || "Hello API Event Received", {
          status: 200,
        });
      }
    }

    // Verify webhook signature in production
    const signature = request.headers.get("x-dropbox-signature") || "";
    if (process.env.NODE_ENV === "production" && signature) {
      if (!verifyWebhookSignature(body, signature)) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event: WebhookEvent = JSON.parse(body);
    const eventType = event.event.event_type;
    const signatureRequestId = event.signature_request.signature_request_id;

    console.log(`Dropbox Sign webhook: ${eventType} for ${signatureRequestId}`);

    // Find the document by signature request ID
    const document = await db.prospectDocument.findFirst({
      where: { signatureRequestId },
      include: {
        prospect: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      console.warn(`Document not found for signature request: ${signatureRequestId}`);
      // Return 200 to acknowledge receipt even if we don't have the document
      return NextResponse.json({ received: true });
    }

    // Map webhook event to signature status
    let newStatus: SignatureStatus | null = null;
    const updateData: {
      signatureStatus?: SignatureStatus;
      viewedAt?: Date;
      signedAt?: Date;
      acknowledgedAt?: Date;
    } = {};

    switch (eventType) {
      case "signature_request_viewed":
        newStatus = SignatureStatus.VIEWED;
        updateData.signatureStatus = newStatus;
        updateData.viewedAt = new Date();
        break;

      case "signature_request_signed":
      case "signature_request_all_signed":
        newStatus = SignatureStatus.SIGNED;
        updateData.signatureStatus = newStatus;
        updateData.signedAt = new Date();
        updateData.acknowledgedAt = new Date();
        break;

      case "signature_request_declined":
        newStatus = SignatureStatus.DECLINED;
        updateData.signatureStatus = newStatus;
        break;

      case "signature_request_expired":
        newStatus = SignatureStatus.EXPIRED;
        updateData.signatureStatus = newStatus;
        break;

      case "signature_request_canceled":
        newStatus = SignatureStatus.ERROR;
        updateData.signatureStatus = newStatus;
        break;
    }

    // Update document status if we have a status change
    if (newStatus && Object.keys(updateData).length > 0) {
      await db.prospectDocument.update({
        where: { id: document.id },
        data: updateData,
      });

      // Log the activity
      await db.prospectActivity.create({
        data: {
          prospectId: document.prospectId,
          activityType: "DOCUMENT_SIGNED",
          description: `Document ${document.documentType} ${eventType.replace("signature_request_", "")}`,
          metadata: {
            documentType: document.documentType,
            signatureRequestId,
            eventType,
            status: newStatus,
          },
        },
      });

      // Send notification email for signed documents
      if (newStatus === SignatureStatus.SIGNED) {
        // Fire and forget notification
        notifyDocumentSigned(document.prospect, document.documentType).catch(
          console.error
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Return 200 anyway to prevent retries for parsing errors
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

// Handle GET for webhook URL verification
export async function GET(request: NextRequest) {
  // Dropbox Sign may send a GET request to verify the webhook URL
  return new NextResponse("Webhook endpoint active", { status: 200 });
}

// Import notification function (avoiding circular dependency)
async function notifyDocumentSigned(
  prospect: { id: string; email: string; firstName: string; lastName: string },
  documentType: string
) {
  try {
    const { sendEmail } = await import("@/lib/email/sendgrid");

    // Email to prospect
    await sendEmail({
      to: prospect.email,
      subject: `Document Signed: ${documentType.replace(/_/g, " ")}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D2F8E;">Document Signed Successfully</h2>
          <p>Hi ${prospect.firstName},</p>
          <p>Thank you for signing the ${documentType.replace(/_/g, " ")}. We have received your signed document.</p>
          <p>You can view your signed documents in your prospect portal at any time.</p>
          <p>Best regards,<br>Acme Franchise Franchising Team</p>
        </div>
      `,
    });

    // Email to admins
    const ADMIN_EMAILS = [
      "franchising@acmefranchise.com",
      "admin@acmefranchise.com",
    ];

    await sendEmail({
      to: ADMIN_EMAILS,
      subject: `[STC] Document Signed: ${prospect.firstName} ${prospect.lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D2F8E;">Document Signed</h2>
          <p><strong>${prospect.firstName} ${prospect.lastName}</strong> has signed the ${documentType.replace(/_/g, " ")}.</p>
          <p>Email: ${prospect.email}</p>
          <p><a href="${process.env.NEXTAUTH_URL}/admin/prospects/${prospect.id}">View Prospect</a></p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending document signed notification:", error);
  }
}
