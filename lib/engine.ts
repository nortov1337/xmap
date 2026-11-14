import maplibregl, { type Map as MlMap } from "maplibre-gl";
import type { Geometry } from "geojson";
import type { TerraDraw } from "terra-draw";

import { BASEMAPS } from "./basemaps";
import { FeatureClipboard } from "./engine/clipboard";
import { createDraw } from "./engine/draw";
import { downloadGeoJson, downloadPng } from "./engine/export";
import { createFeature, featureProperties } from "./engine/feature";
import { LayerViews } from "./engine/layers";
import { KIND_BY_TOOL, MODE_BY_TOOL } from "./engine/modes";
import { BasemapOverlays } from "./engine/overlays";
import { SelectionController } from "./engine/selection";
import { SurfaceController } from "./engine/surface";
import { TextDragController } from "./engine/textDrag";
import { geometryBounds } from "./geo/coords";
import type {
  Camera,
  Doc,
  FeatureKind,
  MapContextMenu,
  MapFeature,
  MapOverlays,
  Tool,
} from "./types";

export type EngineCallbacks = {
  onSelect: (ids: string[]) => void;
  onTool: (tool: Tool) => void;
  onAdd: (feature: MapFeature) => void;
  onGeometry: (id: string, geom: Geometry) => void;
  onDelete: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onCamera: (camera: Camera) => void;
  onContextMenu: (menu: MapContextMenu) => void;
};

export class MapEngine {
  readonly map: MlMap;
  private draw: TerraDraw | null = null;
  private readonly views: LayerViews;
  private doc: Doc;
  private readonly callbacks: EngineCallbacks;
  private readonly selection: SelectionController;
  private readonly surface: SurfaceController;
  private readonly textDrag: TextDragController;
  private readonly clipboard: FeatureClipboard;
  private readonly basemapOverlays: BasemapOverlays;

  private tool: Tool = "select";
  private activeLayerId: string;
  private destroyed = false;
  private readonly onWindowMouseUp = () => this.surface.endPointerActions();

