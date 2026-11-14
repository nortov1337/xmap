"use client";

import type { Layer } from "@/lib/types";
import { Glyph } from "../Glyph";
import { Field, RangeField } from "./fields";

type Props = {
  layer: Layer;
  layerCount: number;
  featureCount: number;
  open: boolean;
  onUpdate: (id: string, patch: Partial<Layer>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

export function LayerForm({
  layer,
  layerCount,
  featureCount,
  open,
  onUpdate,
  onRemove,
  onClose,
}: Props) {
  return (
    <div className={`panel inspector ${open ? "open" : ""}`}>
      <div className="panel-head">
        <h3>Слой</h3>
        <button className="icon-btn" onClick={onClose} title="Закрыть">
          <Glyph name="close" size={15} />
        </button>
      </div>

      <Field label="Название">
        <input
          type="text"
          value={layer.name}
          onChange={(event) => onUpdate(layer.id, { name: event.target.value })}
        />
      </Field>

      <RangeField
        label={`Прозрачность · ${Math.round(layer.opacity * 100)}%`}
        min={10}
        value={Math.round(layer.opacity * 100)}
        onChange={(value) => onUpdate(layer.id, { opacity: value / 100 })}
      />

      <div className="chips">
        <button
          className={`chip ${layer.visible ? "on" : ""}`}
          onClick={() => onUpdate(layer.id, { visible: !layer.visible })}
        >
          <Glyph name={layer.visible ? "eye" : "eyeOff"} size={13} />
          {layer.visible ? "Виден" : "Скрыт"}
        </button>
        <button
          className={`chip ${layer.locked ? "on" : ""}`}
          onClick={() => onUpdate(layer.id, { locked: !layer.locked })}
        >
          <Glyph name={layer.locked ? "lock" : "unlock"} size={13} />
          {layer.locked ? "Закрыт" : "Открыт"}
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
        disabled={layerCount <= 1}
        onClick={() => onRemove(layer.id)}
      >
        Удалить слой
      </button>
    </div>
  );
}
