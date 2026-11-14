"use client";

import { Glyph } from "./Glyph";

type Props = {
  onZoom: (delta: number) => void;
};

export function ViewBar({ onZoom }: Props) {
  return (
    <div className="panel viewbar">
      <button className="tb" onClick={() => onZoom(1)} title="Приблизить">
        <Glyph name="plus" size={16} />
      </button>
      <button className="tb" onClick={() => onZoom(-1)} title="Отдалить">
        <Glyph name="minus" size={16} />
      </button>
    </div>
  );
}
