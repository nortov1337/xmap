# XMap

A browser-based map editor for drawing territories, fronts, arrows and annotations on top of live map basemaps. Everything runs client-side: no account, no backend, and the document is saved to `localStorage` as you work.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![React](https://img.shields.io/badge/React-19-blue) ![MapLibre](https://img.shields.io/badge/MapLibre_GL-5-green) ![Terra Draw](https://img.shields.io/badge/Terra_Draw-1-orange)

## Features

- **Five basemaps** — Light, Vivid, Dark (OpenFreeMap vector styles) plus Satellite and Hybrid (Esri imagery).
- **Drawing tools** — marker, text, line, area, rectangle and circle, each bound to a single key.
- **Direct manipulation** — drag, rotate and scale shapes; move vertices; add a vertex by clicking a line or polygon edge; drag text labels.
- **Selection** — click to select, `Shift`+drag for a marquee selection, right-click for a context menu.
- **Layers** — add, rename, reorder by drag and drop, toggle visibility, lock, and set opacity. Features can be moved between layers by dragging them in the panel.
- **Inspector** — edit title, description, color, fill opacity, stroke width, text size and rotation; live area, length and vertex count for the selected geometry.
- **Undo / redo** — 60-step history across every document change.
- **Import** — drop a `.geojson` or `.json` file anywhere on the page. Feature collections, single features, bare geometries and multi-geometries are accepted; `title`/`name`, `description`/`desc` and `color` properties are mapped onto the feature.
- **Export** — GeoJSON with feature metadata, or a PNG of the current viewport with the map title rendered in the header bar.
- **Appearance** — light, dark or system editor theme; independent toggles for basemap labels and POI/road signs.
- **Autosave** — the document, settings and floating toolbar position persist between sessions.
- **Responsive UI** — the layout switches to a compact toolbar with bottom sheets on phones and short screens.

## Tech stack

| Area | Library |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) |
| State | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| Map rendering | [MapLibre GL JS 5](https://maplibre.org/) |
| Drawing and editing | [Terra Draw](https://terradraw.io/) with the MapLibre adapter |
| Geometry math | [Turf.js 7](https://turfjs.org/) |

The map layer is loaded dynamically with `ssr: false`, so all editor code runs in the browser.

## Getting started

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build
npm start
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `V` | Select tool |
| `M` | Marker |
| `T` | Text |
| `L` | Line |
| `P` | Area |
| `R` | Rectangle |
| `O` | Circle |
| `Ctrl`/`Cmd` + `Z` | Undo |
| `Ctrl`/`Cmd` + `Shift` + `Z`, `Ctrl`/`Cmd` + `Y` | Redo |
| `Ctrl`/`Cmd` + `D` | Duplicate selection |
| `Delete` / `Backspace` | Delete selection |
| `Escape` | Deselect and return to the select tool |
| `Shift` + drag | Marquee selection (select tool) |

Shortcuts are ignored while typing in an input, textarea or select.

## Project structure

```text
app/
  layout.tsx            Root layout, metadata and viewport
  page.tsx              Dynamic import of the editor shell
  globals.css           Stylesheet entry point
  styles/               Base, panels, layers, inspector, floating UI, settings, mobile
components/
  EditorShell.tsx       Composes the editor and wires hooks together
  Toolbar.tsx           Draggable tool and action bar
  LayersPanel.tsx       Layer and feature lists
  Inspector.tsx         Feature, layer and multi-selection forms
  SettingsDialog.tsx    Theme, basemap and overlay settings
  ViewBar.tsx           Zoom controls
  MobileTools.tsx       Compact toolbar for small screens
  ContextMenu.tsx       Map and panel context menus
  Dropzone.tsx          GeoJSON drop overlay
  Glyph.tsx             Inline SVG icon set
  hooks/                Engine lifecycle, persistence, shortcuts, menus, media query
  layers/               Layer and feature rows, drag-reorder logic
  inspector/            Field controls and forms
  settings/             Settings controls
lib/
  engine.ts             MapEngine facade over MapLibre and Terra Draw
  engine/               Drawing, selection, overlays, clipboard, export, styling
  geo/                  Coordinate, measurement and GeoJSON import helpers
  store.ts              Document store, history and mutations
  doc.ts                Document schema creation and persistence
  settings.ts           Editor settings store and theme handling
  basemaps.ts           Basemap style definitions
  storage.ts            Safe localStorage access
  tools.ts              Tool definitions and key bindings
  features.ts           Feature kinds, palette and default styles
  format.ts             Area, length and coordinate formatting
  types.ts              Shared types
```

## Data model

A document (`lib/types.ts`) contains a title, basemap key, camera position, an ordered list of layers and a flat list of features. Each feature keeps a GeoJSON geometry, a layer reference, a kind, title, description, label and style values.

Persistence keys:

| Key | Contents |
| --- | --- |
| `xmap.doc.v3` | Map document, written 400 ms after the last change |
| `xmap.settings.v1` | Editor theme and overlay toggles |
| `xmap.toolbar-position` | Floating toolbar coordinates |

GeoJSON export writes all features as a `FeatureCollection`, with `kind`, `title`, `description`, `label`, `color` and layer name in `properties`. The PNG export captures the current viewport at the canvas resolution and overlays the document title.

## Attribution

Basemap tiles are provided by [OpenFreeMap](https://openfreemap.org/) and [Esri](https://www.arcgis.com/). Keep the on-map attribution visible when using the app publicly.

---

The responsive and mobile layout was designed and implemented entirely by AI.
