export const MCP_SERVER_INFO = {
  name: "opsly-openclaw",
  version: "1.1.0",
  description: "OpenClaw — Control completo de Opsly desde Claude"
} as const;

export const OPSLY_API_URL = process.env.OPSLY_API_URL || "https://api.ops.smiletripcare.com";
export const HTTP_TIMEOUT_MS = 20_000;
