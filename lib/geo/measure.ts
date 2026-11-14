import * as turf from "@turf/turf";
import type { Geometry, LineString, Polygon } from "geojson";
import { round7, type Pair } from "./coords";

export function areaKm2(geom: Geometry): number | undefined {
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return undefined;
  try {
    return turf.area(turf.feature(geom)) / 1e6;
  } catch {
    return undefined;
  }
}

export function lengthKm(geom: Geometry): number | undefined {
  if (geom.type !== "LineString" && geom.type !== "MultiLineString") return undefined;
  try {
    return turf.length(turf.feature(geom), { units: "kilometers" });
  } catch {
    return undefined;
  }
}

export function vertexCount(geom: Geometry): number | undefined {
  if (geom.type === "Polygon") {
    return geom.coordinates.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0);
  }
  if (geom.type === "LineString") return geom.coordinates.length;
  return undefined;
}

export function insertVertexAt(
  geom: Geometry,
  lng: number,
  lat: number,
): { geometry: Polygon | LineString; point: Pair } | null {
  if (geom.type !== "Polygon" && geom.type !== "LineString") return null;

  const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates;
  if (!ring || ring.length < 2) return null;

  const nearest = turf.nearestPointOnLine(turf.lineString(ring), turf.point([lng, lat]));
  const index = nearest.properties.index ?? 0;
  const [nearLng, nearLat] = nearest.geometry.coordinates as Pair;
  const point: Pair = [round7(nearLng), round7(nearLat)];

  const coords = ring.slice();
  coords.splice(index + 1, 0, point);

  const geometry: Polygon | LineString =
    geom.type === "Polygon"
      ? { ...geom, coordinates: [coords, ...geom.coordinates.slice(1)] }
      : { ...geom, coordinates: coords };

  return { geometry, point };
}
