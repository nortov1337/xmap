"use client";

import { Glyph } from "../Glyph";

type Props = {
  count: number;
  open: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

export function MultiSelection({ count, open, onDelete, onDuplicate, onClose }: Props) {
  return (
    <div className={`panel inspector ${open ? "open" : ""}`}>
      <div className="panel-head">
        <h3>Выбрано</h3>
        <button className="icon-btn" onClick={onClose} title="Снять выделение">
          <Glyph name="close" size={15} />
        </button>
      </div>

      <div className="kind-tag">Объектов: {count}</div>

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
