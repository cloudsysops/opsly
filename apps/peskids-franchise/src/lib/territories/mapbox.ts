// Mapbox utility helpers for TerritoryIQ
import * as turf from "@turf/turf";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const MAP_STYLES = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

export const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]; // US center
export const DEFAULT_ZOOM = 4;

// Status-based territory colors
export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#34B256",   // brand-green
  RESERVED: "#F79A30",    // brand-orange
  SOLD: "#2D2F8E",        // brand-navy
  ACTIVE: "#50C8DF",      // brand-cyan
  COMING_SOON: "#6A469D", // brand-purple
  UNAVAILABLE: "#9CA3AF", // gray-400
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.UNAVAILABLE;
}

// Generate a circle GeoJSON polygon from center + radius
export function createCirclePolygon(
  center: [number, number],
  radiusMiles: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  return turf.circle(center, radiusMiles, { steps, units: "miles" });
}

// Check if two GeoJSON polygons overlap
export function checkOverlap(
  polygon1: GeoJSON.Feature<GeoJSON.Polygon>,
  polygon2: GeoJSON.Feature<GeoJSON.Polygon>
): { overlaps: boolean; overlapArea?: number; overlapPercentage?: number } {
  const intersection = turf.intersect(
    turf.featureCollection([polygon1, polygon2])
  );
  if (!intersection) {
    return { overlaps: false };
  }
  const overlapArea = turf.area(intersection) / 2589988.11; // sq meters to sq miles
  const area1 = turf.area(polygon1) / 2589988.11;
  const overlapPercentage = (overlapArea / area1) * 100;
  return { overlaps: true, overlapArea, overlapPercentage };
}

// Calculate area of a polygon in square miles
export function calculateAreaSqMiles(
  polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): number {
  return turf.area(polygon) / 2589988.11;
}

// Get bounding box of a GeoJSON feature
export function getBounds(
  feature: GeoJSON.Feature
): [[number, number], [number, number]] {
  const bbox = turf.bbox(feature);
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]],
  ];
}

// Convert territories to GeoJSON FeatureCollection for map rendering
export interface TerritoryData {
  id: string;
  name: string;
  state: string;
  status: string;
  boundaryGeoJson?: unknown;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMiles?: number | null;
  color?: string | null;
  territoryScore?: number | null;
  franchiseeAccount?: {
    prospect: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

export function territoriesToGeoJSON(
  territories: TerritoryData[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const territory of territories) {
    let geometry: GeoJSON.Geometry | null = null;

    if (territory.boundaryGeoJson) {
      // Use stored GeoJSON boundary
      const geo = territory.boundaryGeoJson as GeoJSON.Geometry | GeoJSON.Feature;
      geometry = "type" in geo && geo.type === "Feature"
        ? (geo as GeoJSON.Feature).geometry
        : geo as GeoJSON.Geometry;
    } else if (territory.centerLat && territory.centerLng && territory.radiusMiles) {
      // Generate circle from center + radius
      const circle = createCirclePolygon(
        [territory.centerLng, territory.centerLat],
        territory.radiusMiles
      );
      geometry = circle.geometry;
    }

    if (geometry) {
      features.push({
        type: "Feature",
        id: territory.id,
        geometry,
        properties: {
          id: territory.id,
          name: territory.name,
          state: territory.state,
          status: territory.status,
          color: territory.color || getStatusColor(territory.status),
          score: territory.territoryScore,
          franchisee: territory.franchiseeAccount
            ? `${territory.franchiseeAccount.prospect.firstName} ${territory.franchiseeAccount.prospect.lastName}`
            : null,
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
