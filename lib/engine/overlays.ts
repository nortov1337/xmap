import type { LayerSpecification, Map as MlMap } from "maplibre-gl";
import type { MapOverlays } from "../types";

type OverlayGroup = keyof MapOverlays;

type OverlayLayer = {
  id: string;
  group: OverlayGroup;
  visible: boolean;
};

const LABEL_TILES_LAYER = "labels";
const SIGN_SOURCE_LAYERS = new Set(["poi", "transportation_name"]);

function overlayGroup(layer: LayerSpecification): OverlayGroup | null {
  if (layer.type === "raster") return layer.id === LABEL_TILES_LAYER ? "labels" : null;
  if (layer.type !== "symbol") return null;

  const layout = layer.layout ?? {};
  const hasText = "text-field" in layout;
  const hasIcon = "icon-image" in layout;

  if (!hasIcon) return hasText ? "labels" : null;
  if (!hasText) return "signs";

  const sourceLayer = "source-layer" in layer ? layer["source-layer"] : undefined;
  return sourceLayer && SIGN_SOURCE_LAYERS.has(sourceLayer) ? "signs" : "labels";
}

export class BasemapOverlays {
  private readonly map: MlMap;
  private layers: OverlayLayer[] = [];
  private state: MapOverlays = { labels: true, signs: true };

  constructor(map: MlMap) {
    this.map = map;
    this.map.on("style.load", () => this.capture());
  }

  set(state: MapOverlays) {
    this.state = { ...state };
    this.apply();
  }

  private capture() {
    this.layers = (this.map.getStyle()?.layers ?? []).flatMap((layer) => {
      const group = overlayGroup(layer);
      if (!group) return [];
      return [{ id: layer.id, group, visible: layer.layout?.visibility !== "none" }];
    });
    this.apply();
  }

  private apply() {
    for (const { id, group, visible } of this.layers) {
      if (!this.map.getLayer(id)) continue;
      const shown = visible && this.state[group];
      this.map.setLayoutProperty(id, "visibility", shown ? "visible" : "none");
    }
  }
}
