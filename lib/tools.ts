import type { GlyphName } from "./icons";
import type { Tool } from "./types";

export type ToolEntry = {
  tool: Tool;
  icon: GlyphName;
  label: string;
  key: string;
};

export const TOOLS: ToolEntry[] = [
  { tool: "select", icon: "cursor", label: "Select", key: "V" },
  { tool: "marker", icon: "pin", label: "Marker", key: "M" },
  { tool: "text", icon: "text", label: "Text", key: "T" },
  { tool: "line", icon: "line", label: "Line", key: "L" },
  { tool: "polygon", icon: "polygon", label: "Area", key: "P" },
  { tool: "rectangle", icon: "square", label: "Rectangle", key: "R" },
  { tool: "circle", icon: "circle", label: "Circle", key: "O" },
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(
  TOOLS.map(({ key, tool }) => [`Key${key}`, tool]),
);
