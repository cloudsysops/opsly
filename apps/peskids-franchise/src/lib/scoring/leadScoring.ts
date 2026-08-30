import { db } from "@/lib/db";

// Scoring weights - easily adjustable
export const SCORING_WEIGHTS = {
  // Visitor behavior
  RETURN_VISIT: 10,           // Per additional session beyond first
  EARL_CHAT: 15,              // Chatted with Earl
  PAGE_VIEW: 2,               // Per page viewed
  HIGH_VALUE_PAGE: 20,        // Investment, Contact, Business Model pages
  TIME_ON_SITE_5MIN: 25,      // 5+ minutes total
  TIME_ON_SITE_10MIN: 15,     // Additional 10+ minutes
  TIME_ON_SITE_20MIN: 10,     // Additional 20+ minutes

  // Interest level from form
  INTEREST_READY_TO_START: 30,
  INTEREST_SEEKING_FUNDING: 25,
  INTEREST_SERIOUSLY_CONSIDERING: 20,
  INTEREST_JUST_EXPLORING: 10,
  INTEREST_GATHERING_INFO: 5,

  // Liquidity from form
  LIQUIDITY_OVER_500K: 25,
  LIQUIDITY_250K_500K: 20,
  LIQUIDITY_100K_250K: 15,
  LIQUIDITY_50K_100K: 10,
  LIQUIDITY_UNDER_50K: 5,

  // Engagement signals
  VIEWED_FAQ: 5,
  VIEWED_TESTIMONIALS: 10,
  MULTIPLE_EARL_CHATS: 10,    // More than 3 messages
  DOWNLOADED_RESOURCE: 15,
  WATCHED_VIDEO: 10,
};

// High-value pages that indicate serious interest
const HIGH_VALUE_PAGES = [
  '/investment',
  '/contact',
  '/business-model',
  '/territory',
  '/steps',
];

interface ScoringBreakdown {
  total: number;
  breakdown: {
    category: string;
    points: number;
    reason: string;
  }[];
}

/**
 * Calculate lead score based on visitor behavior data
 */
export async function calculateVisitorScore(visitorId: string): Promise<ScoringBreakdown> {
  const breakdown: ScoringBreakdown["breakdown"] = [];

  const visitor = await db.visitor.findUnique({
    where: { visitorId },
    include: {
      sessions: {
        include: {
          pageViews: true,
        },
      },
    },
  });

  if (!visitor) {
    return { total: 0, breakdown: [] };
  }

  // Return visits (sessions beyond the first)
  if (visitor.totalSessions > 1) {
    const returnVisitPoints = (visitor.totalSessions - 1) * SCORING_WEIGHTS.RETURN_VISIT;
    breakdown.push({
      category: "Engagement",
      points: returnVisitPoints,
      reason: `${visitor.totalSessions - 1} return visit(s)`,
    });
  }

  // Earl chat
  const hadEarlChat = visitor.sessions.some(s => s.hadEarlChat);
  if (hadEarlChat) {
    breakdown.push({
      category: "Engagement",
      points: SCORING_WEIGHTS.EARL_CHAT,
      reason: "Chatted with Earl",
    });
  }

  // Page views (capped at 50 pages to prevent gaming)
  const cappedPageViews = Math.min(visitor.totalPageViews, 50);
  if (cappedPageViews > 0) {
    breakdown.push({
      category: "Interest",
      points: cappedPageViews * SCORING_WEIGHTS.PAGE_VIEW,
      reason: `${cappedPageViews} pages viewed`,
    });
  }

  // High-value page views
  const allPageViews = visitor.sessions.flatMap(s => s.pageViews);
  const highValuePageViews = new Set(
    allPageViews
      .filter(pv => HIGH_VALUE_PAGES.some(hvp => pv.pagePath.startsWith(hvp)))
      .map(pv => pv.pagePath)
  );

  if (highValuePageViews.size > 0) {
    breakdown.push({
      category: "Intent",
      points: highValuePageViews.size * SCORING_WEIGHTS.HIGH_VALUE_PAGE,
      reason: `Viewed ${highValuePageViews.size} high-value page(s): ${Array.from(highValuePageViews).join(", ")}`,
    });
  }

  // Time on site
  const totalMinutes = visitor.totalTimeOnSite / 60;
  if (totalMinutes >= 5) {
    breakdown.push({
      category: "Engagement",
      points: SCORING_WEIGHTS.TIME_ON_SITE_5MIN,
      reason: "5+ minutes on site",
    });
  }
  if (totalMinutes >= 10) {
    breakdown.push({
      category: "Engagement",
      points: SCORING_WEIGHTS.TIME_ON_SITE_10MIN,
      reason: "10+ minutes on site",
    });
  }
  if (totalMinutes >= 20) {
    breakdown.push({
      category: "Engagement",
      points: SCORING_WEIGHTS.TIME_ON_SITE_20MIN,
      reason: "20+ minutes on site",
    });
  }

  // FAQ page
  const viewedFaq = allPageViews.some(pv => pv.pagePath.startsWith("/faq"));
  if (viewedFaq) {
    breakdown.push({
      category: "Research",
      points: SCORING_WEIGHTS.VIEWED_FAQ,
      reason: "Viewed FAQ page",
    });
  }

  // Testimonials
  const viewedTestimonials = allPageViews.some(pv => pv.pagePath.startsWith("/testimonials"));
  if (viewedTestimonials) {
    breakdown.push({
      category: "Research",
      points: SCORING_WEIGHTS.VIEWED_TESTIMONIALS,
      reason: "Viewed testimonials",
    });
  }

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);

  return { total, breakdown };
}

