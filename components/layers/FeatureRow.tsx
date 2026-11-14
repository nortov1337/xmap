"use client";

import { featureIcon, kindLabel } from "@/lib/features";
import type { MapFeature } from "@/lib/types";
import { Glyph } from "../Glyph";
import type { DragBind } from "./useDragReorder";

type Props = {
  feature: MapFeature;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  dragBind: DragBind;
  onSelect: () => void;
  onContextMenu: (x: number, y: number) => void;
};

export function FeatureRow({
  feature,
  selected,
  dragging,
  dropTarget,
  dragBind,
  onSelect,
  onContextMenu,
}: Props) {
  return (
    <div
      draggable
      className={`feature-row ${selected ? "active" : ""} ${dragging ? "dragging" : ""} ${
        dropTarget ? "drop-target" : ""
      }`}
      onClick={onSelect}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(event.clientX, event.clientY);
      }}
      {...dragBind}
      title="Drag to reorder or move to another layer"
    >
      <span className="feature-icon">
        <Glyph name={featureIcon(feature.kind)} size={14} />
      </span>
      <span className="layer-name">
        {feature.title || (feature.kind === "text" ? feature.label : "") || kindLabel(feature.kind)}
      </span>
    </div>
  );
}
