import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJSONSource, Map as MlMap, Point } from "maplibre-gl";

import type { Doc, Layer } from "../types";
import { toSourceFeature } from "./feature";
import {
  LAYER_SUFFIXES,
  MARQUEE_SOURCE,
  OVERLAY_LAYERS,
  SELECTION_SOURCE,
  layerPaintId,
  layerSourceId,
} from "./layerIds";
import { featureLayerSpecs, overlayLayerSpecs } from "./layerSpecs";

export type LayerViewState = {
  editingId: string | null;
  preview: { id: string; geom: Geometry } | null;
  selection: string[];
};

export type MarqueeBox = { start: Point; current: Point };

function emptyCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] as Feature[] };
}

function previewFor(feature: { id: string; geom: Geometry }, state: LayerViewState) {
  return state.preview?.id === feature.id ? state.preview.geom : undefined;
}

export class LayerViews {
  private layerIds: string[] = [];

  constructor(private readonly map: MlMap) {}

  sync(doc: Doc, state: LayerViewState) {
    const ids = new Set(doc.layers.map((layer) => layer.id));
    for (const id of this.layerIds) {
      if (!ids.has(id)) this.destroyArtifacts(id);
    }
    for (const layer of doc.layers) this.ensureArtifacts(layer.id);
    this.layerIds = doc.layers.map((layer) => layer.id);

    this.syncAll(doc, state);
    this.order(doc);
    this.highlight(doc, state);
  }

  refresh(doc: Doc, state: LayerViewState) {
    this.syncAll(doc, state);
    this.highlight(doc, state);
  }

  refreshLayer(doc: Doc, layer: Layer, state: LayerViewState) {
    this.writeLayer(doc, layer, state);
    this.highlight(doc, state);
  }

  highlight(doc: Doc, state: LayerViewState) {
    const source = this.map.getSource(SELECTION_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;

    const features = state.selection.flatMap((id) => {
      const feature = doc.features.find((item) => item.id === id);
      if (!feature || feature.id === state.editingId) return [];
      const layer = doc.layers.find((item) => item.id === feature.layerId);
      return layer?.visible ? [toSourceFeature(feature, previewFor(feature, state))] : [];
    });

    source.setData({ type: "FeatureCollection", features });
  }

  showMarquee(box: MarqueeBox | null) {
    const source = this.map.getSource(MARQUEE_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;
    if (!box) {
      source.setData(emptyCollection());
      return;
    }

    const { start, current } = box;
    const topLeft = this.map.unproject([
      Math.min(start.x, current.x),
      Math.min(start.y, current.y),
    ]);
    const bottomRight = this.map.unproject([
      Math.max(start.x, current.x),
      Math.max(start.y, current.y),
    ]);

    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [topLeft.lng, topLeft.lat],
                [bottomRight.lng, topLeft.lat],
                [bottomRight.lng, bottomRight.lat],
                [topLeft.lng, bottomRight.lat],
                [topLeft.lng, topLeft.lat],
              ],
            ],
          },
        },
      ],
    });
  }

  ensureOverlays() {
    if (!this.map.getSource(SELECTION_SOURCE)) {
      this.map.addSource(SELECTION_SOURCE, { type: "geojson", data: emptyCollection() });
    }
    if (!this.map.getSource(MARQUEE_SOURCE)) {
      this.map.addSource(MARQUEE_SOURCE, { type: "geojson", data: emptyCollection() });
    }

    for (const spec of overlayLayerSpecs()) {
      if (!this.map.getLayer(spec.id)) this.map.addLayer(spec);
    }
  }

  reset() {
    this.layerIds = [];
  }

  private syncAll(doc: Doc, state: LayerViewState) {
    for (const layer of doc.layers) this.writeLayer(doc, layer, state);
  }

  private writeLayer(doc: Doc, layer: Layer, state: LayerViewState) {
    const source = this.map.getSource(layerSourceId(layer.id)) as GeoJSONSource | undefined;
    if (!source) return;

    const features = layer.visible
      ? doc.features.filter(
          (feature) => feature.layerId === layer.id && feature.id !== state.editingId,
        )
      : [];

    source.setData({
      type: "FeatureCollection",
      features: features.map((feature) => toSourceFeature(feature, previewFor(feature, state))),
    });

    this.applyOpacity(layer);
  }

  private applyOpacity(layer: Layer) {
    const set = (suffix: string, property: string, value: unknown) => {
      const id = layerPaintId(layer.id, suffix);
      if (this.map.getLayer(id)) this.map.setPaintProperty(id, property, value as never);
    };

    set("fill", "fill-opacity", ["*", ["get", "fillOpacity"], layer.opacity]);
    set("line", "line-opacity", layer.opacity);
    set("dot", "circle-opacity", layer.opacity);
    set("text", "text-opacity", layer.opacity);
    set("label", "text-opacity", layer.opacity);
  }

  private ensureArtifacts(layerId: string) {
    const sourceId = layerSourceId(layerId);
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, { type: "geojson", data: emptyCollection() });
    }

    for (const spec of featureLayerSpecs(layerId)) {
      if (!this.map.getLayer(spec.id)) this.map.addLayer(spec);
    }
  }

  private destroyArtifacts(layerId: string) {
    for (const suffix of LAYER_SUFFIXES) {
      const id = layerPaintId(layerId, suffix);
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    const sourceId = layerSourceId(layerId);
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
  }

  private order(doc: Doc) {
    for (const layer of doc.layers) {
      for (const suffix of LAYER_SUFFIXES) {
        const id = layerPaintId(layer.id, suffix);
        if (this.map.getLayer(id)) this.map.moveLayer(id);
      }
    }
    for (const layer of this.map.getStyle().layers ?? []) {
      if (layer.id.startsWith("td")) this.map.moveLayer(layer.id);
    }
    for (const id of OVERLAY_LAYERS) {
      if (this.map.getLayer(id)) this.map.moveLayer(id);
    }
  }
}
