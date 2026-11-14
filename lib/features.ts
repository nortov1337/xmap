import type { GlyphName } from "./icons";
import type { FeatureKind, FeatureStyle } from "./types";

export const PALETTE = [
  "#e2603f",
  "#2f6df6",
  "#1f9d7a",
  "#e0a52e",
  "#9b6bdd",
  "#d9578e",
  "#4aa8c0",
  "#5b6472",
];

export function defaultStyle(kind: FeatureKind): FeatureStyle {
  return {
    color: kind === "text" ? "#1f2937" : PALETTE[0],
    fillOpacity: 0.22,
    strokeWidth: 2,
    size: kind === "text" ? 16 : 12,
    rotation: 0,
  };
}

export function featureIcon(kind: FeatureKind): GlyphName {
  switch (kind) {
    case "marker":
      return "pin";
    case "text":
      return "text";
    case "line":
      return "line";
    case "arrow":
      return "arrow";
    case "circle":
      return "circle";
    case "rectangle":
      return "square";
    default:
      return "polygon";
  }
}

export function kindLabel(kind: FeatureKind): string {
  switch (kind) {
    case "marker":
      return "Marker";
    case "text":
      return "Text";
    case "line":
      return "Line";
    case "arrow":
      return "Arrow";
    case "circle":
      return "Circle";
    case "rectangle":
      return "Rectangle";
    default:
      return "Area";
  }
}
