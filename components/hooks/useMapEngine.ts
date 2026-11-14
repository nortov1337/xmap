import { useEffect, type RefObject } from "react";
import { loadDoc } from "@/lib/doc";
import { MapEngine } from "@/lib/engine";
import { loadSettings, useSettings } from "@/lib/settings";
import { useApp } from "@/lib/store";
import type { MapContextMenu } from "@/lib/types";

export function useMapEngine(
  containerRef: RefObject<HTMLDivElement | null>,
  engineRef: RefObject<MapEngine | null>,
  onContextMenu: (menu: MapContextMenu) => void,
) {
  const doc = useApp((s) => s.doc);
  const loaded = useApp((s) => s.loaded);
  const tool = useApp((s) => s.tool);
  const selectedIds = useApp((s) => s.selectedIds);
  const activeLayerId = useApp((s) => s.activeLayerId);
  const overlays = useSettings((s) => s.settings.overlays);
  const settingsLoaded = useSettings((s) => s.loaded);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initial = loadDoc();
    const app = useApp.getState();
    app.hydrate(initial);
    useSettings.getState().hydrate(loadSettings(initial.basemap === "dark" ? "dark" : "light"));

    const engine = new MapEngine(container, initial, {
      onSelect: app.setSelection,
      onTool: app.setTool,
      onAdd: app.addFeature,
      onGeometry: (id, geom) => app.updateFeature(id, { geom }),
      onDelete: app.removeFeatures,
      onDuplicate: app.duplicateFeatures,
      onCamera: (camera) => app.patchDoc({ camera }),
      onContextMenu,
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [containerRef, onContextMenu]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.render(doc);
  }, [loaded, doc.features, doc.layers]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.setBasemap(doc.basemap);
  }, [loaded, doc.basemap]);

  useEffect(() => {
    if (!settingsLoaded) return;
    engineRef.current?.setMapOverlays(overlays);
  }, [settingsLoaded, overlays]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.setTool(tool);
  }, [loaded, tool]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.setSelection(selectedIds);
  }, [loaded, selectedIds]);

  useEffect(() => {
    engineRef.current?.setActiveLayer(activeLayerId);
  }, [activeLayerId]);
}
