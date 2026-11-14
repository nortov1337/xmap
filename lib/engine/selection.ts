import type { Geometry } from "geojson";
import type { TerraDraw } from "terra-draw";

import type { Doc, Tool } from "../types";
import { toDrawFeature } from "./feature";
import type { LayerViews, LayerViewState } from "./layers";
import { MODE_BY_TOOL, isEditable } from "./modes";

type SelectionDeps = {
  doc: () => Doc;
  draw: () => TerraDraw | null;
  tool: () => Tool;
  preview: () => { id: string; geom: Geometry } | null;
  views: LayerViews;
  onSelect: (ids: string[]) => void;
  onGeometry: (id: string, geom: Geometry) => void;
};

function sameSelection(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export class SelectionController {
  private ids: string[] = [];
  private editingId: string | null = null;
  private guard = false;
  private switching = false;

  constructor(private readonly deps: SelectionDeps) {}

  get selection(): string[] {
    return this.ids;
  }

  get editing(): string | null {
    return this.editingId;
  }

  get busy(): boolean {
    return this.guard || this.switching;
  }

  get viewState(): LayerViewState {
    return { editingId: this.editingId, preview: this.deps.preview(), selection: this.ids };
  }

  set(ids: string[]) {
    const next = ids.filter((id) => this.deps.doc().features.some((feature) => feature.id === id));
    if (sameSelection(this.ids, next)) {
      if (next.length === 1 && !this.editingId) this.begin(next[0]);
      return;
    }

    this.end(true);
    this.ids = next;
    this.deps.onSelect(next);
    this.highlight();
    if (next.length === 1) this.begin(next[0]);
  }

  toggle(id: string) {
    this.set(this.ids.includes(id) ? this.ids.filter((item) => item !== id) : [...this.ids, id]);
  }

  clear() {
    this.ids = [];
    this.deps.onSelect([]);
    this.highlight();
  }

  adopt(ids: string[], editing = false) {
    this.ids = ids;
    if (editing) this.editingId = ids[0] ?? null;
    this.deps.onSelect(ids);
    this.highlight();
  }

  begin(id: string) {
    const doc = this.deps.doc();
    const feature = doc.features.find((item) => item.id === id);
    if (!feature) return;
    const layer = doc.layers.find((item) => item.id === feature.layerId);
    if (!isEditable(feature, layer) || !layer) return;

    const draw = this.deps.draw();
    if (!draw) return;

    this.editingId = id;
    this.guard = true;
    draw.addFeatures([toDrawFeature(feature) as never]);
    this.switching = true;
    draw.setMode("select");
    this.switching = false;
    this.guard = false;

    try {
      draw.selectFeature(id);
    } catch (error) {
      console.warn("[select]", error);
    }

    this.deps.views.refreshLayer(doc, layer, this.viewState);
  }

  end(commit: boolean) {
    if (!this.editingId) return;
    const id = this.editingId;
    const draw = this.deps.draw();
    const feature = draw?.getSnapshotFeature(id);
    this.editingId = null;

    this.guard = true;
    this.switching = true;
    try {
      if (feature) draw?.removeFeatures([id]);
    } catch {
      /* already gone */
    }
    try {
      draw?.setMode(MODE_BY_TOOL[this.deps.tool()]);
    } catch {
      /* mode does not exist */
    }
    this.switching = false;
    this.guard = false;

    if (feature && commit) this.deps.onGeometry(id, feature.geometry);
    this.refreshAll();
  }

  refreshAll() {
    this.deps.views.refresh(this.deps.doc(), this.viewState);
  }

  highlight() {
    this.deps.views.highlight(this.deps.doc(), this.viewState);
  }

  switchMode(mode: string) {
    this.switching = true;
    try {
      this.deps.draw()?.setMode(mode);
    } finally {
      this.switching = false;
    }
  }

  setGuard(value: boolean) {
    this.guard = value;
  }
}
