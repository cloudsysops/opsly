// Mapbox Geocoding API batch processor

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || "";

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  confidence: number;
}

export interface GeocodeBatchResult {
  results: GeocodeResult[];
  failed: string[];
  successRate: number;
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; confidence: number } | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=US&limit=1&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    return {
      lat: feature.center[1],
      lng: feature.center[0],
      confidence: feature.relevance || 0,
    };
  } catch {
    return null;
  }
}

export async function batchGeocode(
  addresses: string[],
  onProgress?: (done: number, total: number) => void
): Promise<GeocodeBatchResult> {
  const results: GeocodeResult[] = [];
  const failed: string[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const result = await geocodeAddress(address);

    if (result) {
      results.push({
        address,
        lat: result.lat,
        lng: result.lng,
        confidence: result.confidence,
      });
    } else {
      failed.push(address);
    }

    onProgress?.(i + 1, addresses.length);

    // Rate limiting: ~10 req/sec to stay under 600/min
    if (i < addresses.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    results,
    failed,
    successRate:
      addresses.length > 0 ? results.length / addresses.length : 0,
  };
}
