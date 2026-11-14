"use client";

import { Glyph } from "./Glyph";

type Props = {
  panel: "layers" | "inspector" | null;
  onToggle: (panel: "layers" | "inspector") => void;
  onZoom: (delta: number) => void;
};

export function MobileTools({ panel, onToggle, onZoom }: Props) {
  return (
    <div className="panel mobile-tools">
      <button
        className={`tb ${panel === "layers" ? "active" : ""}`}
        onClick={() => onToggle("layers")}
        aria-label="Layers"
      >
        <Glyph name="layers" size={17} />
      </button>
      <button
        className={`tb ${panel === "inspector" ? "active" : ""}`}
        onClick={() => onToggle("inspector")}
        aria-label="Properties"
      >
        <Glyph name="palette" size={17} />
      </button>
      <button className="tb" onClick={() => onZoom(1)} aria-label="Zoom in">
        <Glyph name="plus" size={17} />
      </button>
      <button className="tb" onClick={() => onZoom(-1)} aria-label="Zoom out">
        <Glyph name="minus" size={17} />
      </button>
    </div>
  );
}
