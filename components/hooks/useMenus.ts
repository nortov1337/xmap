import { useCallback, useMemo, useState, type RefObject } from "react";
import type { MapEngine } from "@/lib/engine";
import { formatCoords } from "@/lib/format";
import { geometryCenter } from "@/lib/geo/coords";
import { useApp } from "@/lib/store";
import type { MapContextMenu } from "@/lib/types";
import type { ContextMenuItem } from "../ContextMenu";

export type PanelMenu = { kind: "layer" | "feature"; id: string; x: number; y: number };

export function useMenus(engineRef: RefObject<MapEngine | null>, notify: (message: string) => void) {
  const doc = useApp((s) => s.doc);
  const selectedIds = useApp((s) => s.selectedIds);
  const setSelection = useApp((s) => s.setSelection);
  const updateLayer = useApp((s) => s.updateLayer);
  const removeLayer = useApp((s) => s.removeLayer);
  const removeFeature = useApp((s) => s.removeFeature);
  const duplicateFeature = useApp((s) => s.duplicateFeature);

  const [menu, setMenu] = useState<MapContextMenu | null>(null);
  const [panelMenu, setPanelMenu] = useState<PanelMenu | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);
  const closePanelMenu = useCallback(() => setPanelMenu(null), []);

  const openMapMenu = useCallback((next: MapContextMenu) => {
    setPanelMenu(null);
    setMenu(next);
  }, []);

  const openLayerMenu = useCallback((id: string, x: number, y: number) => {
    setMenu(null);
    setPanelMenu({ kind: "layer", id, x, y });
  }, []);

  const openFeatureMenu = useCallback((id: string, x: number, y: number) => {
    setMenu(null);
    setPanelMenu({ kind: "feature", id, x, y });
  }, []);

  const copyText = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(
        () => notify("Copied"),
        () => notify(text),
      );
    },
    [notify],
  );

  const menuItems = useMemo<ContextMenuItem[]>(() => {
    if (!menu) return [];
    const engine = engineRef.current;
    if (!engine) return [];

    const copyCoords: ContextMenuItem = {
      label: "Copy coordinates",
      onSelect: () => copyText(formatCoords(menu.lng, menu.lat)),
    };

    if (menu.featureId) {
      return [
        { label: "Duplicate", onSelect: () => engine.duplicateSelection() },
        {
          label: "Copy",
          onSelect: () => {
            if (engine.copySelected()) notify("Feature copied");
          },
        },
        { ...copyCoords, separator: true },
        {
          label: "Delete",
          danger: true,
          separator: true,
          onSelect: () => engine.deleteSelection(),
        },
        { label: "Deselect", separator: true, onSelect: () => setSelection([]) },
      ];
    }

    return [
      copyCoords,
      {
        label: "Paste here",
        separator: true,
        disabled: !engine.hasClipboard(),
        onSelect: () => engine.pasteAt(menu.lng, menu.lat),
      },
      {
        label: "Marker here",
        separator: true,
        onSelect: () => engine.addAt("marker", menu.lng, menu.lat),
      },
      { label: "Text here", onSelect: () => engine.addAt("text", menu.lng, menu.lat) },
      { label: "Show all", separator: true, onSelect: () => engine.fitAll() },
    ];
  }, [menu, engineRef, copyText, notify, setSelection]);

  const panelMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!panelMenu) return [];

    if (panelMenu.kind === "layer") {
      const layer = doc.layers.find((item) => item.id === panelMenu.id);
      if (!layer) return [];
      return [
        {
          label: "Rename",
          onSelect: () => {
            const name = window.prompt("Layer name", layer.name);
            if (name) updateLayer(layer.id, { name });
          },
        },
        {
          label: layer.visible ? "Hide" : "Show",
          separator: true,
          onSelect: () => updateLayer(layer.id, { visible: !layer.visible }),
        },
        {
          label: layer.locked ? "Unlock" : "Lock",
          onSelect: () => updateLayer(layer.id, { locked: !layer.locked }),
        },
        {
          label: "Delete layer",
          danger: true,
          separator: true,
          disabled: doc.layers.length <= 1,
          onSelect: () => removeLayer(layer.id),
        },
      ];
    }

    const feature = doc.features.find((item) => item.id === panelMenu.id);
    if (!feature) return [];
    return [
      { label: "Duplicate", onSelect: () => duplicateFeature(feature.id) },
      {
        label: "Copy",
        onSelect: () => {
          if (engineRef.current?.copyFeature(feature.id)) notify("Feature copied");
        },
      },
      {
        label: "Copy coordinates",
        separator: true,
        onSelect: () => {
          const center = geometryCenter(feature.geom);
          copyText(formatCoords(center[0], center[1]));
        },
      },
      {
        label: "Delete",
        danger: true,
        separator: true,
        onSelect: () => {
          if (selectedIds.includes(feature.id)) engineRef.current?.deleteSelection();
          else removeFeature(feature.id);
        },
      },
    ];
  }, [
    panelMenu,
    engineRef,
    doc.layers,
    doc.features,
    selectedIds,
    updateLayer,
    removeLayer,
    duplicateFeature,
    removeFeature,
    copyText,
    notify,
  ]);

  return {
    menu,
    panelMenu,
    menuItems,
    panelMenuItems,
    openMapMenu,
    openLayerMenu,
    openFeatureMenu,
    closeMenu,
    closePanelMenu,
  };
}
