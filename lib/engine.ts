import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
  type HexColor,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { Feature, Geometry, LineString } from "geojson";

import { BASEMAPS, defaultStyle } from "./config";
import { arrowFromLine, geometryCenter, translateGeometry } from "./geo";
import type {
  Camera,
  Doc,
  FeatureKind,
  MapContextMenu,
  MapFeature,
  Tool,
} from "./types";

const MODE_BY_TOOL: Record<Tool, string> = {
  select: "select",
  marker: "point",
  text: "idle",
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "linestring",
  arrow: "linestring",
};

const KIND_BY_TOOL: Partial<Record<Tool, FeatureKind>> = {
  marker: "marker",
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "line",
  arrow: "arrow",
};

const MODE_BY_KIND: Record<FeatureKind, string> = {
  marker: "point",
  text: "idle",
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "linestring",
  arrow: "polygon",
};

const SUFFIXES = ["fill", "line", "dot", "text", "label"] as const;
const SELECTION_LAYER = "sel-ring";

export type EngineCallbacks = {
  onSelect: (id: string | null) => void;
  onTool: (tool: Tool) => void;
  onAdd: (feature: MapFeature) => void;
  onGeometry: (id: string, geom: Geometry) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCamera: (camera: Camera) => void;
  onCoords: (lng: number, lat: number) => void;
  onToast: (message: string) => void;
  onContextMenu: (menu: MapContextMenu) => void;
};

function hex(value: string | undefined, fallback: string): HexColor {
  return (value ?? fallback) as HexColor;
}

function emptyCollection() {
  return { type: "FeatureCollection" as const, features: [] as Feature[] };
}

export class MapEngine {
  readonly map: MlMap;
  private draw!: TerraDraw;
  private doc: Doc;
  private readonly callbacks: EngineCallbacks;

  private layerIds: string[] = [];
  private selectedId: string | null = null;
  private editingId: string | null = null;
  private tool: Tool = "select";
  private activeLayerId: string;

  private guard = false;
  private switching = false;
  private clipboard: MapFeature | null = null;
  private previewGeom: { id: string; geom: Geometry } | null = null;
  private draggingText: {
    id: string;
    origin: Geometry;
    startLng: number;
    startLat: number;
  } | null = null;

  private destroyed = false;