  constructor(container: HTMLElement, doc: Doc, callbacks: EngineCallbacks) {
    this.doc = doc;
    this.callbacks = callbacks;
    this.activeLayerId = doc.layers[0]?.id ?? "";

    this.map = new maplibregl.Map({
      container,
      style: BASEMAPS[doc.basemap].style,
      center: [doc.camera.lng, doc.camera.lat],
      zoom: doc.camera.zoom,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      attributionControl: { compact: true },
      maxZoom: 19,
    });
    this.views = new LayerViews(this.map);
    this.basemapOverlays = new BasemapOverlays(this.map);

    this.textDrag = new TextDragController(
      this.map,
      () => this.refreshAll(),
      (id, geom) => callbacks.onGeometry(id, geom),
    );
    this.selection = new SelectionController({
      doc: () => this.doc,
      draw: () => this.draw,
      tool: () => this.tool,
      preview: () => this.textDrag.preview,
      views: this.views,
      onSelect: callbacks.onSelect,
      onGeometry: callbacks.onGeometry,
    });
    this.surface = new SurfaceController({
      map: this.map,
      views: this.views,
      selection: this.selection,
      textDrag: this.textDrag,
      doc: () => this.doc,
      tool: () => this.tool,
      draw: () => this.draw,
      createFeature: (kind, geom) => this.createFeature(kind, geom),
      setTool: (tool) => this.setTool(tool),
      onAdd: callbacks.onAdd,
      onGeometry: callbacks.onGeometry,
      onContextMenu: callbacks.onContextMenu,
    });
    this.clipboard = new FeatureClipboard({
      doc: () => this.doc,
      layerId: () => this.layerId(),
      createFeature: (kind, geom) => this.createFeature(kind, geom),
      onAdd: callbacks.onAdd,
      onSelect: callbacks.onSelect,
      setTool: (tool) => this.setTool(tool),
    });

    this.map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }),
      "bottom-left",
    );

    this.map.boxZoom.disable();
    window.addEventListener("mouseup", this.onWindowMouseUp);

    this.map.on("load", () => this.onLoad());
    this.map.on("error", (event) => {
      if (event?.error) console.warn("[map]", event.error.message ?? event.error);
    });
    this.map.on("mousemove", (event) => this.surface.onMouseMove(event));
    this.map.on("mousedown", (event) => this.surface.onMouseDown(event));
    this.map.on("click", (event) => this.surface.onClick(event));
    this.map.on("touchstart", (event) => this.surface.onTouchStart(event));
    this.map.on("touchend", (event) => this.surface.onTouchEnd(event));
    this.map.on("contextmenu", (event) => this.surface.onContextMenu(event));
    this.map.on("moveend", () => {
      const center = this.map.getCenter();
      this.callbacks.onCamera({ lng: center.lng, lat: center.lat, zoom: this.map.getZoom() });
    });
  }

  private onLoad() {
    this.views.ensureOverlays();
    this.draw = createDraw(this.map);

    this.draw.on("deselect", () => {
      if (this.selection.busy || this.surface.marqueeActive) return;
      this.selection.end(true);
      if (this.selection.selection.length) this.selection.clear();
    });

    this.draw.on("finish", (id) => {
      if (this.selection.busy) return;
      setTimeout(() => {
        if (!this.destroyed) this.afterFinish(String(id));
      }, 0);
    });

    this.draw.start();
    this.draw.setMode("select");
    this.render(this.doc);
  }

  render(doc: Doc) {
    this.doc = doc;
    if (!this.draw) return;
    if (this.activeLayerId && !doc.layers.some((layer) => layer.id === this.activeLayerId)) {
      this.activeLayerId = doc.layers[0]?.id ?? "";
    }

    const editing = doc.features.find((feature) => feature.id === this.selection.editing);
    const editingLayer = editing
      ? doc.layers.find((layer) => layer.id === editing.layerId)
      : null;
    if (this.selection.editing && (!editingLayer || !editingLayer.visible || editingLayer.locked)) {
      this.selection.end(false);
      this.selection.clear();
    }

    if (editing && editingLayer && this.selection.editing === editing.id) {
      this.syncEditingStyles(editing);
    }

    this.views.sync(doc, this.selection.viewState);
  }

  private syncEditingStyles(feature: MapFeature) {
    try {
      this.draw?.updateFeatureProperties(feature.id, featureProperties(feature) as never);
    } catch (error) {
      console.warn("[style]", error);
    }
  }

  private refreshAll() {
    this.selection.refreshAll();
  }

  private afterFinish(id: string) {
    if (!this.draw || this.destroyed) return;
    const feature = this.draw.getSnapshotFeature(id);
    if (!feature) return;

    if (this.selection.editing === id) {
      this.callbacks.onGeometry(id, feature.geometry);
      this.refreshAll();
      return;
    }

    const kind = KIND_BY_TOOL[this.tool] ?? "polygon";
    const mapFeature = this.createFeature(kind, feature.geometry);
    mapFeature.id = id;

    this.callbacks.onAdd(mapFeature);
    this.selection.adopt([id], true);
    this.setTool("select");

    try {
      this.draw.updateFeatureProperties(id, {
        kind,
        color: mapFeature.style.color,
        fillOpacity: mapFeature.style.fillOpacity,
        strokeWidth: mapFeature.style.strokeWidth,
      } as never);
      this.selection.switchMode("select");
      this.draw.selectFeature(id);
    } catch (error) {
      console.warn("[finish]", error);
    }

    this.refreshAll();
  }

  setSelection(ids: string[]) {
    this.selection.set(ids);
  }

  setTool(tool: Tool) {
    this.tool = tool;
    this.callbacks.onTool(tool);
    if (!this.draw) return;
    if (tool !== "select") this.selection.end(true);

    const mode = MODE_BY_TOOL[tool];
    if (this.draw.getMode() !== mode) this.selection.switchMode(mode);

    this.map.getCanvas().style.cursor = tool === "text" ? "crosshair" : "";
    if (tool === "select" && this.selection.selection.length === 1 && !this.selection.editing) {
      this.selection.begin(this.selection.selection[0]);
    }
  }

  setActiveLayer(id: string) {
    this.activeLayerId = id;
  }

  setBasemap(key: Doc["basemap"]) {
    const draw = this.draw;
    if (!draw || this.doc.basemap === key) return;
    this.doc = { ...this.doc, basemap: key };

    this.selection.end(true);
    this.selection.setGuard(true);
    try {
      draw.stop();
    } catch {
      /* ignore */
    }
    this.views.reset();

    this.map.once("style.load", () => {
      this.views.ensureOverlays();
      draw.start();
      draw.setMode("select");
      this.selection.setGuard(false);
      this.render(this.doc);
    });
    this.map.setStyle(BASEMAPS[key].style);
  }

  setMapOverlays(overlays: MapOverlays) {
    this.basemapOverlays.set(overlays);
  }

  deleteSelection() {
    const ids = [...this.selection.selection];
    if (!ids.length) return;
    this.selection.end(false);
    this.selection.clear();
    this.callbacks.onDelete(ids);
  }

  duplicateSelection() {
    const ids = [...this.selection.selection];
    if (!ids.length) return;
    this.selection.end(true);
    this.callbacks.onDuplicate(ids);
  }

  hasClipboard() {
    return this.clipboard.has();
  }

  copySelected(): boolean {
    const id = this.selection.selection[0];
    return id ? this.clipboard.copy(id) : false;
  }

  copyFeature(id: string): boolean {
    return this.clipboard.copy(id);
  }

  pasteAt(lng: number, lat: number) {
    this.clipboard.pasteAt(lng, lat);
  }

  addAt(kind: FeatureKind, lng: number, lat: number) {
    this.clipboard.addAt(kind, lng, lat);
  }

  fitAll() {
    this.fitTo(this.doc.features);
  }

  fitTo(features: MapFeature[]) {
    const bounds = new maplibregl.LngLatBounds();
    for (const feature of features) {
      const box = geometryBounds(feature.geom);
      if (!box) continue;
      bounds.extend([box.minLng, box.minLat]);
      bounds.extend([box.maxLng, box.maxLat]);
    }
    if (!bounds.isEmpty()) this.map.fitBounds(bounds, { padding: 120, maxZoom: 15, duration: 500 });
  }

  zoomBy(delta: number) {
    this.map.easeTo({ zoom: this.map.getZoom() + delta, duration: 200 });
  }

  async exportPng() {
    if (this.selection.selection.length) {
      this.selection.end(true);
      this.selection.clear();
      await new Promise<void>((resolve) => {
        this.map.once("idle", () => resolve());
        setTimeout(resolve, 400);
      });
    }

    await downloadPng(this.map, this.doc.title);
  }

  exportGeoJson() {
    downloadGeoJson(this.doc);
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener("mouseup", this.onWindowMouseUp);
    try {
      this.draw?.stop();
      this.map.remove();
    } catch {
      /* ignore */
    }
  }

  private layerId(): string {
    return this.activeLayerId || this.doc.layers[0]?.id || "";
  }

  private createFeature(kind: FeatureKind, geom: Geometry): MapFeature {
    return createFeature(kind, geom, this.layerId());
  }
}
