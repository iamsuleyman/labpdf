# Lab PDF

Browser-only JavaScript library for generating lab-result PDFs with `jsPDF` and `jspdf-autotable`.

## What lives here

- `lib/labpdf.js`: main PDF generation logic
- `lib/fonts.js`: embedded PT Sans font data used by the PDF renderer
- `example/index.html`: local demo page for previewing generated PDFs
- `example/samples/data.json`: sample lab report payload
- `example/samples/patient.json`: sample patient metadata passed through `options.patient`
- `example/vendor/`: bundled browser dependencies for the demo

## Public API

The library exposes:

```js
window.LabPdf.generatePDF(data, { patient })
```

It also supports:

```js
window.LabPdf.createLabReportPdf(data, { patient })
window.generatePDF(data, { patient })
```

`generatePDF(...)` returns a `blob:` URL from `doc.output('bloburl')`, which is suitable for previewing in an `<iframe>`.

## Expected inputs

`data` can be either:

- a single report object
- an object with `reportDetails`, where each item is rendered as a report section

Important report fields:

- `Test Name` or `testName`
- `reportFormatAndValues`
- `reportFormatAndValues[].value`
- `reportFormatAndValues[].reportFormat`

Important patient fields:

- `name` is required
- `sex` affects reference-range evaluation
- `dateCollected`, `dateReceived`, `dateReported`, `orderingPhysician`, `specimenId`, and related fields are rendered in the header/details sections

If `options.patient.name` is missing, the library throws.

## Local usage

Serve the repo as static files, then open the demo page:

```bash
python3 -m http.server
```

Open:

- `http://localhost:8000/example/index.html`

The demo fetches sample JSON, generates a PDF, and shows it inside an iframe.

## Notes

- This project is browser-first. `lib/labpdf.js` references `window.jspdf`.
- `lib/fonts.js` is generated/bundled asset content. Avoid manual edits unless you are intentionally replacing font data.
- The top-level `index.html` is only a landing page; the real testing surface is `example/index.html`.
