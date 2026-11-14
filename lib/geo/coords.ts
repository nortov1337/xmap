import type { Geometry } from "geojson";

export type Pair = [number, number];
export type Bounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };

export function round7(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

function walkCoordinates(
  coords: unknown,
  visit: (lng: number, lat: number) => Pair | null,
): unknown {
  if (Array.isArray(coords) && typeof coords[0] === "number") {
    return visit(coords[0] as number, coords[1] as number) ?? coords;
  }
  if (Array.isArray(coords)) return coords.map((child) => walkCoordinates(child, visit));
  return coords;
}

function eachCoordinate(coords: unknown, visit: (lng: number, lat: number) => void): void {
  walkCoordinates(coords, (lng, lat) => {
    visit(lng, lat);
    return null;
  });
}

function mapCoordinates(
  coords: unknown,
  transform: (lng: number, lat: number) => Pair,
): unknown {
  return walkCoordinates(coords, transform);
}

export function translateGeometry(geom: Geometry, dLng: number, dLat: number): Geometry {
  const coordinates = mapCoordinates(
    (geom as { coordinates?: unknown }).coordinates,
    (lng, lat) => [round7(lng + dLng), round7(lat + dLat)],
  );

  return { ...geom, coordinates } as Geometry;
}

export function geometryBounds(geom: Geometry): Bounds | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  eachCoordinate((geom as { coordinates?: unknown }).coordinates, (lng, lat) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  if (minLng === Infinity) return null;
  return { minLng, minLat, maxLng, maxLat };
}

export function geometryCenter(geom: Geometry): Pair {
  const bounds = geometryBounds(geom);
  if (!bounds) return [0, 0];
  return [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2];
}

export function pointInBounds(geom: Geometry, lng: number, lat: number, pad = 0.0005): boolean {
  const bounds = geometryBounds(geom);
  if (!bounds) return false;
  return (
    lng >= bounds.minLng - pad &&
    lng <= bounds.maxLng + pad &&
    lat >= bounds.minLat - pad &&
    lat <= bounds.maxLat + pad
  );
}
