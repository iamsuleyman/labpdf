# AGENTS.md

This file helps AI coding agents work safely and quickly in this repository.

## Project summary

This repo contains a browser-side PDF generator for laboratory reports. The main entry point is `lib/labpdf.js`, and the demo harness is in `example/`.

The generator:

- builds a Genex-style PDF with `jsPDF`
- registers embedded Source Sans 3 fonts from `lib/fonts.js`
- expects patient metadata separately from report data
- returns a previewable `blob:` URL instead of saving a file directly

## Repo map

- `lib/labpdf.js`: main entry point — orchestrates PDF generation, re-exports public API
- `lib/constants.js`: style constants (`S`), default data shapes (`DEFAULT_PATIENT`, etc.), `contentW`
- `lib/helpers.js`: pure utility functions — range checks, normalization, row building, report resolution
- `lib/resolve-options.js`: options parsing and legacy format support
- `lib/logo.js`: SVG-to-PNG logo loader with caching
- `lib/draw-header.js`: header, date bar, ordered items, date-collected rendering
- `lib/draw-footer.js`: footer rendering (page numbers, copyright, disclaimer)
- `lib/draw-details.js`: details/disclaimer section at end of report
- `lib/draw-table.js`: results table rendering via `autoTable`
- `lib/fonts.js`: embedded font payloads; treat as generated/static asset
- `lib/logo.svg`, `lib/logo-black.svg`: logo assets
- `example/index.html`: simplest end-to-end manual test
- `example/samples/data.json`: report payload example
- `example/samples/patient.json`: patient payload example
- `example/vendor/`: vendored browser libraries used by the demo
- `index.html`: minimal project landing page

## How the code is organized

The code is split into focused modules under `lib/`:

1. **constants.js** — default shapes and style tokens.
2. **helpers.js** — pure functions: `isOutOfRange`, `flagDirection`, `refInterval`, `buildRows`, `resolveReports`, etc.
3. **resolve-options.js** — merges `options.patient` / `options.doctor` / `options.specimen` with defaults, supports legacy flat format.
4. **logo.js** — converts SVG URLs to PNG data URLs via canvas (cached).
5. **draw-header.js** — `drawHeader`, `drawDateBar`, `drawOrderedItems`, `drawDateCollectedRight`.
6. **draw-footer.js** — `drawFooter`.
7. **draw-details.js** — `drawDetailsSection`.
8. **draw-table.js** — `drawResultTable` (builds `autoTable` body and all cell hooks).
9. **labpdf.js** — orchestrator: creates the jsPDF document, calls draw functions in order, returns blob URL.

All draw functions receive `patient`, `doctor`, `specimen` as explicit parameters (no module-level mutable state).

## Data contract

The main entrypoint is:

```js
LabPdf.generatePDF(data, options = {})
```

Rules:

- `options.patient` or `options.user` must exist
- `options.patient.name` is required
- `data.reportDetails` is optional; if present, each item is treated as a separate report section
- each report section should expose `reportFormatAndValues`
- rows without a `reportFormat`, with `descriptionFlag === 1`, or with empty `value` / `'-'` are skipped

Reference-range highlighting depends on:

- `patient.sex`
- `reportFormat.lowerBoundMale` / `upperBoundMale`
- `reportFormat.lowerBoundFemale` / `upperBoundFemale`
- `item.highlight`

## Working agreements for agents

- **Layout/styling**: edit the relevant `draw-*.js` file.
- **Data helpers / range logic**: edit `helpers.js`.
- **Options parsing / legacy compat**: edit `resolve-options.js`.
- **Style tokens / defaults**: edit `constants.js`.
- **Orchestration flow**: edit `labpdf.js`.
- Do not hand-edit `lib/fonts.js` unless the task is specifically about replacing embedded fonts.
- Use `example/index.html` plus the sample JSON files for manual verification.
- Preserve browser compatibility; this repo is not structured as a Node build pipeline.
- Keep the existing exported globals working: `LabPdf.generatePDF`, `LabPdf.createLabReportPdf`, and `window.generatePDF`.

## Verification

Preferred quick check:

1. Start a static file server from the repo root.
2. Open `example/index.html`.
3. Confirm the iframe renders a PDF preview without console/runtime errors.
4. Check header, ordered items, tables, and footer across multiple pages if the sample spans them.

## Known constraints

- `generatePDF` currently assumes `window.jspdf` exists.
- Output is a blob URL, not a saved file path.
- Some footer/details strings are hardcoded and not fully data-driven.
- Visual fidelity is tuned directly in code with numeric layout constants.
