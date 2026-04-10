import { headers } from "next/headers";

/** Server Components: `NEXT_PUBLIC_API_URL` o host `portal.*` / localhost. */
export async function getApiBaseUrlServer(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env && env.length > 0) {
    return env.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (host.startsWith("portal.")) {
    return `https://api.${host.slice("portal.".length)}`;
  }
  if (
    host.includes("localhost") ||
    host.startsWith("127.0.0.1") ||
    host === ""
  ) {
    return "http://127.0.0.1:3000";
  }
  throw new Error("NEXT_PUBLIC_API_URL is not set and API host cannot be inferred");
}
