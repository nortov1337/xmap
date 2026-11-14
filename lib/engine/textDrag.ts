import type { Geometry } from "geojson";
import type { Map as MlMap } from "maplibre-gl";

import type { MapFeature } from "../types";

export class TextDragController {
  private drag: { id: string; origin: Geometry } | null = null;
  private geom: Geometry | null = null;

  constructor(
    private readonly map: MlMap,
    private readonly refresh: () => void,
    private readonly onGeometry: (id: string, geom: Geometry) => void,
  ) {}

  get preview(): { id: string; geom: Geometry } | null {
    return this.drag && this.geom ? { id: this.drag.id, geom: this.geom } : null;
  }

  get active(): boolean {
    return this.drag !== null;
  }

  start(feature: MapFeature) {
    this.drag = { id: feature.id, origin: feature.geom };
    this.geom = null;
    this.map.dragPan.disable();
    this.map.getCanvas().style.cursor = "grabbing";
  }

  move(lng: number, lat: number) {
    if (!this.drag) return;
    this.geom = { type: "Point", coordinates: [lng, lat] };
    this.refresh();
  }

  end() {
    const drag = this.drag;
    if (!drag) return;

    const geom = this.geom ?? drag.origin;
    this.drag = null;
    this.geom = null;
    this.map.dragPan.enable();
    this.map.getCanvas().style.cursor = "";

    if (JSON.stringify(geom) !== JSON.stringify(drag.origin)) this.onGeometry(drag.id, geom);
    this.refresh();
  }
}
