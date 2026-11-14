"use client";

import { GLYPH_PATHS, type GlyphName } from "@/lib/icons";

export function Glyph({ name, size = 18 }: { name: GlyphName; size?: number }) {
  const paths = GLYPH_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
