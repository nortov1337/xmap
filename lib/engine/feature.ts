import type { Feature, Geometry } from "geojson";
import { defaultStyle } from "../features";
import type { FeatureKind, MapFeature } from "../types";
import { MODE_BY_KIND } from "./modes";

export type FeatureProperties = {
  kind: FeatureKind;
  label: string;
  color: string;
  fillOpacity: number;
  strokeWidth: number;
  size: number;
  rotation: number;
};

export function featureProperties(feature: MapFeature): FeatureProperties {
  return {
    kind: feature.kind,
    label: feature.kind === "text" ? feature.label : feature.title,
    color: feature.style.color,
    fillOpacity: feature.style.fillOpacity,
    strokeWidth: feature.style.strokeWidth,
    size: feature.style.size,
    rotation: feature.style.rotation,
  };
}

export function toSourceFeature(feature: MapFeature, previewGeometry?: Geometry): Feature {
  return {
    type: "Feature",
    id: feature.id,
    properties: { ...featureProperties(feature), fid: feature.id },
    geometry: previewGeometry ?? feature.geom,
  };
}

export function toDrawFeature(feature: MapFeature) {
  return {
    type: "Feature" as const,
    id: feature.id,
    properties: { ...featureProperties(feature), mode: MODE_BY_KIND[feature.kind] },
    geometry: feature.geom,
  };
}

export function createFeature(kind: FeatureKind, geom: Geometry, layerId: string): MapFeature {
  return {
    id: crypto.randomUUID(),
    layerId,
    kind,
    geom,
    title: "",
    description: "",
    label: kind === "text" ? "Text" : "",
    style: defaultStyle(kind),
  };
}
