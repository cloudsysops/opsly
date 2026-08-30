/**
 * Territory engine — pure validation and basic exclusivity conflict detection.
 *
 * No GIS engine is embedded. Geometry/metadata is persisted as `GeoReference`
 * and only conservative checks are done here:
 *  - radius/radius and point/radius overlap via haversine distance;
 *  - polygon overlap via axis-aligned bounding boxes (must be refined with a
 *    real GIS provider for enforcement);
 *  - municipality and polygon-with-different-types report `confidence: 'unknown'`
 *    so a human reviewer confirms before enforcing exclusivity.
 */

import type { GeoReference, Territory, TerritoryExclusiveFor } from './types.js';

export type OverlapOutcome = {
  overlapping: boolean;
  confidence: 'high' | 'unknown';
  reason: string;
};

export type TerritoryConflict = {
  aId: string;
  bId: string;
  reason: string;
  confidence: 'high' | 'unknown';
};

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance between two lat/lng points in meters. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Axis-aligned bounding box of a geo reference (null when not computable). */
function boundingBox(
  geo: GeoReference
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  switch (geo.kind) {
    case 'point':
      return {
        minLat: geo.lat - 0.01,
        maxLat: geo.lat + 0.01,
        minLng: geo.lng - 0.01,
        maxLng: geo.lng + 0.01,
      };
    case 'radius': {
      return {
        minLat: geo.center.lat - 0.01,
        maxLat: geo.center.lat + 0.01,
        minLng: geo.center.lng - 0.01,
        maxLng: geo.center.lng + 0.01,
      };
    }
    case 'polygon': {
      const lats = geo.vertices.map((v) => v.lat);
      const lngs = geo.vertices.map((v) => v.lng);
      return {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      };
    }
    case 'municipality':
      return null;
  }
}

function boxesOverlap(
  a: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  b: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): boolean {
  return (
    a.minLat <= b.maxLat && a.maxLat >= b.minLat && a.minLng <= b.maxLng && a.maxLng >= b.minLng
  );
}

function centerOf(geo: GeoReference): { lat: number; lng: number } | null {
  switch (geo.kind) {
    case 'point':
      return { lat: geo.lat, lng: geo.lng };
    case 'radius':
      return { lat: geo.center.lat, lng: geo.center.lng };
    case 'polygon': {
      const n = geo.vertices.length;
      if (n === 0) return null;
      const lat = geo.vertices.reduce((s, v) => s + v.lat, 0) / n;
      const lng = geo.vertices.reduce((s, v) => s + v.lng, 0) / n;
      return { lat, lng };
    }
    case 'municipality':
      return null;
  }
}

function effectiveRadiusMeters(geo: GeoReference): number | null {
  switch (geo.kind) {
    case 'point':
      return geo.radiusMeters ?? null;
    case 'radius':
      return geo.radiusMeters;
    default:
      return null;
  }
}

/**
 * True when both territories are active on overlapping dates. When either date
 * window is missing, we assume no date conflict (open-ended).
 */
function dateWindowsOverlap(a: Territory, b: Territory): boolean {
  const aStart = a.validFrom ? new Date(a.validFrom).getTime() : Number.NEGATIVE_INFINITY;
  const aEnd = a.validTo ? new Date(a.validTo).getTime() : Number.POSITIVE_INFINITY;
  const bStart = b.validFrom ? new Date(b.validFrom).getTime() : Number.NEGATIVE_INFINITY;
  const bEnd = b.validTo ? new Date(b.validTo).getTime() : Number.POSITIVE_INFINITY;
  return aStart <= bEnd && bStart <= aEnd;
}

/** Only territories covering the same service model can conflict. */
function serviceModelsOverlap(a: Territory, b: Territory): boolean {
  if (a.serviceModel && b.serviceModel && a.serviceModel !== b.serviceModel) {
    return false;
  }
  return true;
}

function exclusiveForCovers(aFor: TerritoryExclusiveFor, bFor: TerritoryExclusiveFor): boolean {
  const pair = [aFor, bFor].slice().sort() as TerritoryExclusiveFor[];
  if (pair[0] === 'both') return true;
  if (pair.includes('fixed_location') && pair.includes('home_service')) return false;
  return pair[0] === pair[1];
}

