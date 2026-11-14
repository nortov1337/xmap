"use client";

import type { Layer, MapFeature } from "@/lib/types";
import { Glyph } from "./Glyph";
import { FeatureRow } from "./layers/FeatureRow";
import { LayerRow } from "./layers/LayerRow";
import { useDragReorder } from "./layers/useDragReorder";

type Props = {
  title: string;
  onTitle: (title: string) => void;
  layers: Layer[];
  features: MapFeature[];
  activeLayerId: string;
  selectedIds: string[];
  open: boolean;
  onClose: () => void;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onUpdateLayer: (id: string, patch: Partial<Layer>) => void;
  onSelectFeature: (id: string) => void;
  onReorderLayers: (fromId: string, toId: string) => void;
  onReorderFeatures: (fromId: string, toId: string) => void;
  onMoveFeatureToLayer: (featureId: string, layerId: string) => void;
  onLayerContextMenu: (id: string, x: number, y: number) => void;
  onFeatureContextMenu: (id: string, x: number, y: number) => void;
};

export function LayersPanel(props: Props) {
  const {
    title,
    onTitle,
    layers,
    features,
    activeLayerId,
    selectedIds,
    open,
    onClose,
    onSelectLayer,
    onAddLayer,
    onUpdateLayer,
    onSelectFeature,
    onReorderLayers,
    onReorderFeatures,
    onMoveFeatureToLayer,
    onLayerContextMenu,
    onFeatureContextMenu,
  } = props;

  const dnd = useDragReorder({ onReorderLayers, onReorderFeatures, onMoveFeatureToLayer });
  const activeFeatures = features.filter((feature) => feature.layerId === activeLayerId);

  return (
    <div className={`panel layers-panel ${open ? "open" : ""}`}>
      <div className="panel-head">
        <div className="brand">
          <b>XMap</b>
        </div>
        <div className="head-actions">
          <button className="icon-btn" onClick={onAddLayer} title="New layer">
            <Glyph name="plus" size={16} />
          </button>
          <button className="icon-btn mobile-only" onClick={onClose} title="Close">
            <Glyph name="close" size={16} />
          </button>
        </div>
      </div>

      <input
        className="title-input"
        value={title}
        onChange={(event) => onTitle(event.target.value)}
        placeholder="Map title"
        spellCheck={false}
      />

      <div className="section">
        <div className="section-head">
          <span>Layers</span>
          <span>{layers.length}</span>
        </div>
        {layers.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            count={features.filter((feature) => feature.layerId === layer.id).length}
            active={activeLayerId === layer.id}
            dragging={dnd.isDragging("layer", layer.id)}
            dropTarget={dnd.isDropTarget(layer.id)}
            dragBind={dnd.bind("layer", layer.id)}
            onSelect={() => onSelectLayer(layer.id)}
            onUpdate={(patch) => onUpdateLayer(layer.id, patch)}
            onContextMenu={(x, y) => onLayerContextMenu(layer.id, x, y)}
          />
        ))}
      </div>

      <div className="section objects">
        <div className="section-head">
          <span>Features</span>
          <span>{activeFeatures.length}</span>
        </div>
        {activeFeatures.length === 0 && (
          <div className="empty">Empty. Draw something on the map.</div>
        )}
        {activeFeatures.map((feature) => (
          <FeatureRow
            key={feature.id}
            feature={feature}
            selected={selectedIds.includes(feature.id)}
            dragging={dnd.isDragging("feature", feature.id)}
            dropTarget={dnd.isDropTarget(feature.id)}
            dragBind={dnd.bind("feature", feature.id)}
            onSelect={() => onSelectFeature(feature.id)}
            onContextMenu={(x, y) => onFeatureContextMenu(feature.id, x, y)}
          />
        ))}
      </div>
    </div>
  );
}
