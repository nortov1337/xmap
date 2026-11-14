import { readStored, writeStored } from "./storage";
import type { Doc, Layer } from "./types";

const KEY = "xmap.doc.v3";

export function newLayer(index: number): Layer {
  return {
    id: crypto.randomUUID(),
    name: `Layer ${index}`,
    visible: true,
    locked: false,
    opacity: 1,
  };
}

export function createBlankDoc(): Doc {
  return {
    v: 3,
    title: "",
    basemap: "positron",
    camera: { lng: 0, lat: 20, zoom: 2 },
    layers: [newLayer(1)],
    features: [],
  };
}

export function loadDoc(): Doc {
  const parsed = readStored(KEY) as Doc | null;
  if (parsed?.v === 3 && Array.isArray(parsed.layers) && Array.isArray(parsed.features)) {
    return parsed;
  }
  return createBlankDoc();
}

export function saveDoc(doc: Doc) {
  writeStored(KEY, doc);
}
