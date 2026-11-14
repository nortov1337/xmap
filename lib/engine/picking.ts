import type { Geometry } from "geojson";
import type { Map as MlMap, MapGeoJSONFeature, Point } from "maplibre-gl";

import type { Layer } from "../types";
import { LAYER_SUFFIXES, layerPaintId } from "./layerIds";

export const HIT_RADIUS = 6;
export const TOUCH_HIT_RADIUS = 16;

export function featureIdFromHit(hit: MapGeoJSONFeature): string | null {
  const raw = hit.properties?.fid;
  if (typeof raw === "string" && raw) return raw;
  return hit.id === undefined ? null : String(hit.id);
}

export function pickableLayers(map: MlMap, layers: Layer[]): string[] {
  const ids: string[] = [];
  for (const layer of layers) {
    if (!layer.visible || layer.locked) continue;
    for (const suffix of LAYER_SUFFIXES) {
      const id = layerPaintId(layer.id, suffix);
      if (map.getLayer(id)) ids.push(id);
    }
  }
  return ids;
}

export function hitTest(
  map: MlMap,
  layers: Layer[],
  point: Point,
  radius: number = HIT_RADIUS,
): MapGeoJSONFeature | null {
  const ids = pickableLayers(map, layers);
  if (!ids.length) return null;
  const hits = map.queryRenderedFeatures(
    [
      [point.x - radius, point.y - radius],
      [point.x + radius, point.y + radius],
    ],
    { layers: ids },
  );
  return hits.length ? hits[0] : null;
}

export function idsInBounds(map: MlMap, layers: Layer[], a: Point, b: Point): string[] {
  const ids = pickableLayers(map, layers);
  if (!ids.length) return [];

  const hits = map.queryRenderedFeatures(
    [
      [Math.min(a.x, b.x), Math.min(a.y, b.y)],
      [Math.max(a.x, b.x), Math.max(a.y, b.y)],
    ],
    { layers: ids },
  );

  const found = new Set<string>();
  for (const hit of hits) {
    const id = featureIdFromHit(hit);
    if (id) found.add(id);
  }
  return [...found];
}

export function nearHandle(map: MlMap, geometry: Geometry, point: Point): boolean {
  const coords =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.type === "LineString"
        ? geometry.coordinates
        : null;
  if (!coords) return true;

  const screen = coords.map((coord) => map.project(coord as [number, number]));
  const near = (candidate: { x: number; y: number }, distance: number) =>
    Math.hypot(candidate.x - point.x, candidate.y - point.y) < distance;

  for (let i = 0; i < screen.length; i += 1) {
    if (near(screen[i], 10)) return true;
    if (i === screen.length - 1) break;
    const mid = {
      x: (screen[i].x + screen[i + 1].x) / 2,
      y: (screen[i].y + screen[i + 1].y) / 2,
    };
    if (near(mid, 12)) return true;
  }
  return false;
}
