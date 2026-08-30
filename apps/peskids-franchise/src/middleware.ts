import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const UTM_COOKIE_NAME = "stc_utm_params";
const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Middleware to capture and persist UTM parameters
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl;

  // Only process public pages
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/portal") ||
    url.pathname.startsWith("/_next")
  ) {
    return response;
  }

  // Check for UTM parameters
  const utmSource = url.searchParams.get("utm_source");
  const utmMedium = url.searchParams.get("utm_medium");
  const utmCampaign = url.searchParams.get("utm_campaign");
  const utmTerm = url.searchParams.get("utm_term");
  const utmContent = url.searchParams.get("utm_content");

  // If any UTM params exist, store them in a cookie
  if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
    const referrer = request.headers.get("referer") || "";
    const landingPage = url.pathname + url.search;

    const utmData = {
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrer,
      landingPage,
      capturedAt: new Date().toISOString(),
    };

    // Set cookie with UTM data
    response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(utmData), {
      maxAge: UTM_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    console.log(`[UTM] Captured params for ${url.pathname}:`, {
      utmSource,
      utmMedium,
      utmCampaign,
    });
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all public pages for UTM parameter tracking
    "/",
    "/about",
    "/business-model",
    "/contact",
    "/faq",
    "/investment",
    "/markets",
    "/steps",
    "/support",
    "/testimonials",
    "/why-stc",
    "/privacy",
    "/terms",
  ],
};