/**
 * Calculate score based on prospect form data
 */
export function calculateFormScore(prospect: {
  interestLevel: string;
  liquidity: string | null;
}): ScoringBreakdown {
  const breakdown: ScoringBreakdown["breakdown"] = [];

  // Interest level
  const interestScores: Record<string, { points: number; label: string }> = {
    READY_TO_START: { points: SCORING_WEIGHTS.INTEREST_READY_TO_START, label: "Ready to start" },
    ACTIVELY_SEEKING_FUNDING: { points: SCORING_WEIGHTS.INTEREST_SEEKING_FUNDING, label: "Seeking funding" },
    SERIOUSLY_CONSIDERING: { points: SCORING_WEIGHTS.INTEREST_SERIOUSLY_CONSIDERING, label: "Seriously considering" },
    JUST_EXPLORING: { points: SCORING_WEIGHTS.INTEREST_JUST_EXPLORING, label: "Just exploring" },
    GATHERING_INFORMATION: { points: SCORING_WEIGHTS.INTEREST_GATHERING_INFO, label: "Gathering info" },
  };

  const interestScore = interestScores[prospect.interestLevel];
  if (interestScore) {
    breakdown.push({
      category: "Intent",
      points: interestScore.points,
      reason: `Interest level: ${interestScore.label}`,
    });
  }

  // Liquidity
  if (prospect.liquidity) {
    const liquidityScores: Record<string, { points: number; label: string }> = {
      OVER_500K: { points: SCORING_WEIGHTS.LIQUIDITY_OVER_500K, label: "Over $500K" },
      RANGE_250K_500K: { points: SCORING_WEIGHTS.LIQUIDITY_250K_500K, label: "$250K-$500K" },
      RANGE_100K_250K: { points: SCORING_WEIGHTS.LIQUIDITY_100K_250K, label: "$100K-$250K" },
      RANGE_50K_100K: { points: SCORING_WEIGHTS.LIQUIDITY_50K_100K, label: "$50K-$100K" },
      UNDER_50K: { points: SCORING_WEIGHTS.LIQUIDITY_UNDER_50K, label: "Under $50K" },
    };

    const liquidityScore = liquidityScores[prospect.liquidity];
    if (liquidityScore) {
      breakdown.push({
        category: "Financial",
        points: liquidityScore.points,
        reason: `Liquidity: ${liquidityScore.label}`,
      });
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);

  return { total, breakdown };
}

/**
 * Calculate and update prospect score
 */
export async function updateProspectScore(prospectId: string): Promise<number> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: {
      visitors: true,
      conversations: {
        include: {
          messages: true,
        },
      },
    },
  });

  if (!prospect) {
    return 0;
  }

  let totalScore = 0;
  const allBreakdown: ScoringBreakdown["breakdown"] = [];

  // Form-based scoring
  const formScore = calculateFormScore({
    interestLevel: prospect.interestLevel,
    liquidity: prospect.liquidity,
  });
  totalScore += formScore.total;
  allBreakdown.push(...formScore.breakdown);

  // Visitor-based scoring (for each linked visitor)
  for (const visitor of prospect.visitors) {
    const visitorScore = await calculateVisitorScore(visitor.visitorId);
    totalScore += visitorScore.total;
    allBreakdown.push(...visitorScore.breakdown);
  }

  // Earl conversation scoring
  const totalMessages = prospect.conversations.reduce(
    (sum, conv) => sum + conv.messages.filter(m => m.role === "USER").length,
    0
  );
  if (totalMessages > 3) {
    totalScore += SCORING_WEIGHTS.MULTIPLE_EARL_CHATS;
    allBreakdown.push({
      category: "Engagement",
      points: SCORING_WEIGHTS.MULTIPLE_EARL_CHATS,
      reason: `${totalMessages} messages with Earl`,
    });
  }

  // Update prospect score
  await db.prospect.update({
    where: { id: prospectId },
    data: { prospectScore: totalScore },
  });

  // Log the score update with breakdown
  await db.prospectActivity.create({
    data: {
      prospectId,
      activityType: "SCORE_UPDATED",
      description: `Lead score updated to ${totalScore}`,
      metadata: {
        score: totalScore,
        breakdown: allBreakdown,
      },
    },
  });

  return totalScore;
}

/**
 * Recalculate scores for all prospects (for batch updates)
 */
export async function recalculateAllScores(): Promise<{ updated: number; errors: number }> {
  const prospects = await db.prospect.findMany({
    select: { id: true },
  });

  let updated = 0;
  let errors = 0;

  for (const prospect of prospects) {
    try {
      await updateProspectScore(prospect.id);
      updated++;
    } catch (error) {
      console.error(`Error updating score for prospect ${prospect.id}:`, error);
      errors++;
    }
  }

  return { updated, errors };
}
