import { create } from "zustand";
import { newLayer } from "./config";
import { createBlankDoc } from "./doc";
import { translateGeometry } from "./geo";
import type { Doc, Layer, MapFeature, Tool } from "./types";

type State = {  doc: Doc;
  past: Doc[];
  future: Doc[];
  loaded: boolean;
  tool: Tool;
  selectedId: string | null;
  activeLayerId: string;
  toast: string | null;

  hydrate: (doc: Doc) => void;
  apply: (next: Doc) => void;
  patchDoc: (patch: Partial<Doc>) => void;  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setSelected: (id: string | null) => void;
  setActiveLayer: (id: string) => void;
  showToast: (message: string | null) => void;
  setLoaded: (loaded: boolean) => void;

  addFeature: (feature: MapFeature) => void;
  addFeatures: (features: MapFeature[]) => void;
  updateFeature: (id: string, patch: Partial<MapFeature>) => void;
  removeFeature: (id: string) => void;
  duplicateFeature: (id: string) => void;

  addLayer: () => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromId: string, toId: string) => void;
  reorderFeatures: (fromId: string, toId: string) => void;
  moveFeatureToLayer: (featureId: string, layerId: string) => void;
};

export const useApp = create<State>((set, get) => ({
  doc: createBlankDoc(),
  past: [],
  future: [],
  loaded: false,
  tool: "select",
  selectedId: null,
  activeLayerId: "",
  toast: null,

  hydrate: (doc) =>
    set({
      doc,
      past: [],
      future: [],
      selectedId: null,
      activeLayerId: doc.layers[0]?.id ?? "",
      loaded: true,
    }),

  apply: (next) => {
    const current = get().doc;
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    set({ doc: next, past: [...get().past, current].slice(-60), future: [] });
  },

  patchDoc: (patch) => set({ doc: { ...get().doc, ...patch } }),

  undo: () => {
    const { past, future, doc } = get();
    if (!past.length) return;
    set({
      doc: past[past.length - 1],
      past: past.slice(0, -1),
      future: [doc, ...future].slice(0, 60),
      selectedId: null,
    });
  },

  redo: () => {
    const { past, future, doc } = get();
    if (!future.length) return;
    set({
      doc: future[0],
      past: [...past, doc].slice(-60),
      future: future.slice(1),
      selectedId: null,
    });
  },

  setTool: (tool) => set({ tool }),
  setSelected: (selectedId) => set({ selectedId }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  showToast: (toast) => set({ toast }),
  setLoaded: (loaded) => set({ loaded }),

  addFeature: (feature) => {
    const doc = get().doc;
    get().apply({ ...doc, features: [...doc.features, feature] });
  },

  addFeatures: (features) => {
    if (!features.length) return;
    const doc = get().doc;
    get().apply({ ...doc, features: [...doc.features, ...features] });
  },

  updateFeature: (id, patch) => {
    const doc = get().doc;
    get().apply({
      ...doc,
      features: doc.features.map((feature) =>
        feature.id === id ? { ...feature, ...patch } : feature,
      ),
    });
  },

  removeFeature: (id) => {
    const doc = get().doc;
    get().apply({ ...doc, features: doc.features.filter((feature) => feature.id !== id) });
    if (get().selectedId === id) set({ selectedId: null });
  },

  duplicateFeature: (id) => {
    const doc = get().doc;
    const source = doc.features.find((feature) => feature.id === id);
    if (!source) return;
    const copy: MapFeature = {
      ...source,
      id: crypto.randomUUID(),
      geom: translateGeometry(source.geom, 0.0006, -0.0004),
      style: { ...source.style },
    };
    get().apply({ ...doc, features: [...doc.features, copy] });
    set({ selectedId: copy.id });
  },

  addLayer: () => {
    const doc = get().doc;
    const layer = newLayer(doc.layers.length + 1);
    get().apply({ ...doc, layers: [...doc.layers, layer] });
    set({ activeLayerId: layer.id, selectedId: null });
  },

  updateLayer: (id, patch) => {
    const doc = get().doc;
    get().apply({
      ...doc,
      layers: doc.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    });
  },

  removeLayer: (id) => {
    const doc = get().doc;
    if (doc.layers.length <= 1) return;
    const layers = doc.layers.filter((layer) => layer.id !== id);
    get().apply({
      ...doc,
      layers,
      features: doc.features.filter((feature) => feature.layerId !== id),
    });
    if (get().activeLayerId === id) set({ activeLayerId: layers[0].id });
    set({ selectedId: null });
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

    get().apply({ ...doc, features });
    set({ activeLayerId: layerId, selectedId: featureId });
  },

  reorderLayers: (fromId, toId) => {
    const doc = get().doc;
    const from = doc.layers.findIndex((layer) => layer.id === fromId);
    const to = doc.layers.findIndex((layer) => layer.id === toId);
    if (from < 0 || to < 0 || from === to) return;

    const layers = [...doc.layers];
    const [moved] = layers.splice(from, 1);
    layers.splice(to, 0, moved);
    get().apply({ ...doc, layers });
  },

  reorderFeatures: (fromId, toId) => {
    const doc = get().doc;
    const from = doc.features.findIndex((feature) => feature.id === fromId);
    const to = doc.features.findIndex((feature) => feature.id === toId);
    if (from < 0 || to < 0 || from === to) return;

    const features = [...doc.features];
    const [moved] = features.splice(from, 1);
    features.splice(to, 0, moved);
    get().apply({ ...doc, features });
  },
}));
