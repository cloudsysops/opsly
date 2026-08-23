/**
 * Free IP Geolocation using ip-api.com
 * Rate limit: 45 requests/minute (should be fine for our use case)
 * No API key required for basic usage
 */

interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  lat: number | null;
  lon: number | null;
}

interface IpApiResponse {
  status: string;
  country: string;
  regionName: string;
  city: string;
  timezone: string;
  lat: number;
  lon: number;
}

// Cache to avoid repeated lookups for same IP
const geoCache = new Map<string, GeoLocation>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Look up geographic location from IP address
 * Uses ip-api.com free service
 */
export async function lookupIpLocation(ipAddress: string): Promise<GeoLocation | null> {
  // Skip private/local IPs
  if (
    ipAddress === "unknown" ||
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("172.")
  ) {
    return null;
  }

  // Check cache
  const cached = geoCache.get(ipAddress);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,timezone,lat,lon`,
      {
        // Don't wait too long - geo is nice to have but not critical
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      console.debug(`IP lookup failed for ${ipAddress}: ${response.status}`);
      return null;
    }

    const data: IpApiResponse = await response.json();

    if (data.status !== "success") {
      return null;
    }

    const location: GeoLocation = {
      country: data.country || null,
      region: data.regionName || null,
      city: data.city || null,
      timezone: data.timezone || null,
      lat: data.lat || null,
      lon: data.lon || null,
    };

    // Cache the result
    geoCache.set(ipAddress, location);

    // Clean old cache entries periodically
    setTimeout(() => {
      geoCache.delete(ipAddress);
    }, CACHE_TTL);

    return location;
  } catch (error) {
    // Don't log errors for geo lookup - it's not critical
    console.debug(`IP lookup error for ${ipAddress}:`, error);
    return null;
  }
}

/**
 * Batch lookup for multiple IPs (respects rate limits)
 * Useful for backfilling existing sessions
 */
export async function batchLookupIps(
  ipAddresses: string[],
  delayMs = 1500 // ~40 requests/minute to stay under limit
): Promise<Map<string, GeoLocation | null>> {
  const results = new Map<string, GeoLocation | null>();

  for (const ip of ipAddresses) {
    const location = await lookupIpLocation(ip);
    results.set(ip, location);

    // Respect rate limits
    if (ipAddresses.indexOf(ip) < ipAddresses.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
