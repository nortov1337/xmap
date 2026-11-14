"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { readStored, writeStored } from "@/lib/storage";
import { TOOLS } from "@/lib/tools";
import type { Tool } from "@/lib/types";
import { Glyph } from "./Glyph";

const POSITION_KEY = "xmap.toolbar-position";

type Props = {
  tool: Tool;
  onTool: (tool: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onExportPng: () => void;
  onExportGeoJson: () => void;
  onSettings: () => void;
};

type Position = { x: number; y: number };

function readPosition(): Position | null {
  const parsed = readStored(POSITION_KEY) as Position | null;
  if (typeof parsed?.x === "number" && typeof parsed?.y === "number") return parsed;
  return null;
}

export function Toolbar(props: Props) {
  const {
    tool,
    onTool,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    hasSelection,
    onDelete,
    onDuplicate,
    onExportPng,
    onExportGeoJson,
    onSettings,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; width: number; height: number } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const stored = readPosition();
    if (!stored) return;
    setPosition({
      x: Math.max(8, Math.min(stored.x, window.innerWidth - 120)),
      y: Math.max(8, Math.min(stored.y, window.innerHeight - 48)),
    });
  }, []);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state) return;
    setPosition({
      x: Math.min(Math.max(8, event.clientX - state.dx), window.innerWidth - state.width - 8),
      y: Math.min(Math.max(8, event.clientY - state.dy), window.innerHeight - state.height - 8),
    });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (position) writeStored(POSITION_KEY, position);
  };

  return (
    <div
      ref={rootRef}
      className="panel toolbar"
      style={position ? { left: position.x, top: position.y, transform: "none" } : undefined}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span className="toolbar-grip" title="Drag panel">
        <Glyph name="grip" size={14} />
      </span>

      {TOOLS.map((entry) => (
        <button
          key={entry.tool}
          className={`tb ${tool === entry.tool ? "active" : ""}`}
          onClick={() => onTool(entry.tool)}
          aria-label={entry.label}
        >
          <Glyph name={entry.icon} />
          <span className="key">{entry.key}</span>
          <span className="tip">{entry.label}</span>
        </button>
      ))}

      <span className="sep" />
      <button className="tb" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
        <Glyph name="undo" />
        <span className="tip">Undo · Ctrl+Z</span>
      </button>
      <button className="tb" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
        <Glyph name="redo" />
        <span className="tip">Redo · Ctrl+Y</span>
      </button>

      <span className="sep" />
      <button className="tb" onClick={onDuplicate} disabled={!hasSelection} aria-label="Duplicate">
        <Glyph name="copy" />
        <span className="tip">Duplicate · Ctrl+D</span>
      </button>
      <button className="tb" onClick={onDelete} disabled={!hasSelection} aria-label="Delete">
        <Glyph name="trash" />
        <span className="tip">Delete · Del</span>
      </button>

      <span className="sep" />
      <button className="tb" onClick={onExportPng} aria-label="Export PNG">
        <Glyph name="image" />
        <span className="tip">Export PNG</span>
      </button>
      <button className="tb" onClick={onExportGeoJson} aria-label="Export GeoJSON">
        <Glyph name="download" />
        <span className="tip">Export GeoJSON</span>
      </button>

      <span className="sep" />
      <button className="tb" onClick={onSettings} aria-label="Settings">
        <Glyph name="settings" />
        <span className="tip">Settings</span>
      </button>
    </div>
  );
}
