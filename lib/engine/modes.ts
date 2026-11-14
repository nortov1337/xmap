import type { FeatureKind, Layer, MapFeature, Tool } from "../types";

export const MODE_BY_TOOL: Record<Tool, string> = {
  select: "select",
  marker: "point",
  text: "idle",
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "linestring",
};

export const KIND_BY_TOOL: Partial<Record<Tool, FeatureKind>> = {
  marker: "marker",
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "line",
};

export const MODE_BY_KIND: Record<FeatureKind, string> = {
  marker: "point",
  text: "idle",
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "linestring",
  arrow: "polygon",
};

export function isEditable(feature: MapFeature, layer: Layer | undefined): boolean {
  return Boolean(layer?.visible) && !layer?.locked && feature.kind !== "text";
}
