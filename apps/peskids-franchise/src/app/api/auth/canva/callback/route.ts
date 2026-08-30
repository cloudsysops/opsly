import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForTokens, getCurrentUser } from "@/lib/canva";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol =
    host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https";
  const baseUrl = `${protocol}://${host}`;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.redirect(
      new URL(
        "/admin/learning/creative-assets?canva=error&reason=unauthorized",
        baseUrl
      )
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("Canva OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/admin/learning/creative-assets?canva=error&reason=${encodeURIComponent(errorDescription || error)}`,
        baseUrl
      )
    );
  }

  const storedState = request.cookies.get("canva_oauth_state")?.value;
  const redirectUri = request.cookies.get("canva_redirect_uri")?.value;
  const codeVerifier = request.cookies.get("canva_code_verifier")?.value;

  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL(
        "/admin/learning/creative-assets?canva=error&reason=invalid_state",
        baseUrl
      )
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/admin/learning/creative-assets?canva=error&reason=no_code",
        baseUrl
      )
    );
  }
  if (!redirectUri || !codeVerifier) {
    return NextResponse.redirect(
      new URL(
        "/admin/learning/creative-assets?canva=error&reason=missing_cookies",
        baseUrl
      )
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri, codeVerifier);

    let canvaUser;
    try {
      canvaUser = await getCurrentUser(tokens.access_token);
    } catch (e) {
      console.warn("Could not fetch Canva user profile:", e);
    }

    // Remove any existing connections and create new one
    await db.canvaConnection.deleteMany({});
    await db.canvaConnection.create({
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expires_at),
        scope: tokens.scope,
        connectedBy: session.user.id || session.user.email || "admin",
        displayName: canvaUser?.display_name || null,
        canvaUserId: canvaUser?.user_id || null,
      },
    });

    const response = NextResponse.redirect(
      new URL("/admin/learning/creative-assets?canva=connected", baseUrl)
    );
    response.cookies.delete("canva_oauth_state");
    response.cookies.delete("canva_redirect_uri");
    response.cookies.delete("canva_code_verifier");
    return response;
  } catch (err) {
    console.error("Canva OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/admin/learning/creative-assets?canva=error&reason=${encodeURIComponent("Failed to connect")}`,
        baseUrl
      )
    );
  }
}
