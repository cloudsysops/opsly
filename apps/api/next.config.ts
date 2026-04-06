import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Origen permitido para CORS (admin en otro subdominio).
 * En build Docker/CI: pasar PLATFORM_DOMAIN y/o NEXT_PUBLIC_ADMIN_URL como ENV (ver Dockerfile + deploy.yml).
 * Sin URL resuelta no se emiten headers CORS (evita wildcard).
 */
function corsAllowOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (explicit) {
    return explicit;
  }
  const domain = process.env.PLATFORM_DOMAIN?.trim();
  if (domain) {
    return `https://admin.${domain}`;
  }
  return "";
}

const allowOrigin = corsAllowOrigin();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async headers(): Promise<
    Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>
  > {
    if (!allowOrigin) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowOrigin },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type,Authorization,x-admin-token",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
