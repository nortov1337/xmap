import type { HexColor } from "terra-draw";

const DEFAULT_COLOR = "#e2603f";

type StyledFeature = { properties: Record<string, unknown> };

function hex(value: string | undefined, fallback: string): HexColor {
  return (value ?? fallback) as HexColor;
}

function color(feature: StyledFeature): HexColor {
  return hex(feature.properties.color as string, DEFAULT_COLOR);
}

function fillOpacity(feature: StyledFeature): number {
  return Number(feature.properties.fillOpacity ?? 0.22);
}

function strokeWidth(feature: StyledFeature): number {
  return Number(feature.properties.strokeWidth ?? 2);
}

export function shapeStyles() {
  return {
    fillColor: color,
    fillOpacity,
    outlineColor: color,
    outlineWidth: strokeWidth,
    outlineOpacity: 1,
  };
}

export function lineStyles() {
  return {
    lineStringColor: color,
    lineStringWidth: strokeWidth,
    lineStringOpacity: 1,
  };
}

export function pointStyles() {
  return {
    pointColor: color,
    pointWidth: 9,
    pointOutlineColor: hex("#ffffff", "#ffffff"),
    pointOutlineWidth: 2.5,
  };
}

export function selectModeStyles() {
  return {
    selectionPointColor: "#ffffff",
    selectionPointOutlineColor: "#2f6df6",
    selectionPointWidth: 7,
    selectionPointOutlineWidth: 2,
    midPointColor: "#bcd0fb",
    midPointWidth: 6,
    midPointOutlineColor: "#ffffff",
    midPointOutlineWidth: 1.5,
    selectedPolygonColor: color,
    selectedPolygonFillOpacity: fillOpacity,
    selectedPolygonOutlineColor: color,
    selectedPolygonOutlineWidth: strokeWidth,
    selectedPolygonOutlineOpacity: 1,
    selectedLineStringColor: color,
    selectedLineStringWidth: strokeWidth,
    selectedPointColor: color,
  };
}
