import type { Map as MlMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import { lineStyles, pointStyles, selectModeStyles, shapeStyles } from "./styles";

const VERTEX_FLAGS = {
  midpoints: { draggable: true },
  draggable: true,
  deletable: true,
  snappable: true,
};

const SHAPE_FLAGS = {
  feature: {
    draggable: true,
    rotateable: true,
    scaleable: true,
    coordinates: VERTEX_FLAGS,
  },
};

const SELECT_FLAGS = {
  polygon: SHAPE_FLAGS,
  rectangle: SHAPE_FLAGS,
  circle: { feature: { draggable: true, scaleable: true } },
  linestring: { feature: { draggable: true, coordinates: VERTEX_FLAGS } },
  point: { feature: { draggable: true } },
};

export function createDraw(map: MlMap): TerraDraw {
  return new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map, coordinatePrecision: 9 }),
    modes: [
      new TerraDrawPolygonMode({ styles: shapeStyles() as never }),
      new TerraDrawRectangleMode({
        styles: shapeStyles() as never,
        drawInteraction: "click-move-or-drag",
      } as never),
      new TerraDrawCircleMode({
        styles: shapeStyles() as never,
        drawInteraction: "click-move-or-drag",
      } as never),
      new TerraDrawLineStringMode({ styles: lineStyles() as never }),
      new TerraDrawPointMode({ styles: pointStyles() as never }),
      new TerraDrawRenderMode({ modeName: "idle" } as never),
      new TerraDrawSelectMode({
        allowManualSelection: true,
        flags: SELECT_FLAGS,
        styles: selectModeStyles() as never,
      }),
    ],
  });
}
