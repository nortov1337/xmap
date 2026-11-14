"use client";

import type { ReactNode } from "react";
import { PALETTE } from "@/lib/features";

type FieldProps = {
  label: ReactNode;
  children: ReactNode;
};

type RangeFieldProps = {
  label: ReactNode;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
};

export function Field({ label, children }: FieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function RangeField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: RangeFieldProps) {
  return (
    <Field label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

export function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="swatches">
      {PALETTE.map((color) => (
        <button
          key={color}
          className={`swatch ${value.toLowerCase() === color ? "on" : ""}`}
          style={{ background: color }}
          onClick={() => onChange(color)}
          aria-label={color}
        />
      ))}
    </div>
  );
}
