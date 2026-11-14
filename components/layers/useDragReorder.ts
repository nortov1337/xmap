"use client";

import { useState, type DragEvent } from "react";

type DragItem = { kind: "layer" | "feature"; id: string };

export type DragBind = {
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
};

type ReorderDeps = {
  onReorderLayers: (fromId: string, toId: string) => void;
  onReorderFeatures: (fromId: string, toId: string) => void;
  onMoveFeatureToLayer: (featureId: string, layerId: string) => void;
};

export function useDragReorder(deps: ReorderDeps) {
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const finish = () => {
    setDrag(null);
    setOverId(null);
  };

  const bind = (kind: DragItem["kind"], id: string): DragBind => ({
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      setDrag({ kind, id });
    },
    onDragEnd: finish,
    onDragOver: (event) => {
      if (!drag) return;
      if (kind === "feature" && drag.kind !== "feature") return;
      event.preventDefault();
      setOverId(id);
    },
    onDragLeave: () => setOverId((current) => (current === id ? null : current)),
    onDrop: (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (drag && drag.id !== id) {
        if (kind === "layer") {
          if (drag.kind === "layer") deps.onReorderLayers(drag.id, id);
          else deps.onMoveFeatureToLayer(drag.id, id);
        } else if (drag.kind === "feature") {
          deps.onReorderFeatures(drag.id, id);
        }
      }
      finish();
    },
  });

  return {
    bind,
    isDragging: (kind: DragItem["kind"], id: string) => drag?.kind === kind && drag.id === id,
    isDropTarget: (id: string) => overId === id,
  };
}
