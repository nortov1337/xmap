import type { RasterSourceSpecification, StyleSpecification } from "maplibre-gl";
import type { BasemapKey } from "./types";

const IMAGERY_SOURCE: RasterSourceSpecification = {
  type: "raster",
  tiles: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ],
  tileSize: 256,
  maxzoom: 19,
  attribution: "Esri, Maxar, Earthstar Geographics",
};

const IMAGERY_LABELS_SOURCE: RasterSourceSpecification = {
  type: "raster",
  tiles: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  ],
  tileSize: 256,
  maxzoom: 19,
};

const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: { imagery: IMAGERY_SOURCE },
  layers: [{ id: "imagery", type: "raster", source: "imagery" }],
};

const HYBRID_STYLE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: { imagery: IMAGERY_SOURCE, labels: IMAGERY_LABELS_SOURCE },
  layers: [
    { id: "imagery", type: "raster", source: "imagery" },
    { id: "labels", type: "raster", source: "labels" },
  ],
};

export const BASEMAPS: Record<
  BasemapKey,
  { style: string | StyleSpecification; label: string; description: string }
> = {
  positron: {
    style: "https://tiles.openfreemap.org/styles/positron",
    label: "Light",
    description: "Neutral basemap with soft colors",
  },
  liberty: {
    style: "https://tiles.openfreemap.org/styles/liberty",
    label: "Vivid",
    description: "Detailed basemap with terrain and POI",
  },
  dark: {
    style: "https://tiles.openfreemap.org/styles/dark",
    label: "Dark",
    description: "Dark basemap for night work",
  },
  satellite: {
    style: SATELLITE_STYLE,
    label: "Satellite",
    description: "Satellite imagery without labels",
  },
  hybrid: {
    style: HYBRID_STYLE,
    label: "Hybrid",
    description: "Imagery with labels and borders",
  },
};
