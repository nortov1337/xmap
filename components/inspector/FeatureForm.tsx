"use client";

import { useMemo } from "react";
import { kindLabel } from "@/lib/features";
import { formatArea, formatLength } from "@/lib/format";
import { areaKm2, lengthKm, vertexCount } from "@/lib/geo/measure";
import type { FeatureKind, Layer, MapFeature } from "@/lib/types";
import { Glyph } from "../Glyph";
import { ColorSwatches, Field, RangeField } from "./fields";

const FILLED: FeatureKind[] = ["polygon", "rectangle", "circle", "arrow"];
const STROKED: FeatureKind[] = ["polygon", "rectangle", "circle", "line", "arrow"];

type Props = {
  feature: MapFeature;
  layers: Layer[];
  open: boolean;
  onUpdate: (id: string, patch: Partial<MapFeature>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

export function FeatureForm({ feature, layers, open, onUpdate, onDelete, onDuplicate, onClose }: Props) {
  const meta = useMemo(
    () => ({
      area: areaKm2(feature.geom),
      length: lengthKm(feature.geom),
      vertices: vertexCount(feature.geom),
    }),
    [feature],
  );

  const style = feature.style;
  const patchStyle = (patch: Partial<typeof style>) =>
    onUpdate(feature.id, { style: { ...style, ...patch } });

  return (
    <div className={`panel inspector ${open ? "open" : ""}`}>
      <div className="panel-head">
        <h3>Объект</h3>
        <button className="icon-btn" onClick={onClose} title="Снять выделение">
          <Glyph name="close" size={15} />
        </button>
      </div>

      <div className="kind-tag">{kindLabel(feature.kind)}</div>

      {feature.kind === "text" && (
        <>
          <Field label="Текст">
            <textarea
              rows={2}
              value={feature.label}
              onChange={(event) => onUpdate(feature.id, { label: event.target.value })}
            />
          </Field>
          <RangeField
            label={`Размер · ${style.size}px`}
            min={10}
            max={48}
            value={style.size}
            onChange={(size) => patchStyle({ size })}
          />
          <RangeField
            label={`Поворот · ${style.rotation}°`}
            min={-180}
            max={180}
            value={style.rotation}
            onChange={(rotation) => patchStyle({ rotation })}
          />
        </>
      )}

      <Field label="Название">
        <input
          type="text"
          value={feature.title}
          placeholder="Без названия"
          onChange={(event) => onUpdate(feature.id, { title: event.target.value })}
        />
      </Field>

      <Field label="Описание">
        <textarea
          rows={2}
          value={feature.description}
          placeholder="Добавить описание"
          onChange={(event) => onUpdate(feature.id, { description: event.target.value })}
        />
      </Field>

      <Field label="Цвет">
        <ColorSwatches value={style.color} onChange={(color) => patchStyle({ color })} />
      </Field>

      {FILLED.includes(feature.kind) && (
        <RangeField
          label={`Заливка · ${Math.round(style.fillOpacity * 100)}%`}
          value={Math.round(style.fillOpacity * 100)}
          onChange={(value) => patchStyle({ fillOpacity: value / 100 })}
        />
      )}

      {STROKED.includes(feature.kind) && (
        <RangeField
          label={`Обводка · ${style.strokeWidth}px`}
          max={10}
          step={0.5}
          value={style.strokeWidth}
          onChange={(strokeWidth) => patchStyle({ strokeWidth })}
        />
      )}

      <Field label="Слой">
        <select
          value={feature.layerId}
          onChange={(event) => onUpdate(feature.id, { layerId: event.target.value })}
        >
          {layers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="meta">
        {meta.area !== undefined && (
          <span>
            Площадь <b>{formatArea(meta.area)}</b>
          </span>
        )}
        {meta.length !== undefined && (
          <span>
            Длина <b>{formatLength(meta.length)}</b>
          </span>
        )}
        {meta.vertices !== undefined && (
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
