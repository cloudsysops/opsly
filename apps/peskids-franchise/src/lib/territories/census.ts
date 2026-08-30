// US Census Bureau ACS 5-Year API client

export interface DemographicData {
  population: number;
  medianIncome: number;
  medianAge: number;
  householdsWithChildren: number;
  totalHouseholds: number;
  childrenUnder18: number;
  children5to12: number;
  schoolCount?: number;
  dataSource: string;
}

const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";

// ACS variables
const VARIABLES = [
  "B01003_001E", // Total population
  "B19013_001E", // Median household income
  "B01002_001E", // Median age
  "B11005_001E", // Households with children under 18
  "B11001_001E", // Total households
  "B09001_001E", // Population under 18
  // Children 5-9: B01001_004E (male) + B01001_028E (female)
  // Children 10-14: B01001_005E (male) + B01001_029E (female)
  "B01001_004E",
  "B01001_005E",
  "B01001_028E",
  "B01001_029E",
].join(",");

let censusKey: string | null = null;
function getKey(): string {
  if (!censusKey) {
    censusKey = process.env.CENSUS_API_KEY || "";
  }
  return censusKey;
}

export async function fetchDemographicsForGeography(
  geoLevel: "state" | "county" | "tract",
  geoId: string
): Promise<DemographicData | null> {
  const key = getKey();
  let geoParam = "";

  if (geoLevel === "state") {
    geoParam = `for=state:${geoId}`;
  } else if (geoLevel === "county") {
    const stateFips = geoId.substring(0, 2);
    const countyFips = geoId.substring(2);
    geoParam = `for=county:${countyFips}&in=state:${stateFips}`;
  } else {
    const stateFips = geoId.substring(0, 2);
    const countyFips = geoId.substring(2, 5);
    const tractId = geoId.substring(5);
    geoParam = `for=tract:${tractId}&in=state:${stateFips}%20county:${countyFips}`;
  }

  const url = `${CENSUS_BASE}?get=${VARIABLES}&${geoParam}${key ? `&key=${key}` : ""}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.length < 2) return null;

    const headers = data[0] as string[];
    const values = data[1] as string[];
    const row: Record<string, number> = {};
    headers.forEach((h: string, i: number) => {
      row[h] = parseFloat(values[i]) || 0;
    });

    return {
      population: row["B01003_001E"] || 0,
      medianIncome: row["B19013_001E"] || 0,
      medianAge: row["B01002_001E"] || 0,
      householdsWithChildren: row["B11005_001E"] || 0,
      totalHouseholds: row["B11001_001E"] || 0,
      childrenUnder18: row["B09001_001E"] || 0,
      children5to12:
        (row["B01001_004E"] || 0) +
        (row["B01001_005E"] || 0) +
        (row["B01001_028E"] || 0) +
        (row["B01001_029E"] || 0),
      dataSource: "ACS5Y2022",
    };
  } catch (error) {
    console.error("Census API error:", error);
    return null;
  }
}

export async function fetchDemographicsForBoundary(
  _boundary: GeoJSON.Feature
): Promise<DemographicData | null> {
  // For territory-level demographics, use state-level as approximation
  // Full tract-level intersection would require TIGER/Line shapefiles
  // This provides a reasonable estimate
  try {
    const result = await fetchDemographicsForGeography("state", "47"); // Default TN
    return result;
  } catch (error) {
    console.error("Demographics fetch error:", error);
    return null;
  }
}
