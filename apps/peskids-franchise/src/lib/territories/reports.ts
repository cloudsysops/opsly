// Territory report data assembly

export interface TerritoryReport {
  name: string;
  state: string;
  status: string;
  areaSqMiles: number;
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    children5to12: number;
    householdsWithChildren: number;
    totalHouseholds: number;
  };
  competitorCount: number;
  schoolCount: number;
  score: number | null;
  scoreTier: string;
  franchisee: string | null;
  createdAt: string;
  executiveSummary: string;
}

export interface ComparisonReport {
  territories: TerritoryReport[];
  rankings: Record<string, string[]>;
  highlights: string[];
}

interface TerritoryInput {
  name: string;
  state: string;
  status: string;
  population?: number | null;
  medianIncome?: number | null;
  medianAge?: number | null;
  children5to12?: number | null;
  householdsWithChildren?: number | null;
  totalHouseholds?: number | null;
  competitorCount?: number | null;
  schoolCount?: number | null;
  territoryScore?: number | null;
  radiusMiles?: number | null;
  boundaryGeoJson?: unknown;
  createdAt?: Date | string;
  franchiseeAccount?: {
    prospect: { firstName: string; lastName: string };
  } | null;
}

export function generateTerritoryReport(
  territory: TerritoryInput,
  areaSqMiles: number
): TerritoryReport {
  const score = territory.territoryScore ?? null;
  let scoreTier = "Unscored";
  if (score !== null) {
    if (score >= 86) scoreTier = "Excellent";
    else if (score >= 71) scoreTier = "Strong";
    else if (score >= 51) scoreTier = "Average";
    else if (score >= 26) scoreTier = "Below Average";
    else scoreTier = "Poor";
  }

  const franchisee = territory.franchiseeAccount
    ? `${territory.franchiseeAccount.prospect.firstName} ${territory.franchiseeAccount.prospect.lastName}`
    : null;

  const pop = territory.population || 0;
  const income = territory.medianIncome || 0;
  const children = territory.children5to12 || 0;

  const summary = `${territory.name} (${territory.state}) is a ${areaSqMiles.toFixed(1)} sq mi territory with a population of ${pop.toLocaleString()}, median household income of $${income.toLocaleString()}, and ${children.toLocaleString()} children ages 5-12. ${score !== null ? `Territory viability score: ${score}/100 (${scoreTier}).` : "Territory has not been scored yet."} ${franchisee ? `Assigned to ${franchisee}.` : "Currently unassigned."}`;

  return {
    name: territory.name,
    state: territory.state,
    status: territory.status,
    areaSqMiles,
    demographics: {
      population: pop,
      medianIncome: income,
      medianAge: territory.medianAge || 0,
      children5to12: children,
      householdsWithChildren: territory.householdsWithChildren || 0,
      totalHouseholds: territory.totalHouseholds || 0,
    },
    competitorCount: territory.competitorCount || 0,
    schoolCount: territory.schoolCount || 0,
    score,
    scoreTier,
    franchisee,
    createdAt: territory.createdAt
      ? new Date(territory.createdAt as string).toISOString()
      : new Date().toISOString(),
    executiveSummary: summary,
  };
}

export function generateComparisonReport(
  reports: TerritoryReport[]
): ComparisonReport {
  const metrics = [
    "population",
    "medianIncome",
    "children5to12",
    "householdsWithChildren",
    "schoolCount",
    "score",
  ] as const;

  const rankings: Record<string, string[]> = {};
  const highlights: string[] = [];

  for (const metric of metrics) {
    const sorted = [...reports].sort((a, b) => {
      const av =
        metric === "score"
          ? (a.score ?? 0)
          : metric === "schoolCount"
            ? a.schoolCount
            : a.demographics[metric as keyof typeof a.demographics] ?? 0;
      const bv =
        metric === "score"
          ? (b.score ?? 0)
          : metric === "schoolCount"
            ? b.schoolCount
            : b.demographics[metric as keyof typeof b.demographics] ?? 0;
      return (bv as number) - (av as number);
    });
    rankings[metric] = sorted.map((r) => r.name);

    if (sorted.length > 0) {
      highlights.push(
        `${sorted[0].name} leads in ${metric.replace(/([A-Z])/g, " $1").toLowerCase()}`
      );
    }
  }

  return { territories: reports, rankings, highlights };
}
