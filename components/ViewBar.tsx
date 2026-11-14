"use client";

import { Glyph } from "./Glyph";

type Props = {
  onZoom: (delta: number) => void;
};

export function ViewBar({ onZoom }: Props) {
  return (
    <div className="panel viewbar">
      <button className="tb" onClick={() => onZoom(1)} title="Zoom in">
        <Glyph name="plus" size={16} />
      </button>
      <button className="tb" onClick={() => onZoom(-1)} title="Zoom out">
        <Glyph name="minus" size={16} />
      </button>
    </div>
  );
}
