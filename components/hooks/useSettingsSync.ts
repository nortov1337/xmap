import { useEffect } from "react";
import { applyTheme, saveSettings, useSettings } from "@/lib/settings";

export function useSettingsSync() {
  const loaded = useSettings((s) => s.loaded);
  const settings = useSettings((s) => s.settings);

  useEffect(() => {
    if (!loaded) return;
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [loaded, settings.theme]);

  useEffect(() => {
    if (!loaded) return;
    saveSettings(settings);
  }, [loaded, settings]);
}
