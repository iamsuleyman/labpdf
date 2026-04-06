# AGENTS.md

This file helps AI coding agents work safely and quickly in this repository.

## Project summary

This repo contains a browser-side PDF generator for laboratory reports. The main implementation is in `lib/labpdf.js`, and the demo harness is in `example/`.

The generator:

- builds a Labcorp-style PDF with `jsPDF`
- registers embedded PT Sans fonts from `lib/fonts.js`
- expects patient metadata separately from report data
- returns a previewable `blob:` URL instead of saving a file directly

## Repo map

- `lib/labpdf.js`: source of truth for layout, table rendering, headers, footers, and exported API
- `lib/fonts.js`: embedded font payloads; treat as generated/static asset
- `lib/logo.svg`: logo asset
- `example/index.html`: simplest end-to-end manual test
- `example/samples/data.json`: report payload example
- `example/samples/patient.json`: patient payload example
- `example/vendor/`: vendored browser libraries used by the demo
- `index.html`: minimal project landing page

## How the code is organized

Inside `lib/labpdf.js` the rough flow is:

1. Define patient defaults and style constants.
2. Normalize and derive report/patient data.
3. Draw repeated page chrome: header, date blocks, footer.
4. Convert `reportFormatAndValues` into printable rows.
5. Render result tables with `autoTable`.
6. Render the final details/disclaimer section.
7. Return `doc.output('bloburl')`.

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

- Prefer editing `lib/labpdf.js` when changing behavior.
- Do not hand-edit `lib/fonts.js` unless the task is specifically about replacing embedded fonts.
- Use `example/index.html` plus the sample JSON files for manual verification.
- Preserve browser compatibility; this repo is not structured as a Node build pipeline.
- Keep the existing exported globals working: `LabPdf.generatePDF`, `LabPdf.createLabReportPdf`, and `window.generatePDF`.

## Safe change patterns

Common tasks and where to implement them:

- Layout/styling tweak: `lib/labpdf.js`
- Header/footer/details content: `lib/labpdf.js`
- Sample-data update for repro/testing: `example/samples/*.json`
- Demo behavior change: `example/index.html`
- Human-facing repo overview: `README.md`

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
