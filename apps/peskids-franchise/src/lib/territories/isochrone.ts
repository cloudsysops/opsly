// OpenRouteService isochrone API client
import * as turf from "@turf/turf";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/isochrones";

export type IsochroneMode = "driving" | "walking" | "cycling";

const MODE_MAP: Record<IsochroneMode, string> = {
  driving: "driving-car",
  walking: "foot-walking",
  cycling: "cycling-regular",
};

let apiKey: string | null = null;
function getApiKey(): string {
  if (!apiKey) {
    apiKey = process.env.ORS_API_KEY || "";
    if (!apiKey) {
      throw new Error("ORS_API_KEY environment variable is not set");
    }
  }
  return apiKey;
}

let requestTimestamps: number[] = [];
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60_000;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_WINDOW_MS
  );
  if (requestTimestamps.length >= RATE_LIMIT) {
    const oldestInWindow = requestTimestamps[0];
    const waitMs = RATE_WINDOW_MS - (now - oldestInWindow) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  requestTimestamps.push(Date.now());
}

export async function generateIsochrone(
  center: [number, number],
  minutes: number,
  mode: IsochroneMode = "driving"
): Promise<GeoJSON.Feature<GeoJSON.Polygon>> {
  const key = getApiKey();
  const profile = MODE_MAP[mode];

  if (minutes < 1 || minutes > 120) {
    throw new Error("Travel time must be between 1 and 120 minutes");
  }

  await waitForRateLimit();

  const response = await fetch(`${ORS_BASE_URL}/${profile}`, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json, application/geo+json",
    },
    body: JSON.stringify({
      locations: [[center[0], center[1]]],
      range: [minutes * 60],
      range_type: "time",
      smoothing: 25,
      area_units: "mi",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouteService API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  if (!data.features || data.features.length === 0) {
    throw new Error("No isochrone polygon returned from API");
  }

  const feature = data.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
  feature.properties = {
    ...feature.properties,
    mode,
    minutes,
    center,
    generatedAt: new Date().toISOString(),
  };

  return feature;
}

export async function generateConcentricIsochrones(
  center: [number, number],
  intervals: number[],
  mode: IsochroneMode = "driving"
): Promise<GeoJSON.Feature[]> {
  const key = getApiKey();
  const profile = MODE_MAP[mode];

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  for (const interval of sortedIntervals) {
    if (interval < 1 || interval > 120) {
      throw new Error("All intervals must be between 1 and 120 minutes");
    }
  }

  await waitForRateLimit();

  const response = await fetch(`${ORS_BASE_URL}/${profile}`, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json, application/geo+json",
    },
    body: JSON.stringify({
      locations: [[center[0], center[1]]],
      range: sortedIntervals.map((m) => m * 60),
      range_type: "time",
      smoothing: 25,
      area_units: "mi",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouteService API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  if (!data.features || data.features.length === 0) {
    throw new Error("No isochrone polygons returned from API");
  }

  const features = (data.features as GeoJSON.Feature[]).reverse();

  return features.map((feature, index) => {
    const areaSqMiles = turf.area(feature) / 2589988.11;
    return {
      ...feature,
      properties: {
        ...feature.properties,
        mode,
        minutes: sortedIntervals[index],
        center,
        areaSqMiles,
        ringIndex: index,
        generatedAt: new Date().toISOString(),
      },
    };
  });
}
