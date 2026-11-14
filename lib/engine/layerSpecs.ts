import type { LayerSpecification } from "maplibre-gl";

import { MARQUEE_SOURCE, SELECTION_SOURCE, layerPaintId, layerSourceId } from "./layerIds";

export function featureLayerSpecs(layerId: string): LayerSpecification[] {
  const source = layerSourceId(layerId);

  return [
    {
      id: layerPaintId(layerId, "fill"),
      type: "fill",
      source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#e2603f"] as never,
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.22] as never,
      },
    },
    {
      id: layerPaintId(layerId, "line"),
      type: "line",
      source,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]] as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#e2603f"] as never,
        "line-width": ["coalesce", ["get", "strokeWidth"], 2] as never,
      },
    },
    {
      id: layerPaintId(layerId, "dot"),
      type: "circle",
      source,
      filter: [
        "all",
        ["==", ["geometry-type"], "Point"],
        ["!=", ["get", "kind"], "text"],
      ] as never,
      paint: {
        "circle-color": ["coalesce", ["get", "color"], "#e2603f"] as never,
        "circle-radius": 6,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    },
    {
      id: layerPaintId(layerId, "text"),
      type: "symbol",
      source,
      filter: ["==", ["get", "kind"], "text"] as never,
      layout: {
        "text-field": ["get", "label"] as never,
        "text-size": ["coalesce", ["get", "size"], 14] as never,
        "text-rotate": ["coalesce", ["get", "rotation"], 0] as never,
        "text-anchor": "center",
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-line-height": 1.2,
      },
      paint: {
        "text-color": ["coalesce", ["get", "color"], "#1f2937"] as never,
        "text-halo-color": "rgba(255,255,255,0.9)",
        "text-halo-width": 2,
      },
    },
    {
      id: layerPaintId(layerId, "label"),
      type: "symbol",
      source,
      filter: [
        "all",
        ["==", ["geometry-type"], "Point"],
        ["!=", ["get", "kind"], "text"],
        ["!=", ["coalesce", ["get", "label"], ""], ""],
      ] as never,
      layout: {
        "text-field": ["get", "label"] as never,
        "text-size": 12,
        "text-offset": [0, 1.1] as never,
        "text-anchor": "top",
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#374151",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 2,
      },
    },
  ];
}

export function overlayLayerSpecs(): LayerSpecification[] {
  return [
    {
      id: "sel-fill",
      type: "fill",
      source: SELECTION_SOURCE,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#2f6df6", "fill-opacity": 0.12 },
    },
    {
      id: "sel-line",
      type: "line",
      source: SELECTION_SOURCE,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]] as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2f6df6", "line-width": 2.5 },
    },
    {
      id: "sel-ring",
      type: "circle",
      source: SELECTION_SOURCE,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 12,
        "circle-color": "rgba(47,109,246,0.12)",
        "circle-stroke-color": "#2f6df6",
        "circle-stroke-width": 1.8,
      },
    },
    {
      id: "marquee-fill",
      type: "fill",
      source: MARQUEE_SOURCE,
      paint: { "fill-color": "#2f6df6", "fill-opacity": 0.1 },
    },
    {
      id: "marquee-line",
      type: "line",
      source: MARQUEE_SOURCE,
      paint: {
        "line-color": "#2f6df6",
        "line-width": 1.2,
        "line-dasharray": [4, 3],
      },
    },
  ];
}
