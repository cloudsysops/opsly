import { DocumentType } from "@prisma/client";

interface EmailTemplate {
  subject: string;
  html: string;
}

interface DocumentEmailParams {
  prospectName: string;
  prospectEmail: string;
  documentType: DocumentType;
  portalUrl: string;
}

const DOCUMENT_TITLES: Record<DocumentType, string> = {
  FDD_RECEIPT: "Franchise Disclosure Document",
  FRANCHISE_AGREEMENT: "Franchise Agreement",
  TERRITORY_AGREEMENT: "Territory Agreement",
  NDA: "Non-Disclosure Agreement",
  PRE_WORK_TERMS: "Pre-Work Terms & Conditions",
};

const BASE_STYLES = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2D2F8E 0%, #6A469D 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #2D2F8E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
`;

/**
 * Email sent when a signature request is created
 */
export function getSignatureRequestEmail(params: DocumentEmailParams): EmailTemplate {
  const documentTitle = DOCUMENT_TITLES[params.documentType];

  return {
    subject: `Action Required: Please Sign - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>${BASE_STYLES}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Ready for Signature</h1>
            </div>
            <div class="content">
              <p>Hi ${params.prospectName},</p>
              <p>Your <strong>${documentTitle}</strong> is ready for your signature. Please review and sign this document at your earliest convenience.</p>
              <p>You can access and sign the document through your prospect portal:</p>
              <p style="text-align: center;">
                <a href="${params.portalUrl}/portal/documents" class="button">Sign Document</a>
              </p>
              <p>If you have any questions about the document, please don't hesitate to reach out to us at <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a>.</p>
              <p>Thank you for your interest in Acme Franchise!</p>
              <p>Best regards,<br>The Acme Franchise Franchising Team</p>
            </div>
            <div class="footer">
              <p>Acme Franchise Franchising<br>
              <a href="${params.portalUrl}">franchising.acmefranchise.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Email sent when document is successfully signed
 */
export function getDocumentSignedEmail(params: DocumentEmailParams): EmailTemplate {
  const documentTitle = DOCUMENT_TITLES[params.documentType];

  return {
    subject: `Document Signed: ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>${BASE_STYLES}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Signed Successfully</h1>
            </div>
            <div class="content">
              <p>Hi ${params.prospectName},</p>
              <p>Thank you for signing the <strong>${documentTitle}</strong>. We have received your signed document and saved it to your account.</p>
              <p>You can view all your signed documents in your prospect portal:</p>
              <p style="text-align: center;">
                <a href="${params.portalUrl}/portal/documents" class="button">View Documents</a>
              </p>
              <p>If you have any questions, please contact us at <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a>.</p>
              <p>Best regards,<br>The Acme Franchise Franchising Team</p>
            </div>
            <div class="footer">
              <p>Acme Franchise Franchising<br>
              <a href="${params.portalUrl}">franchising.acmefranchise.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Email sent when signature is declined
 */
export function getDocumentDeclinedEmail(params: DocumentEmailParams): EmailTemplate {
  const documentTitle = DOCUMENT_TITLES[params.documentType];

  return {
    subject: `Document Declined: ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>${BASE_STYLES}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Signing Declined</h1>
            </div>
            <div class="content">
              <p>Hi ${params.prospectName},</p>
              <p>We noticed that you declined to sign the <strong>${documentTitle}</strong>.</p>
              <p>If this was a mistake or if you have questions about the document, please reach out to us. We're happy to discuss any concerns you may have.</p>
              <p>You can contact us at <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a> or reply to this email.</p>
              <p>Best regards,<br>The Acme Franchise Franchising Team</p>
            </div>
            <div class="footer">
              <p>Acme Franchise Franchising<br>
              <a href="${params.portalUrl}">franchising.acmefranchise.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Email sent when signature request expires
 */
export function getDocumentExpiredEmail(params: DocumentEmailParams): EmailTemplate {
  const documentTitle = DOCUMENT_TITLES[params.documentType];

  return {
    subject: `Signature Request Expired: ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>${BASE_STYLES}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Signature Request Expired</h1>
            </div>
            <div class="content">
              <p>Hi ${params.prospectName},</p>
              <p>The signature request for <strong>${documentTitle}</strong> has expired.</p>
              <p>Don't worry - you can request a new signature link through your prospect portal:</p>
              <p style="text-align: center;">
                <a href="${params.portalUrl}/portal/documents" class="button">View Documents</a>
              </p>
              <p>If you need assistance, please contact us at <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a>.</p>
              <p>Best regards,<br>The Acme Franchise Franchising Team</p>
            </div>
            <div class="footer">
              <p>Acme Franchise Franchising<br>
              <a href="${params.portalUrl}">franchising.acmefranchise.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Admin notification for signed documents
 */
export function getAdminDocumentSignedEmail(
  prospectName: string,
  prospectEmail: string,
  prospectId: string,
  documentType: DocumentType,
  adminUrl: string
): EmailTemplate {
  const documentTitle = DOCUMENT_TITLES[documentType];

  return {
    subject: `[Acme Franchising] Document Signed: ${prospectName} - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>${BASE_STYLES}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Signed</h1>
            </div>
            <div class="content">
              <p><strong>${prospectName}</strong> (${prospectEmail}) has signed the <strong>${documentTitle}</strong>.</p>
              <p>Document Type: ${documentTitle}</p>
              <p>Signed: ${new Date().toLocaleString()}</p>
              <p style="text-align: center;">
                <a href="${adminUrl}/admin/prospects/${prospectId}" class="button">View Prospect</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Reminder email for unsigned documents
 */
export function getSignatureReminderEmail(params: DocumentEmailParams): EmailTemplate {
  const documentTitle = DOCUMENT_TITLES[params.documentType];

  return {
    subject: `Reminder: Please Sign - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>${BASE_STYLES}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Signature Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${params.prospectName},</p>
              <p>This is a friendly reminder that your <strong>${documentTitle}</strong> is still awaiting your signature.</p>
              <p>Please take a moment to review and sign the document:</p>
              <p style="text-align: center;">
                <a href="${params.portalUrl}/portal/documents" class="button">Sign Document</a>
              </p>
              <p>If you have any questions or need assistance, please contact us at <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a>.</p>
              <p>Best regards,<br>The Acme Franchise Franchising Team</p>
            </div>
            <div class="footer">
              <p>Acme Franchise Franchising<br>
              <a href="${params.portalUrl}">franchising.acmefranchise.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}
