import type { Geometry } from "geojson";

import { geometryCenter, translateGeometry } from "../geo/coords";
import type { Doc, FeatureKind, MapFeature, Tool } from "../types";

type ClipboardDeps = {
  doc: () => Doc;
  layerId: () => string;
  createFeature: (kind: FeatureKind, geom: Geometry) => MapFeature;
  onAdd: (feature: MapFeature) => void;
  onSelect: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
};

export class FeatureClipboard {
  private feature: MapFeature | null = null;

  constructor(private readonly deps: ClipboardDeps) {}

  has(): boolean {
    return Boolean(this.feature);
  }

  copy(id: string): boolean {
    const feature = this.deps.doc().features.find((item) => item.id === id);
    if (!feature) return false;
    this.feature = { ...feature, style: { ...feature.style } };
    return true;
  }

  pasteAt(lng: number, lat: number) {
    const source = this.feature;
    if (!source) return;

    const [centerLng, centerLat] = geometryCenter(source.geom);
    const layerId = this.deps.doc().layers.some((layer) => layer.id === source.layerId)
      ? source.layerId
      : this.deps.layerId();

    this.place({
      ...source,
      id: crypto.randomUUID(),
      layerId,
      geom: translateGeometry(source.geom, lng - centerLng, lat - centerLat),
      style: { ...source.style },
    });
  }

  addAt(kind: FeatureKind, lng: number, lat: number) {
    this.place(this.deps.createFeature(kind, { type: "Point", coordinates: [lng, lat] }));
  }

  private place(feature: MapFeature) {
    this.deps.onAdd(feature);
    this.deps.onSelect([feature.id]);
    this.deps.setTool("select");
  }
}
