import type { Geometry } from "geojson";
import { defaultStyle } from "../features";
import type { FeatureKind, MapFeature } from "../types";

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
