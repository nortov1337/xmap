import { create } from "zustand";
import { readStored, writeStored } from "./storage";
import type { MapOverlays, ThemeKey } from "./types";

export type AppSettings = {
  theme: ThemeKey;
  overlays: MapOverlays;
};

export const THEMES: Record<ThemeKey, { label: string; description: string }> = {
  light: { label: "Light", description: "Always light appearance" },
  dark: { label: "Dark", description: "Always dark appearance" },
  system: { label: "System", description: "Follows the operating system" },
};

const KEY = "xmap.settings.v1";

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  overlays: { labels: true, signs: true },
};

export function loadSettings(fallbackTheme: ThemeKey): AppSettings {
  const parsed = readStored(KEY) as Partial<AppSettings> | null;
  if (parsed?.theme && parsed.theme in THEMES) {
    return {
      ...DEFAULT_SETTINGS,
      theme: parsed.theme,
      overlays: { ...DEFAULT_SETTINGS.overlays, ...parsed.overlays },
    };
  }
  return { ...DEFAULT_SETTINGS, theme: fallbackTheme };
}

export function saveSettings(settings: AppSettings) {
  writeStored(KEY, settings);
}

export function resolveTheme(theme: ThemeKey): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemeKey) {
  document.documentElement.dataset.theme = resolveTheme(theme);
}

type SettingsState = {
  settings: AppSettings;
  loaded: boolean;
  hydrate: (settings: AppSettings) => void;
  setTheme: (theme: ThemeKey) => void;
  setOverlays: (patch: Partial<MapOverlays>) => void;
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  hydrate: (settings) => set({ settings, loaded: true }),
  setTheme: (theme) => set({ settings: { ...get().settings, theme } }),
  setOverlays: (patch) =>
    set({
      settings: {
        ...get().settings,
        overlays: { ...get().settings.overlays, ...patch },
      },
    }),
}));
