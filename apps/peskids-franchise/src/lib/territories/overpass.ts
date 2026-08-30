// OpenStreetMap Overpass API client for POI/competitor search

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export interface POIResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  tags: Record<string, string>;
  address?: string;
}

export interface POIBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const POI_CATEGORIES: Record<
  string,
  { label: string; query: string }
> = {
  schools: {
    label: "Schools",
    query: '["amenity"="school"]',
  },
  competitors: {
    label: "Competitors",
    query: '["amenity"~"school|community_centre"]["name"~"chess|tutor|kumon|mathnasium|learning|sylvan",i]',
  },
  community: {
    label: "Community Centers",
    query: '["amenity"~"community_centre|library|social_facility"]',
  },
  recreation: {
    label: "Recreation",
    query: '["leisure"~"sports_centre|fitness_centre"]',
  },
  childcare: {
    label: "Childcare",
    query: '["amenity"~"childcare|kindergarten"]',
  },
};

export async function searchPOI(
  bounds: POIBounds,
  category: string
): Promise<POIResult[]> {
  const categoryDef = POI_CATEGORIES[category];
  if (!categoryDef) {
    throw new Error(`Unknown POI category: ${category}`);
  }

  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `[out:json][timeout:30];(node${categoryDef.query}(${bbox});way${categoryDef.query}(${bbox}););out center 100;`;

  return executeQuery(query, category);
}

export async function searchCustom(
  bounds: POIBounds,
  keyword: string
): Promise<POIResult[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const escapedKeyword = keyword.replace(/"/g, '\\"');
  const query = `[out:json][timeout:30];(node["name"~"${escapedKeyword}",i](${bbox});way["name"~"${escapedKeyword}",i](${bbox}););out center 100;`;

  return executeQuery(query, "custom");
}

async function executeQuery(
  query: string,
  category: string
): Promise<POIResult[]> {
  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const results: POIResult[] = [];

    for (const element of data.elements || []) {
      const lat = element.lat || element.center?.lat;
      const lng = element.lon || element.center?.lon;
      if (!lat || !lng) continue;

      const name = element.tags?.name || "Unknown";
      const address = [
        element.tags?.["addr:housenumber"],
        element.tags?.["addr:street"],
        element.tags?.["addr:city"],
      ]
        .filter(Boolean)
        .join(" ");

      results.push({
        id: String(element.id),
        name,
        lat,
        lng,
        category,
        tags: element.tags || {},
        address: address || undefined,
      });
    }

    return results;
  } catch (error) {
    console.error("Overpass query error:", error);
    return [];
  }
}
