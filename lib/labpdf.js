/**
 * LabPdf — browser-side lab report PDF generator (jsPDF + jspdf-autotable).
 *
 * Usage:
 *   const url = await LabPdf.generatePDF(resultsData, options);
 *
 * @param {Object} resultsData — lab results object from API.
 *   Must contain `reportFormatAndValues[]` array (flat or nested via `reportDetails[]`).
 *   Each item: { highlight, value, reportFormat: { testName, testUnit, lowerBound*, upperBound*, descriptionFlag, ... } }
 *
 * @param {Object} options
 * @param {Object} options.patient — patient info
 *   @param {string} options.patient.name        — full name (required)
 *   @param {string} options.patient.patientId   — patient ID
 *   @param {string} options.patient.specimenId  — specimen ID
 *   @param {string} options.patient.dob         — date of birth
 *   @param {string|number} options.patient.age  — age
 *   @param {string} options.patient.sex         — sex (Male/Female/Мужской/Женский)
 *   @param {string} options.patient.address     — address
 *   @param {string} options.patient.phone       — phone number
 *
 * @param {Object} options.doctor — ordering physician info
 *   @param {string} options.doctor.name           — physician name
 *   @param {string} options.doctor.accountNumber  — account number
 *   @param {string} options.doctor.address        — clinic address
 *   @param {string} options.doctor.phone          — phone number
 *   @param {string} options.doctor.npi            — NPI number
 *
 * @param {Object} options.specimen — specimen/collection info
 *   @param {string} options.specimen.controlId      — control ID
 *   @param {string} options.specimen.dateCollected   — collection date
 *   @param {string} options.specimen.dateReceived    — received date
 *   @param {string} options.specimen.dateReported    — report date
 *   @param {string} options.specimen.fasting         — fasting status (Yes/No/Да/Нет)
 *
 * @param {string} [options.logoUrl]      — path to header logo SVG
 * @param {string} [options.logoBlackUrl] — path to footer logo SVG (black variant)
 *
 * @returns {Promise<string>} blob URL of the generated PDF
 *
 * Legacy support: a flat `options.patient` with doctor/specimen fields
 * (orderingPhysician, physicianName, dateCollected, etc.) is also accepted.
 */

import { SOURCESANS3_REGULAR, SOURCESANS3_BOLD } from './fonts.js';
import { S, DEFAULT_PATIENT, DEFAULT_DOCTOR } from './constants.js';
import { resolveReports, getReportTestName, getReportItems, buildRows, resolveSpecimenFromReport } from './helpers.js';
import { resolveOptions } from './resolve-options.js';
import { drawLogo } from './logo.js';
import { drawHeader, drawDateBar, drawOrderedItems, drawDateCollectedRight } from './draw-header.js';
import { drawFooter } from './draw-footer.js';
import { drawDetailsSection } from './draw-details.js';
import { drawResultTable } from './draw-table.js';

// ─── Main: generatePDF ──────────────────────────────────────────────

async function generatePDF(data, options = {}) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    throw new Error('jsPDF is not loaded. Include jspdf.umd.min.js before importing lib/labpdf.js.');
  }

  const { patient, doctor } = resolveOptions(options);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  if (typeof doc.autoTable !== 'function') {
    throw new Error('jspdf-autotable is not loaded. Include jspdf.plugin.autotable.min.js before importing lib/labpdf.js.');
  }

  // Register Source Sans 3 (Cyrillic support)
  doc.addFileToVFS('SourceSans3-Regular.ttf', SOURCESANS3_REGULAR);
  doc.addFont('SourceSans3-Regular.ttf', 'SourceSans3', 'normal');
  doc.addFileToVFS('SourceSans3-Bold.ttf', SOURCESANS3_BOLD);
  doc.addFont('SourceSans3-Bold.ttf', 'SourceSans3', 'bold');

  const logoUrl = new URL('./logo.svg', import.meta.url).href;
  const logoBlackUrl = new URL('./logo-black.svg', import.meta.url).href;

  const sex = patient.sex;
  const reports = resolveReports(data);
  const orderedItemsText = reports.map(getReportTestName).join('; ');

  // Group reports by sampleId
  const sampleGroups = new Map();
  for (const report of reports) {
    const sid = report.sampleId || '';
    if (!sampleGroups.has(sid)) sampleGroups.set(sid, []);
    sampleGroups.get(sid).push(report);
  }

  // ─── Page 1 setup ───────────────────────────────────────────────
  const firstReport = reports[0] || {};
  patient.specimenId = firstReport.sampleId || '';
  let specimen = resolveSpecimenFromReport(firstReport);

  let currentY = drawHeader(doc, patient, doctor);
  currentY = drawDateBar(doc, currentY, specimen);
  currentY = drawOrderedItems(doc, currentY, orderedItemsText || data.testName || '');
  currentY = drawDateCollectedRight(doc, currentY, specimen);

  let isFirstGroup = true;
  for (const [sampleId, groupReports] of sampleGroups) {
    patient.specimenId = sampleId || '';
    specimen = resolveSpecimenFromReport(groupReports[0]);

    if (!isFirstGroup) {
      doc.addPage();
      currentY = drawHeader(doc, patient, doctor);
      currentY = drawDateBar(doc, currentY, specimen);
      currentY = drawOrderedItems(doc, currentY, groupReports.map(getReportTestName).join('; '));
      currentY = drawDateCollectedRight(doc, currentY, specimen);
    }
    isFirstGroup = false;

    for (const report of groupReports) {
      const rows = buildRows(getReportItems(report), sex);
      if (!rows.length) continue;

      if (currentY > S.page.h - 85) {
        doc.addPage();
        currentY = drawHeader(doc, patient, doctor);
        currentY = drawDateCollectedRight(doc, currentY, specimen);
      }

      doc.setFont(S.font, 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...S.colors.black);
      doc.text(getReportTestName(report), S.margin.l, currentY + 4);
      currentY += 6.2;

      currentY = drawResultTable(doc, currentY, rows, patient, doctor, specimen);
    }
  }

  // Draw details section
  drawDetailsSection(doc, currentY, patient, doctor, specimen);

  // Footers (sync)
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  // Draw logos on all pages (async, via svg2pdf)
  const logoH = 9.2;
  const logoW = logoH * (1840.5 / 677.6);
  const logoX = S.page.w - S.margin.r - logoW;
  const fLogoH = 4.5;
  const fLogoW = fLogoH * (1840.5 / 677.6);
  const footerY = S.page.h - S.margin.b;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    await drawLogo(doc, logoUrl, logoX, S.margin.t, logoW, logoH);
    await drawLogo(doc, logoBlackUrl, S.margin.l, footerY + 1, fLogoW, fLogoH);
  }

  // Return blob URL for preview
  return doc.output('bloburl');
}

export { generatePDF, generatePDF as createLabReportPdf };
export { DEFAULT_PATIENT, DEFAULT_DOCTOR };
