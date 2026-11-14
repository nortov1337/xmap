export const LAYER_SUFFIXES = ["fill", "line", "dot", "text", "label"] as const;

export const SELECTION_SOURCE = "sel-src";
export const MARQUEE_SOURCE = "marquee-src";

export const SELECTION_LAYERS = ["sel-fill", "sel-line", "sel-ring"];
export const MARQUEE_LAYERS = ["marquee-fill", "marquee-line"];
export const OVERLAY_LAYERS = [...SELECTION_LAYERS, ...MARQUEE_LAYERS];

export function layerPaintId(layerId: string, suffix: string): string {
  return `l-${layerId}-${suffix}`;
}

export function layerSourceId(layerId: string): string {
  return `src-${layerId}`;
}
