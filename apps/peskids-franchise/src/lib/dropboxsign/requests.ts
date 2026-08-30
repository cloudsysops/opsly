import { getDropboxSignClient, getDropboxSignConfig, isDropboxSignConfigured } from "./client";
import { DocumentType } from "@prisma/client";

// Document templates for each document type
const DOCUMENT_TEMPLATES: Record<DocumentType, { title: string; message: string }> = {
  FDD_RECEIPT: {
    title: "Franchise Disclosure Document Receipt",
    message: "Please review and sign to acknowledge receipt of the Franchise Disclosure Document.",
  },
  FRANCHISE_AGREEMENT: {
    title: "Franchise Agreement",
    message: "Please review and sign the Franchise Agreement.",
  },
  TERRITORY_AGREEMENT: {
    title: "Territory Agreement",
    message: "Please review and sign the Territory Agreement.",
  },
  NDA: {
    title: "Non-Disclosure Agreement",
    message: "Please review and sign the Non-Disclosure Agreement.",
  },
  PRE_WORK_TERMS: {
    title: "Pre-Work Terms & Conditions",
    message: "Please review and sign the Pre-Work Terms & Conditions.",
  },
};

interface CreateSignatureRequestParams {
  documentType: DocumentType;
  signerEmail: string;
  signerName: string;
  templateId?: string;
  fileUrl?: string;
}

interface SignatureRequestResult {
  signatureRequestId: string;
  signerSignatureId: string;
  expiresAt: Date;
}

/**
 * Creates a signature request for a document
 */
export async function createSignatureRequest(
  params: CreateSignatureRequestParams
): Promise<SignatureRequestResult> {
  if (!isDropboxSignConfigured()) {
    console.log("[DEMO] Dropbox Sign not configured — returning mock signature request");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    return {
      signatureRequestId: "demo_sig_req_" + Date.now(),
      signerSignatureId: "demo_signer_" + Date.now(),
      expiresAt,
    };
  }

  const client = getDropboxSignClient();
  const config = getDropboxSignConfig();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DropboxSign = require("@dropbox/sign");
  const signatureRequestApi = new DropboxSign.SignatureRequestApi(client);

  const template = DOCUMENT_TEMPLATES[params.documentType];

  // Create the signer object
  const signer = {
    emailAddress: params.signerEmail,
    name: params.signerName,
    order: 0,
  };

  // Create the request based on whether we have a template or file
  let result;

  if (params.templateId) {
    // Use template-based signing
    const request = {
      templateIds: [params.templateId],
      subject: template.title,
      message: template.message,
      signers: [signer],
      testMode: config.testMode,
      clientId: config.clientId,
    };

    result = await signatureRequestApi.signatureRequestCreateEmbeddedWithTemplate(request);
  } else if (params.fileUrl) {
    // Use file-based signing
    const request = {
      fileUrl: [params.fileUrl],
      title: template.title,
      subject: template.title,
      message: template.message,
      signers: [signer],
      testMode: config.testMode,
      clientId: config.clientId,
    };

    result = await signatureRequestApi.signatureRequestCreateEmbedded(request);
  } else {
    throw new Error("Either templateId or fileUrl must be provided");
  }

  const signatureRequest = result.body.signatureRequest;
  const signature = signatureRequest.signatures[0];

  // Calculate expiration (30 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    signatureRequestId: signatureRequest.signatureRequestId,
    signerSignatureId: signature.signatureId,
    expiresAt,
  };
}

/**
 * Gets an embedded signing URL for a signature
 */
export async function getEmbeddedSignUrl(signatureId: string): Promise<string> {
  if (!isDropboxSignConfigured()) {
    console.log("[DEMO] Dropbox Sign not configured — returning mock sign URL");
    return "https://demo.dropboxsign.com/sign/" + signatureId;
  }

  const client = getDropboxSignClient();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DropboxSign = require("@dropbox/sign");
  const embeddedApi = new DropboxSign.EmbeddedApi(client);

  const result = await embeddedApi.embeddedSignUrl(signatureId);
  return result.body.embedded.signUrl;
}

/**
 * Cancels a signature request
 */
export async function cancelSignatureRequest(signatureRequestId: string): Promise<void> {
  if (!isDropboxSignConfigured()) {
    console.log("[DEMO] Dropbox Sign not configured — mock cancel for", signatureRequestId);
    return;
  }

  const client = getDropboxSignClient();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DropboxSign = require("@dropbox/sign");
  const signatureRequestApi = new DropboxSign.SignatureRequestApi(client);

  await signatureRequestApi.signatureRequestCancel(signatureRequestId);
}

/**
 * Gets the status of a signature request
 */
export async function getSignatureRequestStatus(signatureRequestId: string) {
  if (!isDropboxSignConfigured()) {
    console.log("[DEMO] Dropbox Sign not configured — returning mock status");
    return { signatureRequestId, isComplete: false, isDeclined: false, signatures: [{ statusCode: "awaiting_signature", signatureId: "demo" }] };
  }

  const client = getDropboxSignClient();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DropboxSign = require("@dropbox/sign");
  const signatureRequestApi = new DropboxSign.SignatureRequestApi(client);

  const result = await signatureRequestApi.signatureRequestGet(signatureRequestId);
  return result.body.signatureRequest;
}

/**
 * Sends a reminder for a signature request
 */
export async function sendSignatureReminder(
  signatureRequestId: string,
  email: string
): Promise<void> {
  if (!isDropboxSignConfigured()) {
    console.log("[DEMO] Dropbox Sign not configured — mock reminder to", email);
    return;
  }

  const client = getDropboxSignClient();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DropboxSign = require("@dropbox/sign");
  const signatureRequestApi = new DropboxSign.SignatureRequestApi(client);

  await signatureRequestApi.signatureRequestRemind(signatureRequestId, {
    emailAddress: email,
  });
}

/**
 * Downloads the signed document
 */
export async function downloadSignedDocument(
  signatureRequestId: string
): Promise<Buffer> {
  if (!isDropboxSignConfigured()) {
    console.log("[DEMO] Dropbox Sign not configured — returning empty PDF buffer");
    return Buffer.from("%PDF-1.4 demo document");
  }

  const client = getDropboxSignClient();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DropboxSign = require("@dropbox/sign");
  const signatureRequestApi = new DropboxSign.SignatureRequestApi(client);

  const result = await signatureRequestApi.signatureRequestFiles(
    signatureRequestId,
    { fileType: "pdf" }
  );

  return Buffer.from(result.body);
}
