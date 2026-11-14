"use client";

import { BASEMAPS } from "@/lib/basemaps";
import { THEMES, useSettings } from "@/lib/settings";
import { useApp } from "@/lib/store";
import type { BasemapKey, ThemeKey } from "@/lib/types";
import { ChoiceCard, ToggleRow } from "./controls";

function OverlaySection() {
  const overlays = useSettings((s) => s.settings.overlays);
  const setOverlays = useSettings((s) => s.setOverlays);

  return (
    <div className="settings-section">
      <h3>Надписи и знаки</h3>
      <p className="settings-hint">Слои поверх подложки: названия, иконки и указатели.</p>
      <div className="settings-toggles">
        <ToggleRow
          label="Подписи"
          description="Названия городов, улиц, водоёмов и границ"
          checked={overlays.labels}
          onChange={(labels) => setOverlays({ labels })}
        />
        <ToggleRow
          label="Знаки"
          description="Иконки POI и дорожные указатели в подробной теме карты"
          checked={overlays.signs}
          onChange={(signs) => setOverlays({ signs })}
        />
      </div>
    </div>
  );
}

export function AppearanceSection() {
  const theme = useSettings((s) => s.settings.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const basemap = useApp((s) => s.doc.basemap);
  const patchDoc = useApp((s) => s.patchDoc);

  return (
    <>
      <div className="settings-section">
        <h3>Тема оформления</h3>
        <p className="settings-hint">Применяется к панелям, меню и подсказкам редактора.</p>
        <div className="settings-grid">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
            <ChoiceCard
              key={key}
              label={THEMES[key].label}
              description={THEMES[key].description}
              preview={`theme-${key}`}
              active={theme === key}
              onSelect={() => setTheme(key)}
            />
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Тема карты</h3>
        <p className="settings-hint">Подложка, на которой отображаются объекты.</p>
        <div className="settings-grid">
          {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
            <ChoiceCard
              key={key}
              label={BASEMAPS[key].label}
              description={BASEMAPS[key].description}
              preview={`map-${key}`}
              active={basemap === key}
              onSelect={() => patchDoc({ basemap: key })}
            />
          ))}
        </div>
      </div>

      <OverlaySection />
    </>
  );
}
