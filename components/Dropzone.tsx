"use client";

import { Glyph } from "./Glyph";

export function Dropzone() {
  return (
    <div className="dropzone">
      <div className="dropzone-card">
        <Glyph name="download" size={22} />
        <b>Отпусти, чтобы добавить на карту</b>
        <span>GeoJSON · .geojson, .json</span>
      </div>
    </div>
  );
}
