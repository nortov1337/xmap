import * as turf from "@turf/turf";
import type { Geometry, LineString, Polygon } from "geojson";
import { defaultStyle } from "./config";
import type { FeatureKind, MapFeature } from "./types";

export type Pair = [number, number];

export function round7(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

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

type MercatorPoint = { x: number; y: number };

function toMercator(lng: number, lat: number): MercatorPoint {
  const point = turf.toMercator(turf.point([lng, lat]));
  return { x: point.geometry.coordinates[0], y: point.geometry.coordinates[1] };
}

function toWgs(point: MercatorPoint): Pair {
  const wgs = turf.toWgs84(turf.point([point.x, point.y]));
  return [round7(wgs.geometry.coordinates[0]), round7(wgs.geometry.coordinates[1])];
}

function polylineLength(points: MercatorPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function samplePolyline(
  points: MercatorPoint[],
  distance: number,
): { point: MercatorPoint; angle: number } {
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (travelled + segment >= distance || i === points.length - 1) {
      const ratio = segment === 0 ? 0 : Math.min(1, (distance - travelled) / segment);
      return {
        point: { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio },
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    travelled += segment;
  }
  const last = points[points.length - 1];
  return { point: last, angle: 0 };
}

export type ArrowOptions = {
  widthStart?: number;
  widthEnd?: number;
  headLength?: number;
  headWidth?: number;
};

/** Builds a tapered arrow polygon out of the drawn centre line. */
export function arrowFromLine(line: LineString, options: ArrowOptions = {}): Polygon | null {
  const coords = line.coordinates as Pair[];
  if (coords.length < 2) return null;

  const widthStart = options.widthStart ?? 9000;
  const widthEnd = options.widthEnd ?? 3000;
  const headLength = options.headLength ?? 18000;
  const headWidth = options.headWidth ?? 15000;

  const merc = coords.map(([lng, lat]) => toMercator(lng, lat));
  const total = polylineLength(merc);
  if (total < 200) return null;

  const head = Math.min(headLength, total * 0.4);
  const shaft = Math.max(total - head, total * 0.35);
  const samples = 12;

  const left: Pair[] = [];
  const right: Pair[] = [];

  for (let i = 0; i <= samples; i++) {
    const distance = (shaft * i) / samples;
    const { point, angle } = samplePolyline(merc, distance);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const width = widthStart + (widthEnd - widthStart) * (i / samples);
    left.push(toWgs({ x: point.x + nx * (width / 2), y: point.y + ny * (width / 2) }));
    right.push(toWgs({ x: point.x - nx * (width / 2), y: point.y - ny * (width / 2) }));
  }

  const base = samplePolyline(merc, shaft);
  const bx = -Math.sin(base.angle);
  const by = Math.cos(base.angle);
  const headLeft = toWgs({
    x: base.point.x + bx * (headWidth / 2),
    y: base.point.y + by * (headWidth / 2),
  });
  const headRight = toWgs({
    x: base.point.x - bx * (headWidth / 2),
    y: base.point.y - by * (headWidth / 2),
  });
  const tip = toWgs(samplePolyline(merc, total).point);

  const ring: Pair[] = [...left, headLeft, tip, headRight, ...right.reverse()];
  ring.push(ring[0]);

  return { type: "Polygon", coordinates: [ring] };
}

export function translateGeometry(geom: Geometry, dLng: number, dLat: number): Geometry {
  const shift = (coords: unknown): unknown => {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      return [round7((coords[0] as number) + dLng), round7((coords[1] as number) + dLat)];
    }
    if (Array.isArray(coords)) return coords.map(shift);
    return coords;
  };

  return { ...geom, coordinates: shift((geom as { coordinates: unknown }).coordinates) } as Geometry;
}

export function geometryCenter(geom: Geometry): Pair {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const walk = (coords: unknown) => {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      const [lng, lat] = coords as Pair;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    if (Array.isArray(coords)) coords.forEach(walk);
  };

  walk((geom as { coordinates?: unknown }).coordinates);
  if (minLng === Infinity) return [0, 0];
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

const KIND_BY_GEOMETRY: Record<string, FeatureKind> = {
  Point: "marker",
  LineString: "line",
  Polygon: "polygon",
};

function splitGeometry(geom: Geometry): Geometry[] {
  switch (geom.type) {
    case "MultiPoint":
      return geom.coordinates.map((coordinates) => ({ type: "Point", coordinates }));
    case "MultiLineString":
      return geom.coordinates.map((coordinates) => ({ type: "LineString", coordinates }));
    case "MultiPolygon":
      return geom.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
    case "GeometryCollection":
      return geom.geometries.flatMap(splitGeometry);
    default:
      return [geom];
  }
}

function pickText(properties: Record<string, unknown> | null, keys: string[]): string {
  for (const key of keys) {
    const value = properties?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function pushGeometry(
  geometry: Geometry,
  properties: Record<string, unknown> | null,
  layerId: string,
  out: MapFeature[],
) {
  for (const part of splitGeometry(geometry)) {
    const kind = KIND_BY_GEOMETRY[part.type] ?? "polygon";
    const style = defaultStyle(kind);
    const color = properties?.color;
    if (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color)) style.color = color;

    out.push({
      id: crypto.randomUUID(),
      layerId,
      kind,
      geom: part,
      title: pickText(properties, ["title", "name"]),
      description: pickText(properties, ["description", "desc"]),
      label: "",
      style,
    });
  }
}

/** Turns a GeoJSON document (collection, feature, geometry or file) into map features. */
export function featuresFromGeoJson(input: unknown, layerId: string): MapFeature[] {
  const out: MapFeature[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as { type?: string; [key: string]: unknown };

    if (record.type === "FeatureCollection") {
      if (Array.isArray(record.features)) record.features.forEach(visit);
      return;
    }
    if (record.type === "Feature") {
      if (record.geometry) {
        pushGeometry(
          record.geometry as Geometry,
          (record.properties ?? null) as Record<string, unknown> | null,
          layerId,
          out,
        );
      }
      return;
    }
    pushGeometry(record as unknown as Geometry, null, layerId, out);
  };

  visit(input);
  return out;
}
