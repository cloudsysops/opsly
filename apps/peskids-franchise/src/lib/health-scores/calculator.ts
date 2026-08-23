import { prisma } from "@/lib/prisma";
import { RiskLevel, ScoreTrend } from "@prisma/client";

interface ScoreWeights {
  financial: number;
  operational: number;
  compliance: number;
  engagement: number;
  growth: number;
}

interface RiskThresholds {
  critical: number;
  high: number;
  elevated: number;
  moderate: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  financial: 30,
  operational: 25,
  compliance: 20,
  engagement: 15,
  growth: 10,
};

const DEFAULT_THRESHOLDS: RiskThresholds = {
  critical: 40,
  high: 55,
  elevated: 70,
  moderate: 85,
};

export async function calculateHealthScores(year: number, month: number) {
  // Get weights configuration
  const weightsConfig = await prisma.healthScoreWeight.findFirst({
    where: { isActive: true },
  });

  const weights: ScoreWeights = weightsConfig
    ? {
        financial: weightsConfig.financialWeight,
        operational: weightsConfig.operationalWeight,
        compliance: weightsConfig.complianceWeight,
        engagement: weightsConfig.engagementWeight,
        growth: weightsConfig.growthWeight,
      }
    : DEFAULT_WEIGHTS;

  const thresholds: RiskThresholds = weightsConfig
    ? {
        critical: weightsConfig.criticalThreshold,
        high: weightsConfig.highRiskThreshold,
        elevated: weightsConfig.elevatedThreshold,
        moderate: weightsConfig.moderateThreshold,
      }
    : DEFAULT_THRESHOLDS;

  // Get all active franchisees
  const franchisees = await prisma.franchiseeAccount.findMany({
    where: {
      prospect: {
        pipelineStage: "SELECTED",
      },
    },
    include: {
      prospect: true,
      tcSnapshots: {
        where: { year, month },
        take: 1,
      },
      certifications: {
        include: { certification: true },
      },
      invoices: {
        where: { year, month },
      },
      markets: true,
    },
  });

  // Get previous month's scores for trend calculation
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevScores = await prisma.healthScore.findMany({
    where: { year: prevYear, month: prevMonth },
  });
  const prevScoreMap = new Map(prevScores.map((s) => [s.franchiseeAccountId, s]));

  // Get network benchmarks for comparison
  const allSnapshots = await prisma.tutorCruncherSnapshot.findMany({
    where: { year, month },
  });
  const networkMedian = calculateMedian(allSnapshots.map((s) => Number(s.grossRevenue)));

  const results = [];

  for (const franchisee of franchisees) {
    const snapshot = franchisee.tcSnapshots[0];
    const prevScore = prevScoreMap.get(franchisee.id);

    // Calculate individual component scores (0-100)
    const financialScore = calculateFinancialScore(snapshot, networkMedian);
    const operationalScore = calculateOperationalScore(snapshot);
    const complianceScore = calculateComplianceScore(franchisee.certifications);
    const engagementScore = calculateEngagementScore(franchisee);
    const growthScore = calculateGrowthScore(snapshot, prevScore);

    // Calculate weighted composite score
    const compositeScore =
      (financialScore * weights.financial +
        operationalScore * weights.operational +
        complianceScore * weights.compliance +
        engagementScore * weights.engagement +
        growthScore * weights.growth) /
      100;

    // Determine risk level
    const riskLevel = determineRiskLevel(compositeScore, thresholds);

    // Calculate trend
    const trend = determineTrend(compositeScore, prevScore?.compositeScore);

    // Identify risk factors
    const riskFactors = identifyRiskFactors({
      financialScore,
      operationalScore,
      complianceScore,
      engagementScore,
      growthScore,
      snapshot,
    });

    // Generate recommendations
    const recommendations = generateRecommendations({
      financialScore,
      operationalScore,
      complianceScore,
      engagementScore,
      growthScore,
      riskFactors,
    });

    // Upsert the health score
    const healthScore = await prisma.healthScore.upsert({
      where: {
        franchiseeAccountId_year_month: {
          franchiseeAccountId: franchisee.id,
          year,
          month,
        },
      },
      update: {
        financialScore,
        operationalScore,
        complianceScore,
        engagementScore,
        growthScore,
        compositeScore,
        riskLevel,
        trend,
        previousScore: prevScore?.compositeScore || null,
        riskFactors,
        recommendations,
        breakdown: {
          financial: { score: financialScore, weight: weights.financial },
          operational: { score: operationalScore, weight: weights.operational },
          compliance: { score: complianceScore, weight: weights.compliance },
          engagement: { score: engagementScore, weight: weights.engagement },
          growth: { score: growthScore, weight: weights.growth },
        },
      },
      create: {
        franchiseeAccountId: franchisee.id,
        year,
        month,
        financialScore,
        operationalScore,
        complianceScore,
        engagementScore,
        growthScore,
        compositeScore,
        riskLevel,
        trend,
        previousScore: prevScore?.compositeScore || null,
        riskFactors,
        recommendations,
        breakdown: {
          financial: { score: financialScore, weight: weights.financial },
          operational: { score: operationalScore, weight: weights.operational },
          compliance: { score: complianceScore, weight: weights.compliance },
          engagement: { score: engagementScore, weight: weights.engagement },
          growth: { score: growthScore, weight: weights.growth },
        },
      },
    });

    results.push(healthScore);
  }

  return results;
}

