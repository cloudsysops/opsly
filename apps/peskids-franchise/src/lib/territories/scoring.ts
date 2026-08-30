// Territory viability scoring engine
import { db } from "@/lib/db";
import { calculateAreaSqMiles } from "./mapbox";

export interface ScoreFactor {
  name: string;
  value: number;
  normalized: number;
  weight: number;
  weighted: number;
}

export interface ScoreResult {
  score: number;
  tier: string;
  tierColor: string;
  factors: ScoreFactor[];
}

interface ScoringWeights {
  childrenDensityWeight: number;
  householdIncomeWeight: number;
  householdsWithKidsWeight: number;
  competitorSaturationWeight: number;
  populationDensityWeight: number;
  schoolDensityWeight: number;
  educationLevelWeight: number;
  childrenDensityBenchmark: number;
  householdIncomeBenchmark: number;
  schoolDensityBenchmark: number;
}

interface TerritoryForScoring {
  population?: number | null;
  medianIncome?: number | null;
  householdsWithChildren?: number | null;
  totalHouseholds?: number | null;
  childrenUnder18?: number | null;
  children5to12?: number | null;
  schoolCount?: number | null;
  competitorCount?: number | null;
  boundaryGeoJson?: unknown;
}

const SCORE_TIERS = [
  { min: 86, tier: "Excellent", color: "#059669" },
  { min: 71, tier: "Strong", color: "#34B256" },
  { min: 51, tier: "Average", color: "#FACC29" },
  { min: 26, tier: "Below Average", color: "#F79A30" },
  { min: 0, tier: "Poor", color: "#EF4444" },
];

export function getScoreTier(score: number): { tier: string; color: string } {
  for (const t of SCORE_TIERS) {
    if (score >= t.min) return { tier: t.tier, color: t.color };
  }
  return { tier: "Poor", color: "#EF4444" };
}

function normalize(value: number, benchmark: number, inverse = false): number {
  if (benchmark <= 0) return 50;
  const ratio = value / benchmark;
  const normalized = inverse
    ? Math.max(0, Math.min(100, (1 - ratio) * 100))
    : Math.max(0, Math.min(100, ratio * 100));
  return normalized;
}

export function calculateScore(
  territory: TerritoryForScoring,
  config: ScoringWeights,
  areaSqMiles: number
): ScoreResult {
  const safeArea = Math.max(areaSqMiles, 1);

  const childrenDensity = (territory.children5to12 || 0) / safeArea;
  const populationDensity = (territory.population || 0) / safeArea;
  const schoolDensity = (territory.schoolCount || 0) / safeArea;
  const competitorDensity = (territory.competitorCount || 0) / safeArea;
  const hhWithKidsRatio =
    territory.totalHouseholds && territory.totalHouseholds > 0
      ? (territory.householdsWithChildren || 0) /
        territory.totalHouseholds
      : 0;

  const factors: ScoreFactor[] = [
    {
      name: "Children Density (5-12)",
      value: childrenDensity,
      normalized: normalize(childrenDensity, config.childrenDensityBenchmark),
      weight: config.childrenDensityWeight,
      weighted: 0,
    },
    {
      name: "Household Income",
      value: territory.medianIncome || 0,
      normalized: normalize(
        territory.medianIncome || 0,
        config.householdIncomeBenchmark
      ),
      weight: config.householdIncomeWeight,
      weighted: 0,
    },
    {
      name: "Households w/ Kids",
      value: hhWithKidsRatio * 100,
      normalized: normalize(hhWithKidsRatio, 0.35),
      weight: config.householdsWithKidsWeight,
      weighted: 0,
    },
    {
      name: "Competitor Saturation",
      value: competitorDensity,
      normalized: normalize(competitorDensity, 0.5, true),
      weight: config.competitorSaturationWeight,
      weighted: 0,
    },
    {
      name: "Population Density",
      value: populationDensity,
      normalized: normalize(populationDensity, 1000),
      weight: config.populationDensityWeight,
      weighted: 0,
    },
    {
      name: "School Density",
      value: schoolDensity,
      normalized: normalize(schoolDensity, config.schoolDensityBenchmark),
      weight: config.schoolDensityWeight,
      weighted: 0,
    },
    {
      name: "Education Level",
      value: 50,
      normalized: 50,
      weight: config.educationLevelWeight,
      weighted: 0,
    },
  ];

  factors.forEach((f) => {
    f.weighted = f.normalized * f.weight;
  });

  const rawScore = factors.reduce((sum, f) => sum + f.weighted, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const { tier, color: tierColor } = getScoreTier(score);

  return { score, tier, tierColor, factors };
}

export async function getScoringConfig(
  region = "US"
): Promise<ScoringWeights> {
  try {
    const config = await db.scoringConfig.findUnique({
      where: { region },
    });
    if (config) return config;
  } catch {
    // Fall through to defaults
  }

  return {
    childrenDensityWeight: 0.25,
    householdIncomeWeight: 0.2,
    householdsWithKidsWeight: 0.15,
    competitorSaturationWeight: 0.15,
    populationDensityWeight: 0.1,
    schoolDensityWeight: 0.1,
    educationLevelWeight: 0.05,
    childrenDensityBenchmark: 500,
    householdIncomeBenchmark: 75000,
    schoolDensityBenchmark: 2,
  };
}

export function getAreaFromTerritory(territory: {
  boundaryGeoJson?: unknown;
  radiusMiles?: number | null;
}): number {
  if (territory.boundaryGeoJson) {
    try {
      const geo = territory.boundaryGeoJson as GeoJSON.Feature;
      return calculateAreaSqMiles(
        geo as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
      );
    } catch {
      // fall through
    }
  }
  if (territory.radiusMiles) {
    return Math.PI * territory.radiusMiles * territory.radiusMiles;
  }
  return 100; // Default assumption
}
