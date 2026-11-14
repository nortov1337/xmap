import type {
  BasemapKey,
  FeatureKind,
  FeatureStyle,
  Layer,
  Tool,
} from "./types";

export const BASEMAPS: Record<BasemapKey, { url: string; label: string }> = {
  positron: {
    url: "https://tiles.openfreemap.org/styles/positron",
    label: "Светлая",
  },
  liberty: {
    url: "https://tiles.openfreemap.org/styles/liberty",
    label: "Цветная",
  },
  dark: { url: "https://tiles.openfreemap.org/styles/dark", label: "Тёмная" },
};

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

export const TOOL_KEYS: Record<string, Tool> = {
  KeyV: "select",
  KeyM: "marker",
  KeyT: "text",
  KeyL: "line",
  KeyA: "arrow",
  KeyP: "polygon",
  KeyR: "rectangle",
  KeyO: "circle",
};

export function defaultStyle(kind: FeatureKind): FeatureStyle {
  return {
    color: kind === "text" ? "#1f2937" : PALETTE[0],
    fillOpacity: 0.22,
    strokeWidth: 2,
    size: kind === "text" ? 16 : 12,
    rotation: 0,
  };
}

export function newLayer(index: number): Layer {
  return {
    id: crypto.randomUUID(),
    name: `Слой ${index}`,
    visible: true,
    locked: false,
    opacity: 1,
  };
}

export function featureIcon(kind: FeatureKind): string {
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
      return "Метка";
    case "text":
      return "Текст";
    case "line":
      return "Линия";
    case "arrow":
      return "Стрелка";
    case "circle":
      return "Круг";
    case "rectangle":
      return "Прямоугольник";
    default:
      return "Область";
  }
}
