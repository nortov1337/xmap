"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASEMAPS, TOOL_KEYS } from "@/lib/config";
import { loadDoc, saveDoc } from "@/lib/doc";
import { MapEngine } from "@/lib/engine";
import { featuresFromGeoJson, geometryCenter } from "@/lib/geo";
import { useApp } from "@/lib/store";
import type { BasemapKey, Camera, MapContextMenu, MapFeature } from "@/lib/types";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { Glyph } from "./Glyph";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { Toolbar } from "./Toolbar";

type PanelMenu = { kind: "layer" | "feature"; id: string; x: number; y: number };

function formatCoords(lng: number, lat: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export default function EditorShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const lngRef = useRef<HTMLElement>(null);
  const latRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menu, setMenu] = useState<MapContextMenu | null>(null);
  const [panelMenu, setPanelMenu] = useState<PanelMenu | null>(null);
  const [dragging, setDragging] = useState(false);

  const doc = useApp((s) => s.doc);
  const loaded = useApp((s) => s.loaded);
  const tool = useApp((s) => s.tool);
  const selectedId = useApp((s) => s.selectedId);
  const activeLayerId = useApp((s) => s.activeLayerId);
  const canUndo = useApp((s) => s.past.length > 0);
  const canRedo = useApp((s) => s.future.length > 0);
  const toast = useApp((s) => s.toast);

  const hydrate = useApp((s) => s.hydrate);
  const patchDoc = useApp((s) => s.patchDoc);
  const undo = useApp((s) => s.undo);
  const redo = useApp((s) => s.redo);
  const setTool = useApp((s) => s.setTool);
  const setSelected = useApp((s) => s.setSelected);
  const setActiveLayer = useApp((s) => s.setActiveLayer);
  const showToast = useApp((s) => s.showToast);
  const addFeature = useApp((s) => s.addFeature);
  const updateFeature = useApp((s) => s.updateFeature);
  const removeFeature = useApp((s) => s.removeFeature);
  const duplicateFeature = useApp((s) => s.duplicateFeature);
  const addLayer = useApp((s) => s.addLayer);
  const updateLayer = useApp((s) => s.updateLayer);
  const removeLayer = useApp((s) => s.removeLayer);
  const reorderLayers = useApp((s) => s.reorderLayers);
  const reorderFeatures = useApp((s) => s.reorderFeatures);
  const moveFeatureToLayer = useApp((s) => s.moveFeatureToLayer);

  const notify = useCallback(
    (message: string) => {
      showToast(message);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => showToast(null), 2200);
    },
    [showToast],
  );

  const copyText = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(
        () => notify("Скопировано"),
        () => notify(text),
      );
    },
    [notify],
  );

  const closeMenu = useCallback(() => setMenu(null), []);
  const closePanelMenu = useCallback(() => setPanelMenu(null), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initial = loadDoc();
    hydrate(initial);

    const engine = new MapEngine(container, initial, {
      onSelect: setSelected,
      onTool: setTool,
      onAdd: addFeature,
      onGeometry: (id, geom) => updateFeature(id, { geom }),
      onDelete: removeFeature,
      onDuplicate: duplicateFeature,
      onCamera: (camera: Camera) => patchDoc({ camera }),
      onCoords: (lng, lat) => {
        if (lngRef.current) lngRef.current.textContent = lng.toFixed(4);
        if (latRef.current) latRef.current.textContent = lat.toFixed(4);
      },
      onToast: notify,
      onContextMenu: (next) => {
        setPanelMenu(null);
        setMenu(next);
      },
    });

    engineRef.current = engine;
    (window as unknown as { __xmap?: MapEngine }).__xmap = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.render(doc);
  }, [loaded, doc.features, doc.layers]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.setBasemap(doc.basemap);
  }, [loaded, doc.basemap]);

  useEffect(() => {
    document.documentElement.dataset.theme = doc.basemap === "dark" ? "dark" : "light";
  }, [doc.basemap]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.setTool(tool);
  }, [loaded, tool]);

  useEffect(() => {
    if (!loaded) return;
    engineRef.current?.select(selectedId);
  }, [loaded, selectedId]);

  useEffect(() => {
    engineRef.current?.setActiveLayer(activeLayerId);
  }, [activeLayerId]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => saveDoc(doc), 400);
    return () => clearTimeout(timer);
  }, [loaded, doc]);

  useEffect(() => {
    let depth = 0;

    const carriesFiles = (event: DragEvent) =>
      event.dataTransfer?.types.includes("Files") ?? false;

    const importFiles = async (files: File[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const { activeLayerId, doc: current, addFeatures } = useApp.getState();
      const layerId = activeLayerId || current.layers[0]?.id || "";
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
  }, [notify]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const engine = engineRef.current;
      if (!engine) return;

      const modifier = event.metaKey || event.ctrlKey;
      const code = event.code;

      if (modifier && code === "KeyZ") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && code === "KeyY") {
        event.preventDefault();
        redo();
        return;
      }
      if (modifier && code === "KeyD") {
        event.preventDefault();
        engine.duplicateSelected();
        return;
      }
      if (code === "Delete" || code === "Backspace") {
        event.preventDefault();
        engine.deleteSelected();
        return;
      }
      if (code === "Escape") {
        setSelected(null);
        setTool("select");
        return;
      }
      if (modifier || event.altKey) return;

      const nextTool = TOOL_KEYS[code];
      if (nextTool) {
        event.preventDefault();
        setTool(nextTool);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => doc.features.find((feature) => feature.id === selectedId) ?? null,
    [doc.features, selectedId],
  );

  const activeLayer = useMemo(
    () => doc.layers.find((layer) => layer.id === activeLayerId) ?? null,
    [doc.layers, activeLayerId],
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
        { label: "Дублировать", onSelect: () => engine.duplicateSelected() },
        {
          label: "Копировать",
          onSelect: () => {
            if (engine.copySelected()) notify("Объект скопирован");
          },
        },
        { ...copyCoords, separator: true },
        { label: "Удалить", danger: true, separator: true, onSelect: () => engine.deleteSelected() },
        { label: "Снять выделение", separator: true, onSelect: () => setSelected(null) },
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
  }, [menu, copyText, notify, setSelected]);

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
          if (selectedId === feature.id) engineRef.current?.deleteSelected();
          else removeFeature(feature.id);
        },
      },
    ];
  }, [
    panelMenu,
    doc.layers,
    doc.features,
    selectedId,
    updateLayer,
    removeLayer,
    duplicateFeature,
    removeFeature,
    copyText,
    notify,
  ]);

  const handleSelectFeature = (id: string) => {
    setSelected(id);
    const feature = doc.features.find((item) => item.id === id);
    if (feature) setActiveLayer(feature.layerId);
  };

  const featureCount = activeLayer
    ? doc.features.filter((feature) => feature.layerId === activeLayer.id).length
    : 0;

  return (
    <>
      <div id="map" ref={containerRef} />

      <LayersPanel
        title={doc.title}
        onTitle={(title) => patchDoc({ title })}
        layers={doc.layers}
        features={doc.features}
        activeLayerId={activeLayerId}
        selectedId={selectedId}
        onSelectLayer={(id) => {
          setActiveLayer(id);
          setSelected(null);
        }}
        onAddLayer={() => addLayer()}
        onToggleVisible={(id) => {
          const layer = doc.layers.find((item) => item.id === id);
          if (layer) updateLayer(id, { visible: !layer.visible });
        }}
        onToggleLock={(id) => {
          const layer = doc.layers.find((item) => item.id === id);
          if (layer) updateLayer(id, { locked: !layer.locked });
        }}
        onRenameLayer={(id, name) => updateLayer(id, { name })}
        onSelectFeature={handleSelectFeature}
        onReorderLayers={reorderLayers}
        onReorderFeatures={reorderFeatures}
        onMoveFeatureToLayer={moveFeatureToLayer}
        onLayerContextMenu={(id, x, y) => {
          setMenu(null);
          setPanelMenu({ kind: "layer", id, x, y });
        }}
        onFeatureContextMenu={(id, x, y) => {
          setMenu(null);
          setPanelMenu({ kind: "feature", id, x, y });
        }}
      />

      <Toolbar
        tool={tool}
        onTool={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        hasSelection={Boolean(selectedId)}
        onDelete={() => engineRef.current?.deleteSelected()}
        onDuplicate={() => engineRef.current?.duplicateSelected()}
        onExportPng={() => engineRef.current?.exportPng()}
        onExportGeoJson={() => engineRef.current?.exportGeoJson()}
      />

      <Inspector
        feature={selected}
        layer={activeLayer}
        layers={doc.layers}
        featureCount={featureCount}
        onUpdateFeature={(id, patch) => updateFeature(id, patch as never)}
        onUpdateLayer={updateLayer}
        onDelete={() => engineRef.current?.deleteSelected()}
        onDuplicate={() => engineRef.current?.duplicateSelected()}
        onClose={() => setSelected(null)}
        onRemoveLayer={(id) => removeLayer(id)}
      />

      <div className="panel coords">
        <span>
          Lng <b ref={lngRef}>—</b>
        </span>
        <span>
          Lat <b ref={latRef}>—</b>
        </span>
      </div>

      <div className="panel viewbar">
        <button className="tb" onClick={() => engineRef.current?.zoomBy(1)} title="Приблизить">
          <Glyph name="plus" size={16} />
        </button>
        <button className="tb" onClick={() => engineRef.current?.zoomBy(-1)} title="Отдалить">
          <Glyph name="minus" size={16} />
        </button>
      </div>

      <div className="panel basemaps">
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
          <button
            key={key}
            className={`chip ${doc.basemap === key ? "on" : ""}`}
            onClick={() => patchDoc({ basemap: key })}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}

      {menu && (
        <ContextMenu
          x={menu.clientX}
          y={menu.clientY}
          items={menuItems}
          onClose={closeMenu}
        />
      )}

      {panelMenu && (
        <ContextMenu
          x={panelMenu.x}
          y={panelMenu.y}
          items={panelMenuItems}
          onClose={closePanelMenu}
        />
      )}

      {dragging && (
        <div className="dropzone">
          <div className="dropzone-card">
            <Glyph name="download" size={22} />
            <b>Отпусти, чтобы добавить на карту</b>
            <span>GeoJSON · .geojson, .json</span>
          </div>
        </div>
      )}
    </>
  );
}
