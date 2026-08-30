// Lazy-load Dropbox Sign client to avoid build-time errors when API key is missing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dropboxSignClient: any = null;

export function getDropboxSignClient() {
  if (!dropboxSignClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DropboxSign = require("@dropbox/sign");

    if (!process.env.DROPBOX_SIGN_API_KEY) {
      throw new Error("DROPBOX_SIGN_API_KEY is not configured");
    }

    dropboxSignClient = new DropboxSign.ApiClient();
    dropboxSignClient.setAccessToken(process.env.DROPBOX_SIGN_API_KEY);
  }

  return dropboxSignClient;
}

export function isDropboxSignConfigured(): boolean {
  return !!process.env.DROPBOX_SIGN_API_KEY;
}

export function getDropboxSignConfig() {
  return {
    clientId: process.env.DROPBOX_SIGN_CLIENT_ID || "",
    testMode: process.env.DROPBOX_SIGN_TEST_MODE === "true",
    webhookSecret: process.env.DROPBOX_SIGN_WEBHOOK_SECRET || "",
  };
}
