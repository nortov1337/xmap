import { useEffect, type RefObject } from "react";
import type { MapEngine } from "@/lib/engine";
import { useApp } from "@/lib/store";
import { TOOL_KEYS } from "@/lib/tools";

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

export function useKeyboardShortcuts(
  engineRef: RefObject<MapEngine | null>,
  settingsOpen: boolean,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (settingsOpen || isTypingTarget(event.target)) return;

      const engine = engineRef.current;
      if (!engine) return;

      const modifier = event.metaKey || event.ctrlKey;
      const code = event.code;

      if (modifier && code === "KeyZ") {
        event.preventDefault();
        if (event.shiftKey) useApp.getState().redo();
        else useApp.getState().undo();
        return;
      }
      if (modifier && code === "KeyY") {
        event.preventDefault();
        useApp.getState().redo();
        return;
      }
      if (modifier && code === "KeyD") {
        event.preventDefault();
        engine.duplicateSelection();
        return;
      }
      if (code === "Delete" || code === "Backspace") {
        event.preventDefault();
        engine.deleteSelection();
        return;
      }
      if (code === "Escape") {
        useApp.getState().setSelection([]);
        useApp.getState().setTool("select");
        return;
      }
      if (modifier || event.altKey) return;

      const nextTool = TOOL_KEYS[code];
      if (nextTool) {
        event.preventDefault();
        useApp.getState().setTool(nextTool);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engineRef, settingsOpen]);
}
