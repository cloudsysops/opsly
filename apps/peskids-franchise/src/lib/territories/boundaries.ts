// Boundary data service for admin boundaries and ZIP codes
import * as turf from "@turf/turf";

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || "";
const CENSUS_TIGER_BASE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb";

export interface ZipSearchResult {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export async function fetchStateBoundary(
  stateCode: string
): Promise<GeoJSON.Feature | null> {
  try {
    const url = `${CENSUS_TIGER_BASE}/State_County/MapServer/0/query?where=STUSAB='${stateCode}'&outFields=*&f=geojson&outSR=4326`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0] as GeoJSON.Feature;
    }
    return null;
  } catch (error) {
    console.error("Error fetching state boundary:", error);
    return null;
  }
}

export async function fetchCountyBoundaries(
  stateCode: string
): Promise<GeoJSON.FeatureCollection> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) {
      return { type: "FeatureCollection", features: [] };
    }
    const url = `${CENSUS_TIGER_BASE}/State_County/MapServer/1/query?where=STATE='${stateFips}'&outFields=NAME,COUNTY,STATE&f=geojson&outSR=4326`;
    const response = await fetch(url);
    if (!response.ok) {
      return { type: "FeatureCollection", features: [] };
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching county boundaries:", error);
    return { type: "FeatureCollection", features: [] };
  }
}

export async function fetchZipBoundary(
  zipCode: string
): Promise<GeoJSON.Feature | null> {
  try {
    if (!MAPBOX_TOKEN) return null;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipCode}.json?types=postcode&country=US&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    const center: [number, number] = feature.center;
    // Approximate ZIP boundary as circle (~3 mile radius for average US ZIP)
    const circle = turf.circle(center, 3, { steps: 32, units: "miles" });
    circle.properties = {
      zip: zipCode,
      name: feature.place_name,
      center,
    };
    return circle;
  } catch (error) {
    console.error("Error fetching ZIP boundary:", error);
    return null;
  }
}

export async function mergeZipBoundaries(
  zipCodes: string[]
): Promise<GeoJSON.Feature | null> {
  const features: GeoJSON.Feature[] = [];
  for (const zip of zipCodes) {
    const boundary = await fetchZipBoundary(zip);
    if (boundary) features.push(boundary);
  }

  if (features.length === 0) return null;
  if (features.length === 1) return features[0];

  let merged = features[0];
  for (let i = 1; i < features.length; i++) {
    const result = turf.union(
      turf.featureCollection([
        merged as GeoJSON.Feature<GeoJSON.Polygon>,
        features[i] as GeoJSON.Feature<GeoJSON.Polygon>,
      ])
    );
    if (result) merged = result;
  }

  merged.properties = {
    zipCodes,
    zipCount: zipCodes.length,
    areaSqMiles: turf.area(merged) / 2589988.11,
  };
  return merged;
}

export async function searchZipCodes(
  query: string,
  stateCode?: string
): Promise<ZipSearchResult[]> {
  try {
    if (!MAPBOX_TOKEN) return [];
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=postcode&country=US&limit=10&access_token=${MAPBOX_TOKEN}`;
    if (stateCode) {
      url += `&region=${stateCode}`;
    }
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.features || []).map(
      (f: { text: string; place_name: string; center: [number, number] }) => ({
        zip: f.text,
        city: f.place_name.split(",")[0] || "",
        state: stateCode || "",
        lat: f.center[1],
        lng: f.center[0],
      })
    );
  } catch {
    return [];
  }
}

const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56",
};
