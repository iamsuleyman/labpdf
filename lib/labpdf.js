/**
 * LabPdf — browser-side lab report PDF generator (jsPDF + jspdf-autotable + svg2pdf).
 *
 * Usage:
 *   const url = await LabPdf.generatePDF(resultsData, options);
 *
 * @param {Object} resultsData — lab results from API.
 *   Flat object or { reportDetails[] } with nested reports.
 *   Each report: { sampleId, "Test Name", "Sample Date", "Accession Date", "Report Date", reportFormatAndValues[] }
 *   Each result item: { highlight, value, reportFormat: { testName, testUnit, lowerBound*, upperBound*, descriptionFlag } }
 *
 * @param {Object} options
 * @param {Object} options.patient — patient info (required)
 *   @param {string} options.patient.name      — full name (required)
 *   @param {string} options.patient.patientId — patient ID
 *   @param {string} options.patient.dob       — date of birth (age calculated if age omitted)
 *   @param {string|number} options.patient.age
 *   @param {string} options.patient.sex       — Male/Female/M/F/Мужской/Женский/etc.
 *   @param {string} options.patient.phone
 *
 * @param {Object} options.doctor — ordering physician (optional)
 *   @param {string} options.doctor.name
 *   @param {string} options.doctor.accountNumber
 *   @param {string} options.doctor.phone
 *
 * @returns {Promise<string>} blob URL of the generated PDF
 */

import { SOURCESANS3_REGULAR, SOURCESANS3_BOLD } from './fonts.js';
import { S, LOGO, DEFAULT_PATIENT, DEFAULT_DOCTOR } from './constants.js';
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
  const logoW = LOGO.header.h * LOGO.header.aspect;
  const fLogoW = LOGO.footer.h * LOGO.footer.aspect;
  const logoX = S.page.w - S.margin.r - logoW;
  const footerY = S.page.h - S.margin.b;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    await drawLogo(doc, logoUrl, logoX, S.margin.t, logoW, LOGO.header.h);
    await drawLogo(doc, logoBlackUrl, S.margin.l, footerY + 1, fLogoW, LOGO.footer.h);
  }

  // Return blob URL for preview
  return doc.output('bloburl');
}

export { generatePDF, generatePDF as createLabReportPdf };
export { DEFAULT_PATIENT, DEFAULT_DOCTOR };
