"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import type { MapEngine } from "@/lib/engine";
import { ContextMenu } from "./ContextMenu";
import { Dropzone } from "./Dropzone";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { MobileTools } from "./MobileTools";
import { SettingsDialog } from "./SettingsDialog";
import { Toolbar } from "./Toolbar";
import { ViewBar } from "./ViewBar";
import { useDocPersistence } from "./hooks/useDocPersistence";
import { useGeoFileDrop } from "./hooks/useGeoFileDrop";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMapEngine } from "./hooks/useMapEngine";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useMenus } from "./hooks/useMenus";
import { useSettingsSync } from "./hooks/useSettingsSync";
import { useToast } from "./hooks/useToast";

type MobilePanel = "layers" | "inspector" | null;

const MOBILE_QUERY = "(max-width: 760px), (max-height: 560px)";

export default function EditorShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const doc = useApp((s) => s.doc);
  const tool = useApp((s) => s.tool);
  const selectedIds = useApp((s) => s.selectedIds);
  const activeLayerId = useApp((s) => s.activeLayerId);
  const canUndo = useApp((s) => s.past.length > 0);
  const canRedo = useApp((s) => s.future.length > 0);
  const {
    patchDoc,
    undo,
    redo,
    setTool,
    setSelection,
    setActiveLayer,
    addLayer,
    updateLayer,
    removeLayer,
    reorderLayers,
    reorderFeatures,
    moveFeatureToLayer,
    updateFeature,
  } = useApp.getState();

  const mobile = useMediaQuery(MOBILE_QUERY);
  const { toast, notify } = useToast();
  const {
    menu,
    panelMenu,
    menuItems,
    panelMenuItems,
    openMapMenu,
    openLayerMenu,
    openFeatureMenu,
    closeMenu,
    closePanelMenu,
  } = useMenus(engineRef, notify);

  useMapEngine(containerRef, engineRef, openMapMenu);
  useDocPersistence();
  useSettingsSync();
  useKeyboardShortcuts(engineRef, settingsOpen);
  const dragging = useGeoFileDrop({ engineRef, notify });

  useEffect(() => {
    if (!mobile) setMobilePanel(null);
  }, [mobile]);

  useEffect(() => {
    if (mobile && selectedIds.length) setMobilePanel("inspector");
  }, [mobile, selectedIds]);

  const selected = useMemo(
    () =>
      selectedIds.length === 1
        ? (doc.features.find((feature) => feature.id === selectedIds[0]) ?? null)
        : null,
    [doc.features, selectedIds],
  );

  const activeLayer = useMemo(
    () => doc.layers.find((layer) => layer.id === activeLayerId) ?? null,
    [doc.layers, activeLayerId],
  );

  const featureCount = activeLayer
    ? doc.features.filter((feature) => feature.layerId === activeLayer.id).length
    : 0;

  const zoomBy = useCallback((delta: number) => engineRef.current?.zoomBy(delta), []);
  const closeMobilePanel = useCallback(() => setMobilePanel(null), []);
  const closeInspector = useCallback(() => {
    setSelection([]);
    setMobilePanel(null);
  }, [setSelection]);

  const handleSelectFeature = (id: string) => {
    setSelection([id]);
    const feature = doc.features.find((item) => item.id === id);
    if (feature) setActiveLayer(feature.layerId);
  };

  const toggleMobilePanel = (panel: "layers" | "inspector") =>
    setMobilePanel((current) => (current === panel ? null : panel));

  return (
    <>
      <div id="map" ref={containerRef} />

      {mobile && mobilePanel === "layers" && (
        <div className="sheet-scrim" onClick={closeMobilePanel} />
      )}

      {mobile && (
        <MobileTools panel={mobilePanel} onToggle={toggleMobilePanel} onZoom={zoomBy} />
      )}

      <LayersPanel
        title={doc.title}
        onTitle={(title) => patchDoc({ title })}
        layers={doc.layers}
        features={doc.features}
        activeLayerId={activeLayerId}
        selectedIds={selectedIds}
        open={mobilePanel === "layers"}
        onClose={closeMobilePanel}
        onSelectLayer={(id) => {
          setActiveLayer(id);
          setSelection([]);
          if (mobile) setMobilePanel("inspector");
        }}
        onAddLayer={() => addLayer()}
        onUpdateLayer={updateLayer}
        onSelectFeature={handleSelectFeature}
        onReorderLayers={reorderLayers}
        onReorderFeatures={reorderFeatures}
        onMoveFeatureToLayer={moveFeatureToLayer}
        onLayerContextMenu={openLayerMenu}
        onFeatureContextMenu={openFeatureMenu}
      />

      <Toolbar
        tool={tool}
        onTool={(next) => {
          setTool(next);
          if (mobile) setMobilePanel(null);
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        hasSelection={selectedIds.length > 0}
        onDelete={() => engineRef.current?.deleteSelection()}
        onDuplicate={() => engineRef.current?.duplicateSelection()}
        onExportPng={() => engineRef.current?.exportPng()}
        onExportGeoJson={() => engineRef.current?.exportGeoJson()}
        onSettings={() => {
          setMobilePanel(null);
          setSettingsOpen(true);
        }}
      />

      <Inspector
        feature={selected}
        layer={activeLayer}
        layers={doc.layers}
        featureCount={featureCount}
        selectionCount={selectedIds.length}
        open={mobilePanel === "inspector"}
        onUpdateFeature={updateFeature}
        onUpdateLayer={updateLayer}
        onDelete={() => engineRef.current?.deleteSelection()}
        onDuplicate={() => engineRef.current?.duplicateSelection()}
        onClose={closeInspector}
        onRemoveLayer={(id) => removeLayer(id)}
      />

      <ViewBar onZoom={zoomBy} />

      {toast && <div className="toast">{toast}</div>}

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}

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

      {dragging && <Dropzone />}
    </>
  );
}
