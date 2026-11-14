import type { Geometry } from "geojson";
import type { Map as MlMap, LngLat, MapMouseEvent, MapTouchEvent, Point } from "maplibre-gl";
import type { TerraDraw } from "terra-draw";

import { insertVertexAt } from "../geo/measure";
import { pointInBounds } from "../geo/coords";
import type { Doc, FeatureKind, MapContextMenu, MapFeature, Tool } from "../types";
import type { LayerViews } from "./layers";
import {
  HIT_RADIUS,
  TOUCH_HIT_RADIUS,
  featureIdFromHit,
  hitTest,
  idsInBounds,
  nearHandle,
} from "./picking";
import type { SelectionController } from "./selection";
import type { TextDragController } from "./textDrag";

const MARQUEE_PIXELS = 4;
const TAP_SLOP = 10;
const VERTEX_SNAP = 10;

type SurfaceEvent = { point: Point; lngLat: LngLat };

type SurfaceDeps = {
  map: MlMap;
  views: LayerViews;
  selection: SelectionController;
  textDrag: TextDragController;
  doc: () => Doc;
  tool: () => Tool;
  draw: () => TerraDraw | null;
  createFeature: (kind: FeatureKind, geom: Geometry) => MapFeature;
  setTool: (tool: Tool) => void;
  onAdd: (feature: MapFeature) => void;
  onGeometry: (id: string, geom: Geometry) => void;
  onContextMenu: (menu: MapContextMenu) => void;
};

export class SurfaceController {
  private pressEditingId: string | null = null;
  private tap: { point: Point; editingId: string | null } | null = null;
  private marquee: { start: Point; current: Point } | null = null;

  constructor(private readonly deps: SurfaceDeps) {}

  get marqueeActive(): boolean {
    return this.marquee !== null;
  }

  onMouseMove(event: MapMouseEvent) {
    if (this.deps.textDrag.active) this.deps.textDrag.move(event.lngLat.lng, event.lngLat.lat);
    if (this.marquee) this.updateMarquee(event.point);
  }

  onMouseDown(event: MapMouseEvent) {
    if (!this.deps.draw()) return;
    this.pressEditingId = this.deps.selection.editing;
    const original = event.originalEvent;
    if ("button" in original && original.button !== 0) return;

    if (this.deps.tool() === "select" && original.shiftKey) {
      this.beginMarquee(event.point);
      return;
    }

    this.tapFeature(event.point, event.lngLat, true);
  }

  onTouchStart(event: MapTouchEvent) {
    this.tap =
      event.originalEvent.touches.length === 1
        ? { point: event.point, editingId: this.deps.selection.editing }
        : null;
  }

  onTouchEnd(event: MapTouchEvent) {
    const tap = this.tap;
    this.tap = null;
    if (!tap || !this.deps.draw()) return;
    if (Math.hypot(event.point.x - tap.point.x, event.point.y - tap.point.y) > TAP_SLOP) return;

    this.pressEditingId = tap.editingId;
    if (this.insertVertex(event)) return;
    this.tapFeature(event.point, event.lngLat, false);
  }

  onClick(event: SurfaceEvent) {
    this.insertVertex(event);
  }

  onContextMenu(event: MapMouseEvent) {
    event.originalEvent.preventDefault();
    if (!this.deps.draw()) return;

    const { map, selection, doc } = this.deps;
    const hit = hitTest(map, doc().layers, event.point);
    let featureId = hit ? featureIdFromHit(hit) : null;
    const editingId = selection.editing;

    if (!featureId && editingId) {
      const editing = doc().features.find((item) => item.id === editingId);
      if (editing && pointInBounds(editing.geom, event.lngLat.lng, event.lngLat.lat)) {
        featureId = editingId;
      }
    }

    if (featureId) {
      if (this.deps.tool() !== "select") this.deps.setTool("select");
      selection.set([featureId]);
    }

    const rect = map.getContainer().getBoundingClientRect();
    const original = event.originalEvent;
    this.deps.onContextMenu({
      featureId,
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
      clientX: "clientX" in original ? original.clientX : rect.left + event.point.x,
      clientY: "clientY" in original ? original.clientY : rect.top + event.point.y,
    });
  }

  endPointerActions() {
    this.endMarquee();
    this.deps.textDrag.end();
  }

  private tapFeature(point: Point, lngLat: LngLat, precise: boolean) {
    const { map, selection, doc, textDrag } = this.deps;
    const radius = precise ? HIT_RADIUS : TOUCH_HIT_RADIUS;

    if (this.deps.tool() === "text") {
      const hit = hitTest(map, doc().layers, point, radius);
      const hitId = hit ? featureIdFromHit(hit) : null;
      if (hitId) {
        selection.set([hitId]);
        return;
      }
      const feature = this.deps.createFeature("text", {
        type: "Point",
        coordinates: [lngLat.lng, lngLat.lat],
      });
      this.deps.onAdd(feature);
      selection.adopt([feature.id]);
      this.deps.setTool("select");
      return;
    }

    if (this.deps.tool() !== "select") return;

    const hit = hitTest(map, doc().layers, point, radius);
    if (!hit) {
      if (!selection.editing && selection.selection.length) selection.clear();
      return;
    }

    const id = featureIdFromHit(hit);
    if (!id || id === selection.editing) return;

    const feature = doc().features.find((item) => item.id === id);
    if (!feature) return;

    selection.set([id]);
    if (precise && feature.kind === "text") textDrag.start(feature);
  }

  private beginMarquee(point: Point) {
    const { selection, map, views } = this.deps;
    selection.end(true);
    this.marquee = { start: point, current: point };
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
    views.showMarquee(this.marquee);
  }

  private updateMarquee(point: Point) {
    if (!this.marquee) return;
    this.marquee.current = point;
    this.deps.views.showMarquee(this.marquee);
  }

  private endMarquee() {
    const marquee = this.marquee;
    if (!marquee) return;

    const { map, views, selection, doc } = this.deps;
    this.marquee = null;
    this.pressEditingId = null;
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
    views.showMarquee(null);

    const { start, current } = marquee;
    const dragged =
      Math.abs(current.x - start.x) >= MARQUEE_PIXELS ||
      Math.abs(current.y - start.y) >= MARQUEE_PIXELS;

    if (!dragged) {
      const hit = hitTest(map, doc().layers, start);
      const id = hit ? featureIdFromHit(hit) : null;
      if (id) selection.toggle(id);
      return;
    }

    selection.set(idsInBounds(map, doc().layers, start, current));
  }

  private insertVertex(event: SurfaceEvent): boolean {
    const editingId = this.deps.selection.editing;
    if (this.deps.tool() !== "select" || !editingId || this.pressEditingId !== editingId) {
      return false;
    }

    const draw = this.deps.draw();
    const feature = draw?.getSnapshotFeature(editingId);
    if (!draw || !feature) return false;

    const result = insertVertexAt(feature.geometry, event.lngLat.lng, event.lngLat.lat);
    if (!result) return false;

    const target = this.deps.map.project(result.point);
    if (Math.hypot(target.x - event.point.x, target.y - event.point.y) > VERTEX_SNAP) return false;
    if (nearHandle(this.deps.map, feature.geometry, event.point)) return false;

    draw.updateFeatureGeometry(editingId, result.geometry as never);
    this.deps.onGeometry(editingId, result.geometry);
    return true;
  }
}
