# Lab PDF

Browser-only JavaScript library for generating lab-result PDFs with `jsPDF` and `jspdf-autotable`.

## Quick start

```html
<!-- 1. Load dependencies -->
<script src="jspdf.umd.min.js"></script>
<script src="jspdf.plugin.autotable.min.js"></script>

<!-- 2. Import the library (ES module) -->
<script type="module">
  import { generatePDF } from './lib/labpdf.js';

  const url = await generatePDF(reportData, {
    patient:  { name: 'Ivanov, Ivan', sex: 'Male', dob: '01/15/1990', age: 36 },
    doctor:   { name: 'Dr. Petrov', accountNumber: '12345' },
    specimen: { dateCollected: '04/01/2026', dateReceived: '04/01/2026', dateReported: '04/02/2026' },
  });

  document.getElementById('preview').src = url;
</script>
```

## How to pass variables

The library accepts two arguments: `generatePDF(data, options)`.

### `data` — lab results

Either a single report object or an object with a `reportDetails` array. Each report should contain:

| Field | Description |
|---|---|
| `reportDetails[]` | Array of report sections (optional; if absent the whole object is one report) |
| `reportDetails[].testName` or `Test Name` | Name displayed as section header |
| `reportDetails[].sampleId` | Groups reports by sample; used as specimen ID in the header |
| `reportDetails[]."Sample Date"` | Collection date (ISO 8601) |
| `reportDetails[]."Accession Date"` | Received date (ISO 8601) |
| `reportDetails[]."Report Date"` | Report date (ISO 8601) |
| `reportDetails[].reportFormatAndValues[]` | Array of result rows |

Each item in `reportFormatAndValues`:

| Field | Description |
|---|---|
| `value` | The test result value |
| `highlight` | `1` to force out-of-range styling |
| `reportFormat.testName` | Name of the individual test |
| `reportFormat.testUnit` | Unit of measurement |
| `reportFormat.lowerBoundMale` / `upperBoundMale` | Male reference range |
| `reportFormat.lowerBoundFemale` / `upperBoundFemale` | Female reference range |
| `reportFormat.otherMale` / `otherFemale` | Alternative range text |
| `reportFormat.descriptionFlag` | `1` to skip this row |

### `options` — metadata and settings

#### `options.patient` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **yes** | Full patient name. Library throws if missing. |
| `patientId` | string | no | Patient ID |
| `dob` | string | no | Date of birth |
| `age` | string/number | no | Age |
| `sex` | string | no | Sex — accepts `Male`, `Female`, `M`, `F`, `Мужской`, `Женский`, etc. |
| `phone` | string | no | Patient phone |

#### `options.doctor` (optional)

| Field | Type | Description |
|---|---|---|
| `name` | string | Ordering physician name |
| `accountNumber` | string | Account number |
| `phone` | string | Phone number |

### Legacy format

For backward compatibility, you can pass doctor and specimen fields directly inside `options.patient`:

```js
await generatePDF(data, {
  patient: {
    name: 'Ivanov, Ivan',
    orderingPhysician: 'Dr. Petrov',   // → doctor.name
    accountNumber: '12345',            // → doctor.accountNumber
    dateCollected: '04/01/2026',       // → specimen.dateCollected
    dateReceived: '04/01/2026',        // → specimen.dateReceived
    // ...
  }
});
```

## Public API

```js
import { generatePDF, createLabReportPdf } from './lib/labpdf.js';
```

- `generatePDF(data, options)` — returns a `Promise<string>` (`blob:` URL)
- `createLabReportPdf(data, options)` — alias for `generatePDF`
- `DEFAULT_PATIENT`, `DEFAULT_DOCTOR` — default shape objects

When loaded via `<script>`, the library is also available as:

```js
window.LabPdf.generatePDF(data, options)
window.generatePDF(data, options)
```

## File structure

```
lib/
  labpdf.js          — main entry point and orchestrator
  constants.js       — style constants, default data shapes
  helpers.js         — utility functions (range checks, normalization, row building)
  resolve-options.js — options parsing and legacy format support
  logo.js            — SVG-to-PNG logo loader with caching
  draw-header.js     — header, date bar, ordered items rendering
  draw-footer.js     — footer rendering
  draw-details.js    — details/disclaimer section rendering
  draw-table.js      — results table rendering (autoTable config)
  fonts.js           — embedded Source Sans 3 font data (generated)
  logo.svg           — color logo asset
  logo-black.svg     — black logo asset
example/
  index.html         — demo page
  samples/           — sample JSON payloads
  vendor/            — vendored browser dependencies
```

## Local usage

Serve the repo as static files, then open the demo page:

```bash
python3 -m http.server
```

Open `http://localhost:8000/example/index.html`. The demo fetches sample JSON, generates a PDF, and shows it inside an iframe.

## Notes

- This project is browser-first. `lib/labpdf.js` references `window.jspdf`.
- `lib/fonts.js` is a generated asset. Avoid manual edits unless replacing font data.
- The top-level `index.html` is only a landing page; the real testing surface is `example/index.html`.
