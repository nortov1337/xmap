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
        () => notify("Скопировано"),
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
      label: "Скопировать координаты",
      onSelect: () => copyText(formatCoords(menu.lng, menu.lat)),
    };

    if (menu.featureId) {
      return [
        { label: "Дублировать", onSelect: () => engine.duplicateSelection() },
        {
          label: "Копировать",
          onSelect: () => {
            if (engine.copySelected()) notify("Объект скопирован");
          },
        },
        { ...copyCoords, separator: true },
        {
          label: "Удалить",
          danger: true,
          separator: true,
          onSelect: () => engine.deleteSelection(),
        },
        { label: "Снять выделение", separator: true, onSelect: () => setSelection([]) },
      ];
    }

    return [
      copyCoords,
      {
        label: "Вставить здесь",
        separator: true,
        disabled: !engine.hasClipboard(),
        onSelect: () => engine.pasteAt(menu.lng, menu.lat),
      },
      {
        label: "Метка здесь",
        separator: true,
        onSelect: () => engine.addAt("marker", menu.lng, menu.lat),
      },
      { label: "Текст здесь", onSelect: () => engine.addAt("text", menu.lng, menu.lat) },
      { label: "Показать всё", separator: true, onSelect: () => engine.fitAll() },
    ];
  }, [menu, engineRef, copyText, notify, setSelection]);

  const panelMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!panelMenu) return [];

    if (panelMenu.kind === "layer") {
      const layer = doc.layers.find((item) => item.id === panelMenu.id);
      if (!layer) return [];
      return [
        {
          label: "Переименовать",
          onSelect: () => {
            const name = window.prompt("Название слоя", layer.name);
            if (name) updateLayer(layer.id, { name });
          },
        },
        {
          label: layer.visible ? "Скрыть" : "Показать",
          separator: true,
          onSelect: () => updateLayer(layer.id, { visible: !layer.visible }),
        },
        {
          label: layer.locked ? "Разблокировать" : "Заблокировать",
          onSelect: () => updateLayer(layer.id, { locked: !layer.locked }),
        },
        {
          label: "Удалить слой",
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
      { label: "Дублировать", onSelect: () => duplicateFeature(feature.id) },
      {
        label: "Копировать",
        onSelect: () => {
          if (engineRef.current?.copyFeature(feature.id)) notify("Объект скопирован");
        },
      },
      {
        label: "Скопировать координаты",
        separator: true,
        onSelect: () => {
          const center = geometryCenter(feature.geom);
          copyText(formatCoords(center[0], center[1]));
        },
      },
      {
        label: "Удалить",
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
