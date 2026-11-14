"use client";

import { useMemo } from "react";
import { PALETTE, kindLabel } from "@/lib/config";
import { areaKm2, lengthKm, vertexCount } from "@/lib/geo";
import type { FeatureKind, Layer, MapFeature } from "@/lib/types";
import { Glyph } from "./Glyph";

function formatArea(km2?: number): string {
  if (km2 === undefined) return "—";
  if (km2 >= 10) return `${Math.round(km2).toLocaleString("ru-RU")} км²`;
  if (km2 >= 0.01) return `${km2.toFixed(2)} км²`;
  return `${Math.round(km2 * 1e6).toLocaleString("ru-RU")} м²`;
}

function formatLength(km?: number): string {
  if (km === undefined) return "—";
  if (km >= 1) return `${km.toFixed(1)} км`;
  return `${Math.round(km * 1000)} м`;
}

const FILLED: FeatureKind[] = ["polygon", "rectangle", "circle", "arrow"];
const STROKED: FeatureKind[] = ["polygon", "rectangle", "circle", "line", "arrow"];

type Props = {
  feature: MapFeature | null;
  layer: Layer | null;
  layers: Layer[];
  featureCount: number;
  onUpdateFeature: (id: string, patch: Partial<MapFeature>) => void;
  onUpdateLayer: (id: string, patch: Partial<Layer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  onRemoveLayer: (id: string) => void;
};

export function Inspector(props: Props) {
  const {
    feature,
    layer,
    layers,
    featureCount,
    onUpdateFeature,
    onUpdateLayer,
    onDelete,
    onDuplicate,
    onClose,
    onRemoveLayer,
  } = props;

  const meta = useMemo(() => {
    if (!feature) return null;
    return {
      area: areaKm2(feature.geom),
      length: lengthKm(feature.geom),
      vertices: vertexCount(feature.geom),
    };
  }, [feature]);

  if (!feature && !layer) return null;

  if (feature) {
    const style = feature.style;
    const patchStyle = (patch: Partial<typeof style>) =>
      onUpdateFeature(feature.id, { style: { ...style, ...patch } });

    return (
      <div className="panel inspector">
        <div className="panel-head">
          <h3>Объект</h3>
          <button className="icon-btn" onClick={onClose} title="Снять выделение">
            <Glyph name="close" size={15} />
          </button>
        </div>

        <div className="kind-tag">{kindLabel(feature.kind)}</div>

        {feature.kind === "text" && (
          <>
            <div className="field">
              <label>Текст</label>
              <textarea
                rows={2}
                value={feature.label}
                onChange={(event) => onUpdateFeature(feature.id, { label: event.target.value })}
              />
            </div>
            <div className="field">
              <label>Размер · {style.size}px</label>
              <input
                type="range"
                min={10}
                max={48}
                value={style.size}
                onChange={(event) => patchStyle({ size: Number(event.target.value) })}
              />
            </div>
            <div className="field">
              <label>Поворот · {style.rotation}°</label>
              <input
                type="range"
                min={-180}
                max={180}
                value={style.rotation}
                onChange={(event) => patchStyle({ rotation: Number(event.target.value) })}
              />
            </div>
          </>
        )}

        <div className="field">
          <label>Название</label>
          <input
            type="text"
            value={feature.title}
            placeholder="Без названия"
            onChange={(event) => onUpdateFeature(feature.id, { title: event.target.value })}
          />
        </div>

        <div className="field">
          <label>Описание</label>
          <textarea
            rows={2}
            value={feature.description}
            placeholder="Добавить описание"
            onChange={(event) => onUpdateFeature(feature.id, { description: event.target.value })}
          />
        </div>

        <div className="field">
          <label>Цвет</label>
          <div className="swatches">
            {PALETTE.map((color) => (
              <button
                key={color}
                className={`swatch ${style.color.toLowerCase() === color ? "on" : ""}`}
                style={{ background: color }}
                onClick={() => patchStyle({ color })}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        {FILLED.includes(feature.kind) && (
          <div className="field">
            <label>Заливка · {Math.round(style.fillOpacity * 100)}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(style.fillOpacity * 100)}
              onChange={(event) => patchStyle({ fillOpacity: Number(event.target.value) / 100 })}
            />
          </div>
        )}

        {STROKED.includes(feature.kind) && (
          <div className="field">
            <label>Обводка · {style.strokeWidth}px</label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={style.strokeWidth}
              onChange={(event) => patchStyle({ strokeWidth: Number(event.target.value) })}
            />
          </div>
        )}

        <div className="field">
          <label>Слой</label>
          <select
            value={feature.layerId}
            onChange={(event) => onUpdateFeature(feature.id, { layerId: event.target.value })}
          >
            {layers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="meta">
          {meta?.area !== undefined && (
            <span>
              Площадь <b>{formatArea(meta.area)}</b>
            </span>
          )}
          {meta?.length !== undefined && (
            <span>
              Длина <b>{formatLength(meta.length)}</b>
            </span>
          )}
          {meta?.vertices !== undefined && (
            <span>
              Вершин <b>{meta.vertices}</b>
            </span>
          )}
        </div>

        <div className="row-2">
          <button className="btn" onClick={onDuplicate}>
            Дублировать
          </button>
          <button className="btn danger" onClick={onDelete}>
            Удалить
          </button>
        </div>
      </div>
    );
  }

  const active = layer as Layer;

  return (
    <div className="panel inspector">
      <div className="panel-head">
        <h3>Слой</h3>
        <button className="icon-btn" onClick={onClose} title="Закрыть">
          <Glyph name="close" size={15} />
        </button>
      </div>

      <div className="field">
        <label>Название</label>
        <input
          type="text"
          value={active.name}
          onChange={(event) => onUpdateLayer(active.id, { name: event.target.value })}
        />
      </div>

      <div className="field">
        <label>Прозрачность · {Math.round(active.opacity * 100)}%</label>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(active.opacity * 100)}
          onChange={(event) => onUpdateLayer(active.id, { opacity: Number(event.target.value) / 100 })}
        />
      </div>

      <div className="chips">
        <button
          className={`chip ${active.visible ? "on" : ""}`}
          onClick={() => onUpdateLayer(active.id, { visible: !active.visible })}
        >
          <Glyph name={active.visible ? "eye" : "eyeOff"} size={13} />
          {active.visible ? "Виден" : "Скрыт"}
        </button>
        <button
          className={`chip ${active.locked ? "on" : ""}`}
          onClick={() => onUpdateLayer(active.id, { locked: !active.locked })}
        >
          <Glyph name={active.locked ? "lock" : "unlock"} size={13} />
          {active.locked ? "Закрыт" : "Открыт"}
        </button>
      </div>

      <div className="meta">
        <span>
          Объектов <b>{featureCount}</b>
        </span>
      </div>

      <button
        className="btn danger"
        style={{ marginTop: 10 }}
        disabled={layers.length <= 1}
        onClick={() => onRemoveLayer(active.id)}
      >
        Удалить слой
      </button>
    </div>
  );
}
