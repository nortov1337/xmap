import type { Doc } from "./types";

const KEY = "xmap.doc.v3";

export function createBlankDoc(): Doc {
  return {
    v: 3,
    title: "",
    basemap: "positron",
    camera: { lng: 0, lat: 20, zoom: 2 },
    layers: [
      { id: crypto.randomUUID(), name: "Слой 1", visible: true, locked: false, opacity: 1 },
    ],
    features: [],
  };
}

export function loadDoc(): Doc {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Doc;
      if (parsed?.v === 3 && Array.isArray(parsed.layers) && Array.isArray(parsed.features)) {
        return parsed;
      }
    }
  } catch {
    /* ignore broken storage */
  }
  return createBlankDoc();
}

export function saveDoc(doc: Doc) {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    /* storage full or unavailable */
  }
}
