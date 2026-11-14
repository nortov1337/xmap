"use client";

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

type ChoiceCardProps = {
  label: string;
  description: string;
  preview: string;
  active: boolean;
  onSelect: () => void;
};

export function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="toggle-row">
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        <span className="toggle-desc">{description}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="toggle-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle" aria-hidden />
    </label>
  );
}

export function ChoiceCard({ label, description, preview, active, onSelect }: ChoiceCardProps) {
  return (
    <button className={`choice-card ${active ? "on" : ""}`} onClick={onSelect}>
      <span className={`choice-preview ${preview}`} />
      <span className="choice-name">{label}</span>
      <span className="choice-desc">{description}</span>
    </button>
  );
}
