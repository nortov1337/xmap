import { create } from "zustand";
import { createBlankDoc, newLayer } from "./doc";
import { translateGeometry } from "./geo/coords";
import type { Doc, Layer, MapFeature, Tool } from "./types";

const HISTORY_LIMIT = 60;
const DUPLICATE_OFFSET = { lng: 0.0006, lat: -0.0004 };

type State = {
  doc: Doc;
  past: Doc[];
  future: Doc[];
  loaded: boolean;
  tool: Tool;
  selectedIds: string[];
  activeLayerId: string;
  toast: string | null;

  hydrate: (doc: Doc) => void;
  patchDoc: (patch: Partial<Doc>) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setSelection: (ids: string[]) => void;
  setActiveLayer: (id: string) => void;
  showToast: (message: string | null) => void;

  addFeature: (feature: MapFeature) => void;
  addFeatures: (features: MapFeature[]) => void;
  updateFeature: (id: string, patch: Partial<MapFeature>) => void;
  removeFeature: (id: string) => void;
  removeFeatures: (ids: string[]) => void;
  duplicateFeature: (id: string) => void;
  duplicateFeatures: (ids: string[]) => void;

  addLayer: () => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromId: string, toId: string) => void;
  reorderFeatures: (fromId: string, toId: string) => void;
  moveFeatureToLayer: (featureId: string, layerId: string) => void;
};

function moveById<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] | null {
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return null;

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const useApp = create<State>((set, get) => {
  const commit = (next: Doc) => {
    const current = get().doc;
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    set({ doc: next, past: [...get().past, current].slice(-HISTORY_LIMIT), future: [] });
  };

  return {
    doc: createBlankDoc(),
    past: [],
    future: [],
    loaded: false,
    tool: "select",
    selectedIds: [],
    activeLayerId: "",
    toast: null,

    hydrate: (doc) =>
      set({
        doc,
        past: [],
        future: [],
        selectedIds: [],
        activeLayerId: doc.layers[0]?.id ?? "",
        loaded: true,
      }),

    patchDoc: (patch) => set({ doc: { ...get().doc, ...patch } }),

    undo: () => {
      const { past, future, doc } = get();
      if (!past.length) return;
      set({
        doc: past[past.length - 1],
        past: past.slice(0, -1),
        future: [doc, ...future].slice(0, HISTORY_LIMIT),
        selectedIds: [],
      });
    },

    redo: () => {
      const { past, future, doc } = get();
      if (!future.length) return;
      set({
        doc: future[0],
        past: [...past, doc].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        selectedIds: [],
      });
    },

    setTool: (tool) => set({ tool }),
    setSelection: (selectedIds) => set({ selectedIds }),
    setActiveLayer: (activeLayerId) => set({ activeLayerId }),
    showToast: (toast) => set({ toast }),

    addFeature: (feature) => {
      const doc = get().doc;
      commit({ ...doc, features: [...doc.features, feature] });
    },

    addFeatures: (features) => {
      if (!features.length) return;
      const doc = get().doc;
      commit({ ...doc, features: [...doc.features, ...features] });
    },

    updateFeature: (id, patch) => {
      const doc = get().doc;
      commit({
        ...doc,
        features: doc.features.map((feature) =>
          feature.id === id ? { ...feature, ...patch } : feature,
        ),
      });
    },

    removeFeature: (id) => get().removeFeatures([id]),

    removeFeatures: (ids) => {
      if (!ids.length) return;
      const doc = get().doc;
      const removed = new Set(ids);
      commit({
        ...doc,
        features: doc.features.filter((feature) => !removed.has(feature.id)),
      });
      set({ selectedIds: get().selectedIds.filter((id) => !removed.has(id)) });
    },

    duplicateFeature: (id) => get().duplicateFeatures([id]),

    duplicateFeatures: (ids) => {
      const doc = get().doc;
      const sources = doc.features.filter((feature) => ids.includes(feature.id));
      if (!sources.length) return;
      const copies: MapFeature[] = sources.map((source, index) => ({
        ...source,
        id: crypto.randomUUID(),
        geom: translateGeometry(
          source.geom,
          DUPLICATE_OFFSET.lng * (index + 1),
          DUPLICATE_OFFSET.lat * (index + 1),
        ),
        style: { ...source.style },
      }));
      commit({ ...doc, features: [...doc.features, ...copies] });
      set({ selectedIds: copies.map((copy) => copy.id) });
    },

    addLayer: () => {
      const doc = get().doc;
      const layer = newLayer(doc.layers.length + 1);
      commit({ ...doc, layers: [...doc.layers, layer] });
      set({ activeLayerId: layer.id, selectedIds: [] });
    },

    updateLayer: (id, patch) => {
      const doc = get().doc;
      commit({
        ...doc,
        layers: doc.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
      });
    },

    removeLayer: (id) => {
      const doc = get().doc;
      if (doc.layers.length <= 1) return;
      const layers = doc.layers.filter((layer) => layer.id !== id);
      commit({
        ...doc,
        layers,
        features: doc.features.filter((feature) => feature.layerId !== id),
      });
      if (get().activeLayerId === id) set({ activeLayerId: layers[0].id });
      set({ selectedIds: [] });
    },

    moveFeatureToLayer: (featureId, layerId) => {
      const doc = get().doc;
      const feature = doc.features.find((item) => item.id === featureId);
      if (!feature || feature.layerId === layerId) return;

      const rest = doc.features.filter((item) => item.id !== featureId);
      const lastInLayer = rest.map((item) => item.layerId).lastIndexOf(layerId);
      const features = [...rest];
      const insertAt = lastInLayer < 0 ? features.length : lastInLayer + 1;
      features.splice(insertAt, 0, { ...feature, layerId });

      commit({ ...doc, features });
      set({ activeLayerId: layerId, selectedIds: [featureId] });
    },

    reorderLayers: (fromId, toId) => {
      const doc = get().doc;
      const layers = moveById(doc.layers, fromId, toId);
      if (layers) commit({ ...doc, layers });
    },

    reorderFeatures: (fromId, toId) => {
      const doc = get().doc;
      const features = moveById(doc.features, fromId, toId);
      if (features) commit({ ...doc, features });
    },
  };
});
