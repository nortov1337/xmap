"use client";

import type { Layer } from "@/lib/types";
import { Glyph } from "../Glyph";
import type { DragBind } from "./useDragReorder";

type Props = {
  layer: Layer;
  count: number;
  active: boolean;
  dragging: boolean;
  dropTarget: boolean;
  dragBind: DragBind;
  onSelect: () => void;
  onUpdate: (patch: Partial<Layer>) => void;
  onContextMenu: (x: number, y: number) => void;
};

export function LayerRow({
  layer,
  count,
  active,
  dragging,
  dropTarget,
  dragBind,
  onSelect,
  onUpdate,
  onContextMenu,
}: Props) {
  return (
    <div
      draggable
      className={`layer-row ${active ? "active" : ""} ${layer.visible ? "" : "hidden-layer"} ${
        dragging ? "dragging" : ""
      } ${dropTarget ? "drop-target" : ""}`}
      onClick={onSelect}
      onDoubleClick={() => {
        const name = window.prompt("Название слоя", layer.name);
        if (name) onUpdate({ name });
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(event.clientX, event.clientY);
      }}
      {...dragBind}
      title="Клик — свойства слоя, двойной клик — переименовать, перетащить — изменить порядок"
    >
      <button
        className="icon-btn"
        onClick={(event) => {
          event.stopPropagation();
          onUpdate({ visible: !layer.visible });
        }}
        title={layer.visible ? "Скрыть слой" : "Показать слой"}
      >
        <Glyph name={layer.visible ? "eye" : "eyeOff"} size={15} />
      </button>
      <span className="layer-name">{layer.name}</span>
      <span className="count">{count}</span>
      <button
        className={`icon-btn ${layer.locked ? "on" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onUpdate({ locked: !layer.locked });
        }}
        title={layer.locked ? "Разблокировать" : "Заблокировать"}
      >
        <Glyph name={layer.locked ? "lock" : "unlock"} size={14} />
      </button>
    </div>
  );
}
