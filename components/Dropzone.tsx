"use client";

import { Glyph } from "./Glyph";

export function Dropzone() {
  return (
    <div className="dropzone">
      <div className="dropzone-card">
        <Glyph name="download" size={22} />
        <b>Drop to add to the map</b>
        <span>GeoJSON · .geojson, .json</span>
      </div>
    </div>
  );
}