/**
 * Conservative overlap check between two territories. Only exclusive territories
 * that are active on overlapping windows for the same delivery model conflict.
 */
export function territoriesOverlap(a: Territory, b: Territory): OverlapOutcome {
  if (a.unitId && b.unitId && a.unitId === b.unitId) {
    return { overlapping: true, confidence: 'high', reason: 'same_unit' };
  }
  if (!a.exclusive || !b.exclusive) {
    return { overlapping: false, confidence: 'high', reason: 'non_exclusive' };
  }
  const aFor = a.exclusiveFor ?? 'fixed_location';
  const bFor = b.exclusiveFor ?? 'fixed_location';
  if (!exclusiveForCovers(aFor, bFor)) {
    return { overlapping: false, confidence: 'high', reason: 'different_delivery_models' };
  }
  if (!serviceModelsOverlap(a, b)) {
    return { overlapping: false, confidence: 'high', reason: 'different_service_models' };
  }
  if (!dateWindowsOverlap(a, b)) {
    return { overlapping: false, confidence: 'high', reason: 'non_overlapping_dates' };
  }
  if (!a.geo || !b.geo) {
    return { overlapping: false, confidence: 'unknown', reason: 'missing_geometry' };
  }

  const aRadius = effectiveRadiusMeters(a.geo);
  const bRadius = effectiveRadiusMeters(b.geo);
  if (aRadius !== null && bRadius !== null) {
    const aCenter = centerOf(a.geo);
    const bCenter = centerOf(b.geo);
    if (aCenter && bCenter) {
      const distance = haversineMeters(aCenter, bCenter);
      return {
        overlapping: distance <= aRadius + bRadius,
        confidence: 'high',
        reason: `radius_overlap_distance_${Math.round(distance)}m_vs_sum_${Math.round(aRadius + bRadius)}m`,
      };
    }
  }

  const aBox = boundingBox(a.geo);
  const bBox = boundingBox(b.geo);
  if (aBox && bBox && !boxesOverlap(aBox, bBox)) {
    return { overlapping: false, confidence: 'high', reason: 'bboxes_disjoint' };
  }

  if (a.geo.kind === 'municipality' || b.geo.kind === 'municipality') {
    return {
      overlapping: false,
      confidence: 'unknown',
      reason: 'municipality_needs_reference_data',
    };
  }

  return { overlapping: true, confidence: 'unknown', reason: 'bbox_overlap_requires_gis_review' };
}

/**
 * Computes the list of conflicting exclusive territory pairs within a tenant.
 * Pairs sharing the same unitId are skipped (a unit cannot conflict with itself).
 */
export function findExclusiveTerritoryConflicts(
  territories: readonly Territory[]
): TerritoryConflict[] {
  const conflicts: TerritoryConflict[] = [];
  for (let i = 0; i < territories.length; i += 1) {
    for (let j = i + 1; j < territories.length; j += 1) {
      const a = territories[i];
      const b = territories[j];
      if (a.unitId && b.unitId && a.unitId === b.unitId) continue;
      const outcome = territoriesOverlap(a, b);
      if (outcome.overlapping) {
        conflicts.push({
          aId: a.id,
          bId: b.id,
          reason: outcome.reason,
          confidence: outcome.confidence,
        });
      }
    }
  }
  return conflicts;
}

export type TerritoryValidation = { valid: boolean; errors: string[] };

/** Structural validation — cheap pre-insert checks (full details also enforced by zod). */
export function validateTerritory(t: Territory): TerritoryValidation {
  const errors: string[] = [];
  if (!t.name.trim()) errors.push('name_required');
  if (t.status === 'archived') {
    return { valid: errors.length === 0, errors };
  }
  if (t.exclusive && !t.exclusiveFor) errors.push('exclusive_territory_needs_exclusiveFor');
  if (t.validFrom && t.validTo && new Date(t.validFrom).getTime() > new Date(t.validTo).getTime()) {
    errors.push('invalid_date_range');
  }
  if (!t.geo && t.type === 'polygon') errors.push('polygon_needs_geo');
  return { valid: errors.length === 0, errors };
}

export function territoryTypeFromGeo(geo: GeoReference): Territory['type'] {
  switch (geo.kind) {
    case 'point':
    case 'radius':
      return 'radius';
    case 'polygon':
      return 'polygon';
    case 'municipality':
      return 'municipality';
  }
}
