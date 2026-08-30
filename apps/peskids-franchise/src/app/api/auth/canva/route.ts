import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthorizationUrl, generateCodeVerifier } from "@/lib/canva";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol =
    host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https";
  const redirectUri = `${protocol}://${host}/api/auth/canva/callback`;

  const state = randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const authUrl = await getAuthorizationUrl(redirectUri, state, codeVerifier);

  const response = NextResponse.redirect(authUrl);

  // Store PKCE values in cookies
  response.cookies.set("canva_oauth_state", state, {
    httpOnly: true,
    secure: protocol === "https",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("canva_redirect_uri", redirectUri, {
    httpOnly: true,
    secure: protocol === "https",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("canva_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: protocol === "https",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
