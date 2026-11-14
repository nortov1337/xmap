import type { Geometry } from "geojson";

export type FeatureKind =
  | "marker"
  | "text"
  | "polygon"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow";

export type Tool =
  | "select"
  | "marker"
  | "text"
  | "polygon"
  | "rectangle"
  | "circle"
  | "line";

export type BasemapKey = "positron" | "liberty" | "dark" | "satellite" | "hybrid";

export type ThemeKey = "light" | "dark" | "system";

export type MapOverlays = {
  labels: boolean;
  signs: boolean;
};

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
};

export type FeatureStyle = {
  color: string;
  fillOpacity: number;
  strokeWidth: number;
  size: number;
  rotation: number;
};

export type MapFeature = {
  id: string;
  layerId: string;
  kind: FeatureKind;
  geom: Geometry;
  title: string;
  description: string;
  label: string;
  style: FeatureStyle;
};

export type Camera = { lng: number; lat: number; zoom: number };

export type MapContextMenu = {
  featureId: string | null;
  lng: number;
  lat: number;
  clientX: number;
  clientY: number;
};

export type Doc = {
  v: 3;
  title: string;
  basemap: BasemapKey;
  camera: Camera;
  layers: Layer[];
  features: MapFeature[];
};