  constructor(container: HTMLElement, doc: Doc, callbacks: EngineCallbacks) {
    this.doc = doc;
    this.callbacks = callbacks;
    this.activeLayerId = doc.layers[0]?.id ?? "";

    this.map = new maplibregl.Map({
      container,
      style: BASEMAPS[doc.basemap].url,
      center: [doc.camera.lng, doc.camera.lat],
      zoom: doc.camera.zoom,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      attributionControl: { compact: true },
      maxZoom: 19,
    });

    this.map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }),
      "bottom-left",
    );

    this.map.on("load", () => this.onLoad());
    this.map.on("error", (event) => {
      if (event?.error) console.warn("[map]", event.error.message ?? event.error);
    });
    this.map.on("mousemove", (event) => {
      this.callbacks.onCoords(event.lngLat.lng, event.lngLat.lat);
      if (this.draggingText) this.moveText(event.lngLat.lng, event.lngLat.lat);
    });
    this.map.on("mousedown", (event) => this.onMouseDown(event));
    this.map.on("contextmenu", (event) => this.onContextMenu(event));
    this.map.on("moveend", () => {
      const center = this.map.getCenter();
      this.callbacks.onCamera({ lng: center.lng, lat: center.lat, zoom: this.map.getZoom() });
    });
  }

  /* ------------------------------------------------------------------ setup */

  private onLoad() {
    this.ensureSelectionLayer();

    this.draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: this.map, coordinatePrecision: 9 }),
      modes: [
        new TerraDrawPolygonMode({ styles: this.shapeStyles() as never }),
        new TerraDrawRectangleMode({
          styles: this.shapeStyles() as never,
          drawInteraction: "click-move-or-drag",
        } as never),
        new TerraDrawCircleMode({
          styles: this.shapeStyles() as never,
          drawInteraction: "click-move-or-drag",
        } as never),
        new TerraDrawLineStringMode({ styles: this.lineStyles() as never }),
        new TerraDrawPointMode({ styles: this.pointStyles() as never }),
        new TerraDrawRenderMode({ modeName: "idle" } as never),
        new TerraDrawSelectMode({
          allowManualSelection: true,
          flags: {
            polygon: {
              feature: {
                draggable: true,
                rotateable: true,
                scaleable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true, snappable: true },
              },
            },
            rectangle: {
              feature: {
                draggable: true,
                rotateable: true,
                scaleable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true, snappable: true },
              },
            },
            circle: {
              feature: { draggable: true, scaleable: true },
            },
            linestring: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true, snappable: true },
              },
            },
            point: { feature: { draggable: true } },
          },
          styles: {
            selectionPointColor: "#ffffff",
            selectionPointOutlineColor: "#2f6df6",
            selectionPointWidth: 7,
            selectionPointOutlineWidth: 2,
            midPointColor: "#bcd0fb",
            midPointWidth: 6,
            midPointOutlineColor: "#ffffff",
            midPointOutlineWidth: 1.5,
            selectedPolygonColor: (feature: { properties: Record<string, unknown> }) =>
              hex(feature.properties.color as string, "#e2603f"),
            selectedPolygonFillOpacity: (feature: { properties: Record<string, unknown> }) =>
              Number(feature.properties.fillOpacity ?? 0.22),
            selectedPolygonOutlineColor: (feature: { properties: Record<string, unknown> }) =>
              hex(feature.properties.color as string, "#e2603f"),
            selectedPolygonOutlineWidth: 2.5,
            selectedPolygonOutlineOpacity: 1,
            selectedLineStringColor: (feature: { properties: Record<string, unknown> }) =>
              hex(feature.properties.color as string, "#e2603f"),
            selectedPointColor: (feature: { properties: Record<string, unknown> }) =>
              hex(feature.properties.color as string, "#e2603f"),
          } as never,
        }),
      ],
    });

    this.draw.on("deselect", () => {
      if (this.guard || this.switching) return;
      this.endEdit(true);
      if (this.selectedId) {
        this.selectedId = null;
        this.callbacks.onSelect(null);
        this.updateSelectionRing();
      }
    });

    this.draw.on("finish", (id) => {
      if (this.guard) return;
      setTimeout(() => {
        if (!this.destroyed) this.afterFinish(String(id));
      }, 0);
    });

    this.draw.start();
    this.draw.setMode("select");
    this.render(this.doc);
  }

  private shapeStyles() {
    return {
      fillColor: (feature: { properties: Record<string, unknown> }) =>
        hex(feature.properties.color as string, "#e2603f"),
      fillOpacity: (feature: { properties: Record<string, unknown> }) =>
        Number(feature.properties.fillOpacity ?? 0.22),
      outlineColor: (feature: { properties: Record<string, unknown> }) =>
        hex(feature.properties.color as string, "#e2603f"),
      outlineWidth: (feature: { properties: Record<string, unknown> }) =>
        Number(feature.properties.strokeWidth ?? 2),
      outlineOpacity: 1,
    };
  }

  private lineStyles() {
    return {
      lineStringColor: (feature: { properties: Record<string, unknown> }) =>
        hex(feature.properties.color as string, "#e2603f"),
      lineStringWidth: (feature: { properties: Record<string, unknown> }) =>
        Number(feature.properties.strokeWidth ?? 2),
      lineStringOpacity: 1,
    };
  }

  private pointStyles() {
    return {
      pointColor: (feature: { properties: Record<string, unknown> }) =>
        hex(feature.properties.color as string, "#e2603f"),
      pointWidth: 9,
      pointOutlineColor: hex("#ffffff", "#ffffff"),
      pointOutlineWidth: 2.5,
    };
  }

  /* --------------------------------------------------------------- rendering */

  render(doc: Doc) {
    if (!this.draw) {
      this.doc = doc;
      return;
    }
    this.doc = doc;
    if (this.activeLayerId && !doc.layers.some((layer) => layer.id === this.activeLayerId)) {
      this.activeLayerId = doc.layers[0]?.id ?? "";
    }

    const ids = new Set(doc.layers.map((layer) => layer.id));
    for (const id of [...this.layerIds]) {
      if (!ids.has(id)) this.destroyLayerArtifacts(id);
    }
    for (const layer of doc.layers) this.ensureLayerArtifacts(layer.id);
    this.layerIds = doc.layers.map((layer) => layer.id);

    const editing = doc.features.find((feature) => feature.id === this.editingId);
    const editingLayer = editing
      ? doc.layers.find((layer) => layer.id === editing.layerId)
      : null;
    if (this.editingId && (!editingLayer || !editingLayer.visible || editingLayer.locked)) {
      this.endEdit(false);
      this.selectedId = null;
      this.callbacks.onSelect(null);
    }

    for (const layer of doc.layers) this.updateLayerData(layer);
    this.orderMapLayers(doc);
    this.updateSelectionRing();
  }

  private ensureLayerArtifacts(layerId: string) {
    const sourceId = `src-${layerId}`;
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, { type: "geojson", data: emptyCollection() });
    }

    const add = (suffix: string, config: Record<string, unknown>) => {
      const id = `l-${layerId}-${suffix}`;
      if (!this.map.getLayer(id)) {
        this.map.addLayer(config as unknown as maplibregl.LayerSpecification);
      }
    };

    add("fill", {
      id: `l-${layerId}-fill`,
      type: "fill",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#e2603f"] as never,
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.22] as never,
      },
    });

    add("line", {
      id: `l-${layerId}-line`,
      type: "line",
      source: sourceId,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]] as never,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#e2603f"] as never,
        "line-width": ["coalesce", ["get", "strokeWidth"], 2] as never,
      },
    });

    add("dot", {
      id: `l-${layerId}-dot`,
      type: "circle",
      source: sourceId,
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
    });

    add("text", {
      id: `l-${layerId}-text`,
      type: "symbol",
      source: sourceId,
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
    });

    add("label", {
      id: `l-${layerId}-label`,
      type: "symbol",
      source: sourceId,
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
    });
  }

  private destroyLayerArtifacts(layerId: string) {
    for (const suffix of SUFFIXES) {
      const id = `l-${layerId}-${suffix}`;
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    const sourceId = `src-${layerId}`;
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
  }

  private updateLayerData(layer: { id: string; visible: boolean; opacity: number }) {
    const source = this.map.getSource(`src-${layer.id}`) as GeoJSONSource | undefined;
    if (!source) return;

    const features = layer.visible
      ? this.doc.features.filter(
          (feature) => feature.layerId === layer.id && feature.id !== this.editingId,
        )
      : [];

    source.setData({
      type: "FeatureCollection",
      features: features.map((feature) => this.toSourceFeature(feature)),
    });

    const opacity = layer.opacity;
    const set = (suffix: string, property: string, value: unknown) => {
      const id = `l-${layer.id}-${suffix}`;
      if (this.map.getLayer(id)) this.map.setPaintProperty(id, property, value as never);
    };

    set("fill", "fill-opacity", ["*", ["get", "fillOpacity"], opacity]);
    set("line", "line-opacity", opacity);
    set("dot", "circle-opacity", opacity);
    set("text", "text-opacity", opacity);
    set("label", "text-opacity", opacity);
  }

  private toSourceFeature(feature: MapFeature): Feature {
    const geom =
      this.previewGeom && this.previewGeom.id === feature.id ? this.previewGeom.geom : feature.geom;

    return {
      type: "Feature",
      id: feature.id,
      properties: {
        fid: feature.id,
        kind: feature.kind,
        label: feature.kind === "text" ? feature.label : feature.title,
        color: feature.style.color,
        fillOpacity: feature.style.fillOpacity,
        strokeWidth: feature.style.strokeWidth,
        size: feature.style.size,
        rotation: feature.style.rotation,
      },
      geometry: geom,
    };
  }

  private orderMapLayers(doc: Doc) {
    for (const layer of doc.layers) {
      for (const suffix of SUFFIXES) {
        const id = `l-${layer.id}-${suffix}`;
        if (this.map.getLayer(id)) this.map.moveLayer(id);
      }
    }
    const style = this.map.getStyle();
    for (const layer of style.layers ?? []) {
      if (layer.id.startsWith("td")) this.map.moveLayer(layer.id);
    }
    if (this.map.getLayer(SELECTION_LAYER)) this.map.moveLayer(SELECTION_LAYER);
  }

  private ensureSelectionLayer() {
    if (!this.map.getSource("sel-src")) {
      this.map.addSource("sel-src", { type: "geojson", data: emptyCollection() });
    }
    if (!this.map.getLayer(SELECTION_LAYER)) {
      this.map.addLayer({
        id: SELECTION_LAYER,
        type: "circle",
        source: "sel-src",
        paint: {
          "circle-radius": 15,
          "circle-color": "rgba(47,109,246,0.06)",
          "circle-stroke-color": "#2f6df6",
          "circle-stroke-width": 1.6,
        },
      });
    }
  }

  private updateSelectionRing() {
    const source = this.map.getSource("sel-src") as GeoJSONSource | undefined;
    if (!source) return;
    const feature = this.doc.features.find((item) => item.id === this.selectedId);
    const layer = feature ? this.doc.layers.find((item) => item.id === feature.layerId) : null;
    if (!feature || !layer?.visible || feature.kind !== "text") {
      source.setData(emptyCollection());
      return;
    }
    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: this.previewGeom?.id === feature.id ? this.previewGeom.geom : feature.geom,
        } as Feature,
      ],
    });
  }

  /* ---------------------------------------------------------------- selection */

  select(id: string | null) {
    if (id === this.selectedId) {
      if (id && !this.editingId) this.beginEdit(id);
      return;
    }

    this.endEdit(true);
    this.selectedId = id;
    this.callbacks.onSelect(id);
    this.updateSelectionRing();
    if (!id) return;
    this.beginEdit(id);
  }

  private beginEdit(id: string) {
    const feature = this.doc.features.find((item) => item.id === id);
    if (!feature) return;
    const layer = this.doc.layers.find((item) => item.id === feature.layerId);
    if (!layer || !layer.visible || layer.locked) return;
    if (feature.kind === "text") return;

    const drawFeature = this.toDrawFeature(feature);
    this.editingId = id;

    this.guard = true;
    this.draw.addFeatures([drawFeature as never]);
    this.switching = true;
    this.draw.setMode("select");
    this.switching = false;
    this.guard = false;

    try {
      this.draw.selectFeature(id);
    } catch (error) {
      console.warn("[select]", error);
    }

    this.updateLayerData(layer);
  }

  private endEdit(commit: boolean) {
    if (!this.editingId) return;
    const id = this.editingId;
    const feature = this.draw.getSnapshotFeature(id);
    this.editingId = null;

    this.guard = true;
    this.switching = true;
    try {
      if (feature) this.draw.removeFeatures([id]);
    } catch {
      /* already gone */
    }
    try {
      this.draw.setMode(MODE_BY_TOOL[this.tool]);
    } catch {
      /* mode does not exist */
    }
    this.switching = false;
    this.guard = false;

    if (feature && commit) this.callbacks.onGeometry(id, feature.geometry);
    this.refreshAll();
  }

  private refreshAll() {
    for (const layer of this.doc.layers) this.updateLayerData(layer);
    this.updateSelectionRing();
  }

  private toDrawFeature(feature: MapFeature) {
    return {
      type: "Feature",
      id: feature.id,
      properties: {
        mode: MODE_BY_KIND[feature.kind],
        kind: feature.kind,
        label: feature.label,
        color: feature.style.color,
        fillOpacity: feature.style.fillOpacity,
        strokeWidth: feature.style.strokeWidth,
        size: feature.style.size,
        rotation: feature.style.rotation,
      },
      geometry: feature.geom,
    };
  }

  /* -------------------------------------------------------------- interaction */

  private onMouseDown(event: maplibregl.MapMouseEvent) {
    if (!this.draw) return;
    const original = event.originalEvent;
    if ("button" in original && original.button !== 0) return;

    if (this.tool === "text") {
      const hit = this.hitTest(event.point);
      if (hit) {
        const hitId = this.featureIdFromHit(hit);
        if (hitId) this.select(hitId);
        return;
      }
      const feature = this.createFeature("text", {
        type: "Point",
        coordinates: [event.lngLat.lng, event.lngLat.lat],
      });
      this.callbacks.onAdd(feature);
      this.selectedId = feature.id;
      this.callbacks.onSelect(feature.id);
      this.setTool("select");
      this.updateSelectionRing();
      return;
    }

    if (this.tool !== "select") return;

    const hit = this.hitTest(event.point);
    if (!hit) {
      if (!this.editingId && this.selectedId) {
        this.selectedId = null;
        this.callbacks.onSelect(null);
        this.updateSelectionRing();
      }
      return;
    }

    const id = this.featureIdFromHit(hit);
    if (!id) return;
    if (id === this.editingId) return;

    const feature = this.doc.features.find((item) => item.id === id);
    if (!feature) return;

    this.select(id);
    if (feature.kind === "text") this.startTextDrag(feature, event.lngLat);
  }

  private onContextMenu(event: maplibregl.MapMouseEvent) {
    event.originalEvent.preventDefault();
    if (!this.draw) return;

    const hit = this.hitTest(event.point);
    const featureId = hit ? this.featureIdFromHit(hit) : null;
    if (featureId) {
      if (this.tool !== "select") this.setTool("select");
      this.select(featureId);
    }

    const rect = this.map.getContainer().getBoundingClientRect();
    const original = event.originalEvent;
    this.callbacks.onContextMenu({
      featureId,
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
      clientX: "clientX" in original ? original.clientX : rect.left + event.point.x,
      clientY: "clientY" in original ? original.clientY : rect.top + event.point.y,
    });
  }

  private featureIdFromHit(hit: maplibregl.MapGeoJSONFeature): string | null {
    const raw = hit.properties?.fid;
    if (typeof raw === "string" && raw) return raw;
    return hit.id === undefined ? null : String(hit.id);
  }

  private hitTest(point: { x: number; y: number }) {
    const layers: string[] = [];
    for (const layer of this.doc.layers) {
      if (!layer.visible || layer.locked) continue;
      for (const suffix of SUFFIXES) {
        const id = `l-${layer.id}-${suffix}`;
        if (this.map.getLayer(id)) layers.push(id);
      }
    }
    if (!layers.length) return null;
    const hits = this.map.queryRenderedFeatures(
      [
        [point.x - 6, point.y - 6],
        [point.x + 6, point.y + 6],
      ],
      { layers },
    );
    return hits.length ? hits[0] : null;
  }

  private startTextDrag(feature: MapFeature, lngLat: maplibregl.LngLat) {
    this.draggingText = {
      id: feature.id,
      origin: feature.geom,
      startLng: lngLat.lng,
      startLat: lngLat.lat,
    };
    this.map.dragPan.disable();
    this.map.getCanvas().style.cursor = "grabbing";
    const finish = () => {
      window.removeEventListener("mouseup", finish);
      this.endTextDrag();
    };
    window.addEventListener("mouseup", finish);
  }

  private moveText(lng: number, lat: number) {
    const drag = this.draggingText;
    if (!drag) return;
    this.previewGeom = {
      id: drag.id,
      geom: { type: "Point", coordinates: [lng, lat] },
    };
    this.refreshAll();
  }

  private endTextDrag() {
    const drag = this.draggingText;
    const preview = this.previewGeom;
    this.draggingText = null;
    this.previewGeom = null;
    this.map.dragPan.enable();
    this.map.getCanvas().style.cursor = "";
    if (!drag) return;

    const geom = preview && preview.id === drag.id ? preview.geom : drag.origin;
    if (JSON.stringify(geom) !== JSON.stringify(drag.origin)) {
      this.callbacks.onGeometry(drag.id, geom);
    }
    this.refreshAll();
  }

  private createFeature(kind: FeatureKind, geom: Geometry): MapFeature {
    const layerId = this.activeLayerId || this.doc.layers[0]?.id || "";
    return {
      id: crypto.randomUUID(),
      layerId,
      kind,
      geom,
      title: "",
      description: "",
      label: kind === "text" ? "Текст" : "",
      style: defaultStyle(kind),
    };
  }

  private afterFinish(id: string) {
    if (!this.draw || this.destroyed) return;
    const feature = this.draw.getSnapshotFeature(id);
    if (!feature) return;

    if (this.editingId === id) {
      this.callbacks.onGeometry(id, feature.geometry);
      this.refreshAll();
      return;
    }

    const kind = KIND_BY_TOOL[this.tool] ?? "polygon";

    if (kind === "arrow" && feature.geometry.type === "LineString") {
      this.convertToArrow(id, feature as Feature<LineString>);
      return;
    }

    const mapFeature = this.createFeature(kind, feature.geometry);
    mapFeature.id = id;

    this.editingId = id;
    this.callbacks.onAdd(mapFeature);
    this.callbacks.onSelect(id);
    this.selectedId = id;
    this.setTool("select");

    try {
      this.draw.updateFeatureProperties(id, {
        mode: MODE_BY_KIND[kind],
        kind,
        color: mapFeature.style.color,
        fillOpacity: mapFeature.style.fillOpacity,
        strokeWidth: mapFeature.style.strokeWidth,
      } as never);
      this.switching = true;
      this.draw.setMode("select");
      this.switching = false;
      this.draw.selectFeature(id);
    } catch (error) {
      console.warn("[finish]", error);
    }

    this.refreshAll();
  }

  private convertToArrow(id: string, feature: Feature<LineString>) {
    const polygon = arrowFromLine(feature.geometry);
    if (!polygon) {
      this.guard = true;
      this.draw.removeFeatures([id]);
      this.guard = false;
      return;
    }

    this.guard = true;
    this.draw.removeFeatures([id]);
    const newId = this.draw.getFeatureId();
    const mapFeature: MapFeature = {
      ...this.createFeature("arrow", polygon),
      id: String(newId),
    };

    this.draw.addFeatures([
      {
        type: "Feature",
        id: newId,
        properties: {
          mode: "polygon",
          kind: "arrow",
          color: mapFeature.style.color,
          fillOpacity: 0.9,
          strokeWidth: 0,
          size: mapFeature.style.size,
          rotation: 0,
        },
        geometry: polygon,
      } as never,
    ]);
    this.guard = false;

    mapFeature.style.fillOpacity = 0.9;
    this.editingId = String(newId);
    this.callbacks.onAdd(mapFeature);
    this.callbacks.onSelect(String(newId));
    this.selectedId = String(newId);
    this.setTool("select");

    try {
      this.switching = true;
      this.draw.setMode("select");
      this.switching = false;
      this.draw.selectFeature(newId);
    } catch {
      /* ignore */
    }
    this.refreshAll();
  }

  setTool(tool: Tool) {
    this.tool = tool;
    this.callbacks.onTool(tool);
    if (!this.draw) return;
    if (tool !== "select") this.endEdit(true);
    this.switching = true;
    try {
      this.draw.setMode(MODE_BY_TOOL[tool]);
    } finally {
      this.switching = false;
    }
    this.map.getCanvas().style.cursor = tool === "text" ? "crosshair" : "";
    if (tool === "select" && this.selectedId && !this.editingId) this.beginEdit(this.selectedId);
  }

  setActiveLayer(id: string) {
    this.activeLayerId = id;
  }

  setBasemap(key: Doc["basemap"]) {
    if (!this.draw || this.doc.basemap === key) return;
    this.doc = { ...this.doc, basemap: key };
    this.endEdit(true);
    this.guard = true;
    try {
      this.draw.stop();
    } catch {
      /* ignore */
    }
    this.layerIds = [];
    this.map.setStyle(BASEMAPS[key].url);
    this.map.once("style.load", () => {
      this.ensureSelectionLayer();
      this.draw.start();
      this.draw.setMode("select");
      this.guard = false;
      this.render(this.doc);
    });
  }

  deleteSelected() {
    const id = this.selectedId;
    if (!id) return;
    this.endEdit(false);
    this.selectedId = null;
    this.callbacks.onSelect(null);
    this.callbacks.onDelete(id);
    this.updateSelectionRing();
  }

  duplicateSelected() {
    const id = this.selectedId;
    if (!id) return;
    this.endEdit(true);
    this.callbacks.onDuplicate(id);
  }

  hasClipboard() {
    return Boolean(this.clipboard);
  }

  copySelected(): boolean {
    return this.selectedId ? this.copyFeature(this.selectedId) : false;
  }

  copyFeature(id: string): boolean {
    const feature = this.doc.features.find((item) => item.id === id);
    if (!feature) return false;
    this.clipboard = { ...feature, style: { ...feature.style } };
    return true;
  }

  pasteAt(lng: number, lat: number) {
    const source = this.clipboard;
    if (!source) return;
    const [centerLng, centerLat] = geometryCenter(source.geom);
    const layerId = this.doc.layers.some((layer) => layer.id === source.layerId)
      ? source.layerId
      : this.activeLayerId;

    this.placeFeature({
      ...source,
      id: crypto.randomUUID(),
      layerId,
      geom: translateGeometry(source.geom, lng - centerLng, lat - centerLat),
      style: { ...source.style },
    });
  }

  addAt(kind: FeatureKind, lng: number, lat: number) {
    this.placeFeature(
      this.createFeature(kind, { type: "Point", coordinates: [lng, lat] }),
    );
  }

  private placeFeature(feature: MapFeature) {
    this.callbacks.onAdd(feature);
    this.selectedId = feature.id;
    this.callbacks.onSelect(feature.id);
    this.setTool("select");
  }

  fitAll() {
    this.fitTo(this.doc.features);
  }

  fitTo(features: MapFeature[]) {
    const withGeometry = features.filter((feature) => feature.geom);
    if (!withGeometry.length) return;
    const bounds = new maplibregl.LngLatBounds();
    const walk = (coords: unknown) => {
      if (Array.isArray(coords) && typeof coords[0] === "number") {
        bounds.extend(coords as [number, number]);
        return;
      }
      if (Array.isArray(coords)) coords.forEach(walk);
    };
    for (const feature of withGeometry) {
      const geom = feature.geom as { coordinates?: unknown };
      if (geom.coordinates) walk(geom.coordinates);
    }
    if (!bounds.isEmpty()) this.map.fitBounds(bounds, { padding: 120, maxZoom: 15, duration: 500 });
  }

  zoomBy(delta: number) {
    this.map.easeTo({ zoom: this.map.getZoom() + delta, duration: 200 });
  }

  /* ----------------------------------------------------------------- export */

  async exportPng() {
    const png = await this.renderPng();
    if (png) this.download(png, `${(this.doc.title || "map").trim() || "map"}.png`);
  }

  private async renderPng(): Promise<Blob | null> {
    if (this.selectedId) {
      this.endEdit(true);
      this.selectedId = null;
      this.callbacks.onSelect(null);
      this.updateSelectionRing();
      await new Promise<void>((resolve) => {
        this.map.once("idle", () => resolve());
        setTimeout(resolve, 400);
      });
    }

    const canvas = this.map.getCanvas();
    const scale = canvas.width / Math.max(1, this.map.getContainer().clientWidth);
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
    ctx.fillText(this.doc.title || "Карта", 24 * scale, bar * 0.5);

    return new Promise((resolve) => out.toBlob((blob) => resolve(blob), "image/png"));
  }

  exportGeoJson() {
    const features: Feature[] = this.doc.features.map((feature) => ({
      type: "Feature",
      id: feature.id,
      properties: {
        kind: feature.kind,
        title: feature.title,
        description: feature.description,
        label: feature.label,
        color: feature.style.color,
        layer: this.doc.layers.find((layer) => layer.id === feature.layerId)?.name,
      },
      geometry: feature.geom,
    }));
    const blob = new Blob(
      [JSON.stringify({ type: "FeatureCollection", features }, null, 2)],
      { type: "application/geo+json" },
    );
    this.download(blob, `${(this.doc.title || "map").trim() || "map"}.geojson`);
  }

  private download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  destroy() {
    this.destroyed = true;
    try {
      this.draw?.stop();
      this.map.remove();
    } catch {
      /* ignore */
    }
  }
}