export function calculateFinancialScore(
  snapshot: any | null,
  networkMedian: number
): number {
  if (!snapshot) return 50; // No data = neutral score

  const revenue = Number(snapshot.grossRevenue);

  // Compare to network median (0-100 scale)
  // 100% of median = 70 points, each 10% above adds 3 points up to 100
  // Each 10% below subtracts 7 points down to 0
  if (networkMedian === 0) return 70;

  const percentOfMedian = (revenue / networkMedian) * 100;

  if (percentOfMedian >= 100) {
    const bonus = Math.min(30, ((percentOfMedian - 100) / 10) * 3);
    return Math.min(100, 70 + bonus);
  } else {
    const penalty = ((100 - percentOfMedian) / 10) * 7;
    return Math.max(0, 70 - penalty);
  }
}

export function calculateOperationalScore(snapshot: any | null): number {
  if (!snapshot) return 50;

  let score = 70; // Base score

  // Lessons delivered factor
  const lessons = snapshot.totalLessons || 0;
  if (lessons >= 100) score += 15;
  else if (lessons >= 50) score += 10;
  else if (lessons >= 25) score += 5;
  else if (lessons < 10) score -= 15;

  // Active students factor
  const students = snapshot.activeStudents || 0;
  if (students >= 30) score += 10;
  else if (students >= 15) score += 5;
  else if (students < 5) score -= 10;

  // Active tutors factor
  const tutors = snapshot.activeTutors || 0;
  if (tutors >= 5) score += 5;
  else if (tutors < 2) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function calculateComplianceScore(certifications: any[]): number {
  if (certifications.length === 0) return 50;

  const now = new Date();
  let validCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  for (const cert of certifications) {
    if (cert.status === "ACTIVE") {
      validCount++;
      // Check if expiring within 30 days
      if (cert.expiresAt && new Date(cert.expiresAt) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        expiringSoonCount++;
      }
    } else if (cert.status === "EXPIRED") {
      expiredCount++;
    }
  }

  // Base score on valid certifications
  let score = Math.min(100, 50 + validCount * 10);

  // Penalties
  score -= expiringSoonCount * 5;
  score -= expiredCount * 15;

  return Math.max(0, Math.min(100, score));
}

export function calculateEngagementScore(franchisee: any): number {
  let score = 70; // Base score

  // This would typically include:
  // - Academy progress
  // - Support ticket response
  // - Communication frequency
  // - Portal login activity

  // For now, simple heuristic based on data presence
  if (franchisee.tcSnapshots?.length > 0) score += 10;
  if (franchisee.certifications?.length > 0) score += 10;
  if (franchisee.markets?.length > 0) score += 10;

  return Math.max(0, Math.min(100, score));
}

export function calculateGrowthScore(
  currentSnapshot: any | null,
  prevScore: any | null
): number {
  if (!currentSnapshot) return 50;

  // Without previous data, neutral score
  if (!prevScore) return 70;

  const currentRevenue = Number(currentSnapshot.grossRevenue);
  const previousComposite = prevScore.compositeScore || 70;

  // Growth score based on improvement trend
  // Improving composite score = good growth indicator
  let score = 70;

  if (previousComposite > 0) {
    const improvement = (currentRevenue - previousComposite) / previousComposite;
    if (improvement > 0.1) score += 20;
    else if (improvement > 0.05) score += 10;
    else if (improvement < -0.1) score -= 20;
    else if (improvement < -0.05) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function determineRiskLevel(score: number, thresholds: RiskThresholds): RiskLevel {
  if (score < thresholds.critical) return "CRITICAL";
  if (score < thresholds.high) return "HIGH";
  if (score < thresholds.elevated) return "ELEVATED";
  if (score < thresholds.moderate) return "MODERATE";
  return "LOW";
}

export function determineTrend(current: number, previous: number | null | undefined): ScoreTrend {
  if (previous === null || previous === undefined) return "NEW";
  const change = current - previous;
  if (change > 5) return "IMPROVING";
  if (change < -5) return "DECLINING";
  return "STABLE";
}

export function identifyRiskFactors(data: {
  financialScore: number;
  operationalScore: number;
  complianceScore: number;
  engagementScore: number;
  growthScore: number;
  snapshot: any;
}): { factor: string; impact: string; description: string }[] {
  const factors = [];

  if (data.financialScore < 50) {
    factors.push({
      factor: "Low Financial Performance",
      impact: "HIGH",
      description: "Revenue significantly below network median",
    });
  }

  if (data.operationalScore < 50) {
    factors.push({
      factor: "Operational Issues",
      impact: "HIGH",
      description: "Below-average lesson delivery or student retention",
    });
  }

  if (data.complianceScore < 50) {
    factors.push({
      factor: "Compliance Gaps",
      impact: "MEDIUM",
      description: "Missing or expired certifications",
    });
  }

  if (data.engagementScore < 50) {
    factors.push({
      factor: "Low Engagement",
      impact: "MEDIUM",
      description: "Limited platform activity or communication",
    });
  }

  if (data.growthScore < 50) {
    factors.push({
      factor: "Declining Growth",
      impact: "MEDIUM",
      description: "Performance trending downward month-over-month",
    });
  }

  return factors;
}

export function generateRecommendations(data: {
  financialScore: number;
  operationalScore: number;
  complianceScore: number;
  engagementScore: number;
  growthScore: number;
  riskFactors: { factor: string; impact: string }[];
}): { priority: string; category: string; action: string }[] {
  const recommendations = [];

  if (data.financialScore < 60) {
    recommendations.push({
      priority: "HIGH",
      category: "Financial",
      action: "Schedule revenue growth coaching call",
    });
  }

  if (data.operationalScore < 60) {
    recommendations.push({
      priority: "HIGH",
      category: "Operational",
      action: "Review service delivery processes and tutor utilization",
    });
  }

  if (data.complianceScore < 70) {
    recommendations.push({
      priority: "MEDIUM",
      category: "Compliance",
      action: "Update certifications and complete pending training",
    });
  }

  if (data.engagementScore < 60) {
    recommendations.push({
      priority: "MEDIUM",
      category: "Engagement",
      action: "Increase communication frequency and portal usage",
    });
  }

  if (data.growthScore < 60) {
    recommendations.push({
      priority: "MEDIUM",
      category: "Growth",
      action: "Develop market expansion plan with field consultant",
    });
  }

  return recommendations;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
