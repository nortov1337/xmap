"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Tool } from "@/lib/types";
import { Glyph } from "./Glyph";

const TOOLS: Array<{ tool: Tool; icon: string; label: string; key?: string }> = [
  { tool: "select", icon: "cursor", label: "Выбрать", key: "V" },
  { tool: "marker", icon: "pin", label: "Метка", key: "M" },
  { tool: "text", icon: "text", label: "Текст", key: "T" },
  { tool: "line", icon: "line", label: "Линия", key: "L" },
  { tool: "arrow", icon: "arrow", label: "Стрелка", key: "A" },
  { tool: "polygon", icon: "polygon", label: "Область", key: "P" },
  { tool: "rectangle", icon: "square", label: "Прямоугольник", key: "R" },
  { tool: "circle", icon: "circle", label: "Круг", key: "O" },
];

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
};

type Position = { x: number; y: number };

function readPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") return parsed;
  } catch {
    /* ignore broken storage */
  }
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
    if (position) localStorage.setItem(POSITION_KEY, JSON.stringify(position));
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
      <span className="toolbar-grip" title="Перетащить панель">
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
      <button className="tb" onClick={onUndo} disabled={!canUndo} aria-label="Отменить">
        <Glyph name="undo" />
        <span className="tip">Отменить · Ctrl+Z</span>
      </button>
      <button className="tb" onClick={onRedo} disabled={!canRedo} aria-label="Повторить">
        <Glyph name="redo" />
        <span className="tip">Повторить · Ctrl+Y</span>
      </button>

      <span className="sep" />
      <button className="tb" onClick={onDuplicate} disabled={!hasSelection} aria-label="Дублировать">
        <Glyph name="copy" />
        <span className="tip">Дублировать · Ctrl+D</span>
      </button>
      <button className="tb" onClick={onDelete} disabled={!hasSelection} aria-label="Удалить">
        <Glyph name="trash" />
        <span className="tip">Удалить · Del</span>
      </button>

      <span className="sep" />
      <button className="tb" onClick={onExportPng} aria-label="Экспорт PNG">
        <Glyph name="image" />
        <span className="tip">Экспорт PNG</span>
      </button>
      <button className="tb" onClick={onExportGeoJson} aria-label="Экспорт GeoJSON">
        <Glyph name="download" />
        <span className="tip">Экспорт GeoJSON</span>
      </button>
    </div>
  );
}
