// Lead Attribution Capture
// Captures UTM parameters and tracks lead sources

import { db } from "@/lib/db";

export interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
}

/**
 * Parse UTM parameters from URL search params
 */
export function parseUTMParams(searchParams: URLSearchParams): UTMParams {
  return {
    utmSource: searchParams.get("utm_source") || undefined,
    utmMedium: searchParams.get("utm_medium") || undefined,
    utmCampaign: searchParams.get("utm_campaign") || undefined,
    utmTerm: searchParams.get("utm_term") || undefined,
    utmContent: searchParams.get("utm_content") || undefined,
  };
}

/**
 * Parse UTM params from a full URL
 */
export function parseUTMFromUrl(url: string): UTMParams {
  try {
    const urlObj = new URL(url);
    return parseUTMParams(urlObj.searchParams);
  } catch {
    return {};
  }
}

/**
 * Check if any UTM params are present
 */
export function hasUTMParams(params: UTMParams): boolean {
  return !!(
    params.utmSource ||
    params.utmMedium ||
    params.utmCampaign ||
    params.utmTerm ||
    params.utmContent
  );
}

/**
 * Create or update lead attribution for a prospect
 */
export async function captureAttribution(
  prospectId: string,
  params: UTMParams
): Promise<void> {
  // Check if attribution already exists
  const existing = await db.leadAttribution.findUnique({
    where: { prospectId },
  });

  if (existing) {
    // Add a touch record for additional visits
    await db.attributionTouch.create({
      data: {
        attributionId: existing.id,
        touchType: "page_view",
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
        pageUrl: params.landingPage,
      },
    });
  } else {
    // Create first-touch attribution
    await db.leadAttribution.create({
      data: {
        prospectId,
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
        utmTerm: params.utmTerm,
        utmContent: params.utmContent,
        referrer: params.referrer,
        landingPage: params.landingPage,
      },
    });
  }
}

/**
 * Record an attribution touch point
 */
export async function recordAttributionTouch(
  prospectId: string,
  touchType: string,
  params?: UTMParams,
  pageUrl?: string
): Promise<void> {
  const attribution = await db.leadAttribution.findUnique({
    where: { prospectId },
  });

  if (!attribution) {
    console.warn(`[Attribution] No attribution record for prospect ${prospectId}`);
    return;
  }

  await db.attributionTouch.create({
    data: {
      attributionId: attribution.id,
      touchType,
      utmSource: params?.utmSource,
      utmMedium: params?.utmMedium,
      utmCampaign: params?.utmCampaign,
      pageUrl,
    },
  });
}

/**
 * Get full attribution data for a prospect
 */
export async function getProspectAttribution(prospectId: string) {
  return db.leadAttribution.findUnique({
    where: { prospectId },
    include: {
      touches: {
        orderBy: { touchedAt: "desc" },
      },
    },
  });
}

/**
 * Get attribution summary for reporting
 */
export async function getAttributionSummary(
  startDate?: Date,
  endDate?: Date
): Promise<{
  bySource: { source: string; count: number }[];
  byMedium: { medium: string; count: number }[];
  byCampaign: { campaign: string; count: number }[];
  total: number;
}> {
  const where = {
    ...(startDate || endDate
      ? {
          firstTouchedAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  // Get all attributions in date range
  const attributions = await db.leadAttribution.findMany({
    where,
    select: {
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
    },
  });

  // Aggregate by source
  const sourceMap = new Map<string, number>();
  const mediumMap = new Map<string, number>();
  const campaignMap = new Map<string, number>();

  for (const attr of attributions) {
    const source = attr.utmSource || "(direct)";
    const medium = attr.utmMedium || "(none)";
    const campaign = attr.utmCampaign || "(none)";

    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    mediumMap.set(medium, (mediumMap.get(medium) || 0) + 1);
    campaignMap.set(campaign, (campaignMap.get(campaign) || 0) + 1);
  }

  const sortByCount = (a: { count: number }, b: { count: number }) =>
    b.count - a.count;

  return {
    bySource: Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort(sortByCount),
    byMedium: Array.from(mediumMap.entries())
      .map(([medium, count]) => ({ medium, count }))
      .sort(sortByCount),
    byCampaign: Array.from(campaignMap.entries())
      .map(([campaign, count]) => ({ campaign, count }))
      .sort(sortByCount),
    total: attributions.length,
  };
}

/**
 * Get common UTM source labels
 */
export function getSourceLabel(source: string | null): string {
  if (!source) return "Direct";

  const labels: Record<string, string> = {
    google: "Google",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    twitter: "Twitter/X",
    youtube: "YouTube",
    email: "Email",
    referral: "Referral",
    organic: "Organic",
    paid: "Paid",
  };

  return labels[source.toLowerCase()] || source;
}

/**
 * Get medium labels
 */
export function getMediumLabel(medium: string | null): string {
  if (!medium) return "None";

  const labels: Record<string, string> = {
    cpc: "Paid Search",
    ppc: "Paid Search",
    organic: "Organic Search",
    social: "Social Media",
    email: "Email",
    referral: "Referral",
    display: "Display Ads",
    video: "Video",
    affiliate: "Affiliate",
  };

  return labels[medium.toLowerCase()] || medium;
}
