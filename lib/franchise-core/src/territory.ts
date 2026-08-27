import type { GeoPoint, Territory, TerritoryExclusiveFor, TerritoryGeometry } from './types.js';

export type TerritoryConflict = {
  aId: string;
  bId: string;
  reason: 'date_overlap' | 'exclusive_overlap';
  detail: string;
};

const EARTH_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function datesOverlap(aFrom: string, aTo: string | null, bFrom: string, bTo: string | null): boolean {
  const aEnd = aTo ?? '9999-12-31';
  const bEnd = bTo ?? '9999-12-31';
  return aFrom <= bEnd && bFrom <= aEnd;
}

function exclusiveForCollides(a: TerritoryExclusiveFor, b: TerritoryExclusiveFor): boolean {
  if (a === 'both' || b === 'both') return true;
  return a === b;
}

function normalizeAdmin(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function pointInRing(point: GeoPoint, ring: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.lng ?? 0;
    const yi = ring[i]?.lat ?? 0;
    const xj = ring[j]?.lng ?? 0;
    const yj = ring[j]?.lat ?? 0;
    const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function geometryOverlaps(a: TerritoryGeometry, b: TerritoryGeometry): boolean {
  if (a.kind === 'municipality' && b.kind === 'municipality') {
    return (
      a.countryCode.toUpperCase() === b.countryCode.toUpperCase() &&
      normalizeAdmin(a.adminName) === normalizeAdmin(b.adminName)
    );
  }
  if (a.kind === 'service_area' && b.kind === 'service_area') {
    return a.areaCode === b.areaCode;
  }
  if (a.kind === 'radius' && b.kind === 'radius') {
    return haversineKm(a.center, b.center) < a.radiusKm + b.radiusKm;
  }
  if (a.kind === 'polygon' && b.kind === 'polygon') {
    const aOuter = a.rings[0] ?? [];
    const bOuter = b.rings[0] ?? [];
    return aOuter.some((p) => pointInRing(p, bOuter)) || bOuter.some((p) => pointInRing(p, aOuter));
  }
  if (a.kind === 'radius' && b.kind === 'polygon') {
    return pointInRing(a.center, b.rings[0] ?? []);
  }
  if (a.kind === 'polygon' && b.kind === 'radius') {
    return pointInRing(b.center, a.rings[0] ?? []);
  }
  return false;
}

export function territoriesConflict(a: Territory, b: Territory): TerritoryConflict | null {
  if (a.id === b.id || a.tenantId !== b.tenantId) return null;
  if (a.status !== 'active' || b.status !== 'active') return null;
  if (!a.exclusive || !b.exclusive) return null;
  if (!exclusiveForCollides(a.exclusiveFor, b.exclusiveFor)) return null;
  if (!datesOverlap(a.validFrom, a.validTo, b.validFrom, b.validTo)) return null;
  if (!geometryOverlaps(a.geometry, b.geometry)) return null;
  return {
    aId: a.id,
    bId: b.id,
    reason: 'exclusive_overlap',
    detail: `${a.name} overlaps ${b.name} for ${a.exclusiveFor}/${b.exclusiveFor}`,
  };
}

export function findTerritoryConflicts(territories: readonly Territory[]): TerritoryConflict[] {
  const conflicts: TerritoryConflict[] = [];
  for (let i = 0; i < territories.length; i += 1) {
    for (let j = i + 1; j < territories.length; j += 1) {
      const left = territories[i];
      const right = territories[j];
      if (!left || !right) continue;
      const conflict = territoriesConflict(left, right);
      if (conflict) conflicts.push(conflict);
    }
  }
  return conflicts;
}
