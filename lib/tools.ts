import type { GlyphName } from "./icons";
import type { Tool } from "./types";

export type ToolEntry = {
  tool: Tool;
  icon: GlyphName;
  label: string;
  key: string;
};

export const TOOLS: ToolEntry[] = [
  { tool: "select", icon: "cursor", label: "Выбрать", key: "V" },
  { tool: "marker", icon: "pin", label: "Метка", key: "M" },
  { tool: "text", icon: "text", label: "Текст", key: "T" },
  { tool: "line", icon: "line", label: "Линия", key: "L" },
  { tool: "polygon", icon: "polygon", label: "Область", key: "P" },
  { tool: "rectangle", icon: "square", label: "Прямоугольник", key: "R" },
  { tool: "circle", icon: "circle", label: "Круг", key: "O" },
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(
  TOOLS.map(({ key, tool }) => [`Key${key}`, tool]),
);
