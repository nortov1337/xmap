"use client";

import { useEffect } from "react";
import { Glyph } from "./Glyph";
import { AppearanceSection } from "./settings/AppearanceSection";

type Props = {
  onClose: () => void;
};

export function SettingsDialog({ onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className="panel settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Glyph name="close" size={16} />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-content">
            <AppearanceSection />
          </div>
        </div>
      </div>
    </div>
  );
}
