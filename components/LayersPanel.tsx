"use client";

import { useState, type DragEvent } from "react";
import { featureIcon, kindLabel } from "@/lib/config";
import type { Layer, MapFeature } from "@/lib/types";
import { Glyph } from "./Glyph";

type DragItem = { kind: "layer" | "feature"; id: string };

type Props = {
  title: string;
  onTitle: (title: string) => void;
  layers: Layer[];
  features: MapFeature[];
  activeLayerId: string;
  selectedId: string | null;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
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
    selectedId,
    onSelectLayer,
    onAddLayer,
    onToggleVisible,
    onToggleLock,
    onRenameLayer,
    onSelectFeature,
    onReorderLayers,
    onReorderFeatures,
    onMoveFeatureToLayer,
    onLayerContextMenu,
    onFeatureContextMenu,
  } = props;

  const [drag, setDrag] = useState<DragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const activeFeatures = features.filter((feature) => feature.layerId === activeLayerId);

  const startDrag = (event: DragEvent, item: DragItem) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    setDrag(item);
  };

  const finishDrag = () => {
    setDrag(null);
    setOverId(null);
  };

  const dropLayer = (event: DragEvent, layerId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (drag && drag.id !== layerId) {
      if (drag.kind === "layer") onReorderLayers(drag.id, layerId);
      else onMoveFeatureToLayer(drag.id, layerId);
    }
    finishDrag();
  };

  const dropFeature = (event: DragEvent, featureId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (drag?.kind === "feature" && drag.id !== featureId) onReorderFeatures(drag.id, featureId);
    finishDrag();
  };

  const hoverLayer = (event: DragEvent, layerId: string) => {
    if (!drag) return;
    event.preventDefault();
    setOverId(layerId);
  };

  const hoverFeature = (event: DragEvent, featureId: string) => {
    if (drag?.kind !== "feature") return;
    event.preventDefault();
    setOverId(featureId);
  };

  return (
    <div className="panel layers-panel">
      <div className="panel-head">
        <div className="brand">
          <b>XMap</b>
          <span>maps</span>
        </div>
        <button className="icon-btn" onClick={onAddLayer} title="Новый слой">
          <Glyph name="plus" size={16} />
        </button>
      </div>

      <input
        className="title-input"
        value={title}
        onChange={(event) => onTitle(event.target.value)}
        placeholder="Название карты"
        spellCheck={false}
      />

      <div className="section">
        <div className="section-head">
          <span>Слои</span>
          <span>{layers.length}</span>
        </div>
        {layers.map((layer) => {
          const count = features.filter((feature) => feature.layerId === layer.id).length;
          return (
            <div
              key={layer.id}
              draggable
              className={`layer-row ${activeLayerId === layer.id ? "active" : ""} ${
                layer.visible ? "" : "hidden-layer"
              } ${drag?.kind === "layer" && drag.id === layer.id ? "dragging" : ""} ${
                overId === layer.id ? "drop-target" : ""
              }`}
              onClick={() => onSelectLayer(layer.id)}
              onDoubleClick={() => {
                const name = window.prompt("Название слоя", layer.name);
                if (name) onRenameLayer(layer.id, name);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onLayerContextMenu(layer.id, event.clientX, event.clientY);
              }}
              onDragStart={(event) => startDrag(event, { kind: "layer", id: layer.id })}
              onDragEnd={finishDrag}
              onDragOver={(event) => hoverLayer(event, layer.id)}
              onDragLeave={() => setOverId((current) => (current === layer.id ? null : current))}
              onDrop={(event) => dropLayer(event, layer.id)}
              title="Клик — свойства слоя, двойной клик — переименовать, перетащить — изменить порядок"
            >
              <button
                className="icon-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleVisible(layer.id);
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
                  onToggleLock(layer.id);
                }}
                title={layer.locked ? "Разблокировать" : "Заблокировать"}
              >
                <Glyph name={layer.locked ? "lock" : "unlock"} size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="section objects">
        <div className="section-head">
          <span>Объекты</span>
          <span>{activeFeatures.length}</span>
        </div>
        {activeFeatures.length === 0 && (
          <div className="empty">Пусто. Нарисуй что-нибудь на карте.</div>
        )}
        {activeFeatures.map((feature) => (
          <div
            key={feature.id}
            draggable
            className={`feature-row ${selectedId === feature.id ? "active" : ""} ${
              drag?.kind === "feature" && drag.id === feature.id ? "dragging" : ""
            } ${overId === feature.id ? "drop-target" : ""}`}
            onClick={() => onSelectFeature(feature.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              onFeatureContextMenu(feature.id, event.clientX, event.clientY);
            }}
            onDragStart={(event) => startDrag(event, { kind: "feature", id: feature.id })}
            onDragEnd={finishDrag}
            onDragOver={(event) => hoverFeature(event, feature.id)}
            onDragLeave={() => setOverId((current) => (current === feature.id ? null : current))}
            onDrop={(event) => dropFeature(event, feature.id)}
            title="Перетащить — изменить порядок или слой"
          >
            <span className="feature-icon">
              <Glyph name={featureIcon(feature.kind)} size={14} />
            </span>
            <span className="layer-name">
              {feature.title ||
                (feature.kind === "text" ? feature.label : "") ||
                kindLabel(feature.kind)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
