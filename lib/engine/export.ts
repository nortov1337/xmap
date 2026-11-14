import type { Feature } from "geojson";
import type { Map as MlMap } from "maplibre-gl";

import type { Doc } from "../types";

function fileBase(title: string): string {
  return (title || "map").trim() || "map";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function renderPng(map: MlMap, title: string): Promise<Blob | null> {
  const canvas = map.getCanvas();
  const scale = canvas.width / Math.max(1, map.getContainer().clientWidth);
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(canvas, 0, 0);

  const bar = 62 * scale;
  const gradient = ctx.createLinearGradient(0, 0, 0, bar);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, out.width, bar);

  ctx.fillStyle = "#111827";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${20 * scale}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(title || "Map", 24 * scale, bar * 0.5);

  return new Promise((resolve) => out.toBlob((blob) => resolve(blob), "image/png"));
}

export async function downloadPng(map: MlMap, title: string) {
  const png = await renderPng(map, title);
  if (png) download(png, `${fileBase(title)}.png`);
}

export function downloadGeoJson(doc: Doc) {
  const features: Feature[] = doc.features.map((feature) => ({
    type: "Feature",
    id: feature.id,
    properties: {
      kind: feature.kind,
      title: feature.title,
      description: feature.description,
      label: feature.label,
      color: feature.style.color,
      layer: doc.layers.find((layer) => layer.id === feature.layerId)?.name,
    },
    geometry: feature.geom,
  }));

  const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], {
    type: "application/geo+json",
  });
  download(blob, `${fileBase(doc.title)}.geojson`);
}
