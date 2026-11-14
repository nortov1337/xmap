import { useEffect, useState, type RefObject } from "react";
import type { MapEngine } from "@/lib/engine";
import { featuresFromGeoJson } from "@/lib/geo/import";
import { useApp } from "@/lib/store";
import type { MapFeature } from "@/lib/types";

type DropDeps = {
  engineRef: RefObject<MapEngine | null>;
  notify: (message: string) => void;
};

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

export function useGeoFileDrop({ engineRef, notify }: DropDeps): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let depth = 0;

    const importFiles = async (files: File[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const { activeLayerId, doc, addFeatures } = useApp.getState();
      const layerId = activeLayerId || doc.layers[0]?.id || "";
      const geoFiles = files.filter((file) => /\.(geojson|json)$/i.test(file.name));
      const imported: MapFeature[] = [];

      for (const file of geoFiles) {
        try {
          const parsed = JSON.parse(await file.text());
          imported.push(...featuresFromGeoJson(parsed, layerId));
        } catch {
          notify(`${file.name}: не удалось прочитать`);
        }
      }

      if (!imported.length) return;
      addFeatures(imported);
      engine.fitTo(imported);
      notify(`Добавлено объектов: ${imported.length}`);
    };

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth += 1;
      setDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) void importFiles(files);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [engineRef, notify]);

  return dragging;
}
