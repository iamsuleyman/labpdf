/* global jspdf */

// ─── Hardcoded patient data (placeholder) ───────────────────────────
const PATIENT = {
  name: 'Radjabov, Artur U',
  patientId: '',
  specimenId: '177-436-3930-0',
  dob: '10/10/1965',
  age: 58,
  sex: 'Male',
  accountNumber: '37010330',
  orderingPhysician: 'S CHEKOV',
  dateCollected: '06/25/2024',
  dateReceived: '06/25/2024',
  dateReported: '06/26/2024',
  fasting: 'Yes',
  address: '54 BOWMAN DR, FSTRVL TRVOSE, PA, 19053',
  phone: '267-597-5141',
  physicianName: 'Sergei Chekov MD PC',
  physicianAddress: '9892 Bustleton Ave Suite 103, Philadelphia, PA, 19115',
  physicianPhone: '215-897-9090',
  physicianNPI: '1265470306',
  controlId: '10548963843',
};

// ─── Style constants (matching labcorp.pdf) ─────────────────────────
const S = {
  // page in mm (letter)
  page: { w: 215.9, h: 279.4 },
  margin: { l: 7.5, r: 7.5, t: 7.5, b: 19.5 },
  colors: {
    black: [0, 0, 0],
    gray: [90, 90, 90],
    muted: [110, 110, 110],
    lightGrayBg: [249, 249, 249],
    resultBg: [237, 244, 248],
    tableHeaderBg: [255, 255, 255],
    rowBorder: [156, 156, 156],
    sectionRule: [140, 140, 140],
    orange: [239, 140, 32],
    red: [194, 40, 40],
    blue: [0, 114, 206],
    cyan: [45, 196, 226],
  },
  font: 'PTSans',
};

const contentW = S.page.w - S.margin.l - S.margin.r;

// ─── Helpers ────────────────────────────────────────────────────────

function isOutOfRange(item, sex) {
  if (item.highlight === 1) return true;
  const rf = item.reportFormat;
  const val = parseFloat(item.value);
  if (isNaN(val)) return false;
  const lo = parseFloat(sex === 'Female' ? rf.lowerBoundFemale : rf.lowerBoundMale);
  const hi = parseFloat(sex === 'Female' ? rf.upperBoundFemale : rf.upperBoundMale);
  if (isNaN(lo) || isNaN(hi)) return false;
  return val < lo || val > hi;
}

function flagDirection(item, sex) {
  const rf = item.reportFormat;
  const val = parseFloat(item.value);
  if (isNaN(val)) return '';
  const lo = parseFloat(sex === 'Female' ? rf.lowerBoundFemale : rf.lowerBoundMale);
  const hi = parseFloat(sex === 'Female' ? rf.upperBoundFemale : rf.upperBoundMale);
  if (!isNaN(lo) && val < lo) return 'Low';
  if (!isNaN(hi) && val > hi) return 'High';
  return '';
}

function refInterval(rf, sex) {
  if (sex === 'Female') {
    if (rf.otherFemale && rf.otherFemale !== '-') return rf.otherFemale;
    const lo = rf.lowerBoundFemale;
    const hi = rf.upperBoundFemale;
    if (lo && lo !== '-' && hi && hi !== '-') return lo + '-' + hi;
  }
  if (rf.otherMale && rf.otherMale !== '-') return rf.otherMale;
  const lo = rf.lowerBoundMale;
  const hi = rf.upperBoundMale;
  if (lo && lo !== '-' && hi && hi !== '-') return lo + '-' + hi;
  return '';
}

function joinNonEmpty(parts, separator) {
  return parts.filter(Boolean).join(separator);
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function buildRowNote(item) {
  const rf = item.reportFormat;
  const noteParts = [];

  const alternateRange = PATIENT.sex === 'Female' ? rf.otherFemale : rf.otherMale;
  const normalizedRange = normalizeText(alternateRange);
  if (normalizedRange && normalizedRange !== '-' && normalizedRange.includes('\n')) {
    noteParts.push(normalizedRange);
  }

  return joinNonEmpty(noteParts, '\n');
}

function getPreviousResult(item) {
  return normalizeText(
    item.previousResult ||
    item.prevResult ||
    item.previousValue ||
    item.reportFormat?.previousResult ||
    item.reportFormat?.previousValue ||
    ''
  );
}

function getPreviousDate(item) {
  return normalizeText(
    item.previousDate ||
    item.prevDate ||
    item.previousResultDate ||
    item.reportFormat?.previousDate ||
    item.reportFormat?.previousResultDate ||
    ''
  );
}

function resolveReports(data) {
  if (Array.isArray(data.reportDetails) && data.reportDetails.length) {
    return data.reportDetails;
  }

  return [data];
}

function getReportTestName(report) {
  return report['Test Name'] || report.testName || 'Lab Result';
}

function getReportItems(report) {
  return Array.isArray(report.reportFormatAndValues) ? report.reportFormatAndValues : [];
}

function buildRows(items, sex) {
  const rows = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const rf = it.reportFormat;
    if (!rf) continue;
    if (rf.descriptionFlag === 1) continue;
    if (it.value === '-' || it.value === '') continue;

    rows.push({
      testName: rf.testName,
      value: it.value,
      flag: flagDirection(it, sex),
      previousResult: getPreviousResult(it),
      previousDate: getPreviousDate(it),
      unit: rf.testUnit && rf.testUnit !== '-' ? rf.testUnit : '',
      refInterval: refInterval(rf, sex),
      outOfRange: isOutOfRange(it, sex),
      note: buildRowNote(it),
    });
  }

  return rows;
}

// ─── Draw header (every page) ───────────────────────────────────────
function drawHeader(doc) {
  const y0 = S.margin.t;

  // Patient name
  doc.setFont(S.font, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...S.colors.black);
  doc.text(PATIENT.name, S.margin.l, y0 + 3.8);

  // Patient details (left)
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.muted);
  doc.text('Patient ID:', S.margin.l, y0 + 7.8);
  doc.text('Specimen ID: ' + PATIENT.specimenId, S.margin.l, y0 + 11.1);

  // DOB / Age / Sex (center-left)
  const cx = 63;
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.muted);
  doc.text('DOB:', cx, y0 + 3.8);
  doc.setFont(S.font, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...S.colors.black);
  doc.text(PATIENT.dob, cx + 8.5, y0 + 3.8);

  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.muted);
  doc.text('Age: ' + PATIENT.age, cx, y0 + 7.7);
  doc.text('Sex: ' + PATIENT.sex, cx, y0 + 11);

  // "Patient Report" title
  const tx = 110;
  doc.setFont(S.font, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...S.colors.black);
  doc.text('Patient Report', tx, y0 + 3.8);

  // Account / Physician
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.muted);
  doc.text('Account Number: ' + PATIENT.accountNumber, tx, y0 + 7.8);
  doc.text('Ordering Physician: ' + PATIENT.orderingPhysician, tx, y0 + 11.1);

  // labcorp logo mark
  const logoX = S.page.w - S.margin.r - 26.5;
  const logoY = y0 + 3.3;
  doc.setFillColor(...S.colors.cyan);
  doc.circle(logoX, logoY, 4.4, 'F');
  doc.setFillColor(...S.colors.blue);
  doc.circle(logoX + 1.2, logoY, 3.2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(logoX + 0.1, logoY, 2.2, 'F');

  // labcorp logo text
  doc.setFont(S.font, 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...S.colors.black);
  doc.text('labcorp', logoX + 6.2, y0 + 4.5);

  // separator line
  const lineY = y0 + 13.8;
  doc.setDrawColor(...S.colors.sectionRule);
  doc.setLineWidth(0.18);
  doc.line(S.margin.l, lineY, S.page.w - S.margin.r, lineY);

  return lineY + 1.2;
}

// ─── Draw date bar ──────────────────────────────────────────────────
function drawDateBar(doc, y) {
  doc.setFontSize(5.9);
  const items = [
    ['Date Collected: ', PATIENT.dateCollected],
    ['Date Received: ', PATIENT.dateReceived],
    ['Date Reported: ', PATIENT.dateReported],
    ['Fasting: ', PATIENT.fasting],
  ];
  let x = S.margin.l;
  const ty = y + 3.7;
  items.forEach(([label, val]) => {
    doc.setFont(S.font, 'bold');
    doc.setTextColor(...S.colors.muted);
    doc.text(label, x, ty);
    const lw = doc.getTextWidth(label);
    doc.setFont(S.font, 'bold');
    doc.setTextColor(...S.colors.black);
    doc.text(val, x + lw, ty);
    x += lw + doc.getTextWidth(val) + 18;
  });

  // bottom border
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.18);
  doc.line(S.margin.l, y + 5.4, S.page.w - S.margin.r, y + 5.4);

  return y + 7.8;
}

// ─── Draw ordered items block ───────────────────────────────────────
function drawOrderedItems(doc, y, testName) {
  doc.setFontSize(6.1);
  doc.setFont(S.font, 'normal');
  doc.setTextColor(...S.colors.black);

  const label = 'Ordered Items: ';
  const orderedText = testName || '-';
  doc.text(label, S.margin.l, y + 3.5);
  const lw = doc.getTextWidth(label);
  doc.setFont(S.font, 'bold');

  // Wrap the long text
  const maxW = contentW - lw;
  const lines = doc.splitTextToSize(orderedText, maxW);
  // First line next to label
  doc.text(lines[0], S.margin.l + lw, y + 3.5);
  // Remaining lines below, indented same as first
  for (let i = 1; i < lines.length; i++) {
    doc.text(lines[i], S.margin.l, y + 3.5 + i * 3.05);
  }

  const blockH = 3.8 + lines.length * 3.05 + 1.8;
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.18);
  doc.line(S.margin.l, y + blockH, S.page.w - S.margin.r, y + blockH);
  return y + blockH;
}

// ─── Draw "Date Collected" right-aligned ────────────────────────────
function drawDateCollectedRight(doc, y) {
  doc.setFontSize(5.4);
  doc.setFont(S.font, 'normal');
  doc.setTextColor(...S.colors.muted);
  const label = 'Date Collected: ';
  const val = PATIENT.dateCollected;
  doc.setFont(S.font, 'bold');
  const vw = doc.getTextWidth(val);
  doc.text(val, S.page.w - S.margin.r - vw, y + 3.2);
  doc.setFont(S.font, 'normal');
  doc.text(label, S.page.w - S.margin.r - vw - doc.getTextWidth(label), y + 3.2);
  return y + 5.5;
}

// ─── Draw footer (every page) ───────────────────────────────────────
function drawFooter(doc, pageNum, totalPages) {
  const y = S.page.h - S.margin.b;

  // separator
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.18);
  doc.line(S.margin.l, y, S.page.w - S.margin.r, y);

  // labcorp
  doc.setFont(S.font, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...S.colors.black);
  doc.text('labcorp', S.margin.l, y + 4.8);

  // center text
  doc.setFont(S.font, 'normal');
  doc.setFontSize(4.9);
  const center = 'Date Created and Stored  06/26/24 0612 ET';
  doc.text(center, S.page.w / 2 - 6, y + 4.8);
  doc.setFont(S.font, 'bold');
  doc.text('Final Report', S.page.w / 2 + 26, y + 4.8);
  doc.setFont(S.font, 'normal');
  doc.text('Page ' + pageNum + ' of ' + totalPages, S.page.w - S.margin.r, y + 4.8, { align: 'right' });

  // bottom left
  doc.setFontSize(4.1);
  doc.setTextColor(...S.colors.gray);
  doc.text('\u00A92024 Laboratory Corporation of America\u00AE Holdings', S.margin.l, y + 8.3);
  doc.text('All Rights Reserved - Enterprise Report Version 2.00', S.margin.l, y + 11);

  // bottom right
  doc.setFontSize(4.1);
  const rText1 = 'This document contains private and confidential health information protected by state and federal law.';
  const rText2 = 'If you have received this document in error please call 800-631-5250';
  doc.text(rText1, S.page.w - S.margin.r, y + 8.3, { align: 'right' });
  doc.text(rText2, S.page.w - S.margin.r, y + 11, { align: 'right' });
}

// ─── Draw details section (last page) ───────────────────────────────
function drawDetailsSection(doc, y) {
  if (y > S.page.h - 100) {
    doc.addPage();
    y = drawHeader(doc);
  }

  // Disclaimer
  doc.setFont(S.font, 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...S.colors.black);
  doc.text('Disclaimer', S.margin.l, y + 3.4);
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.1);
  const disclaimer = 'The Previous Result is listed for the most recent test performed by Labcorp in the past 5 years where there is sufficient patient demographic data to match the result to the patient. Results from certain tests are excluded from the Previous Result display.';
  const dLines = doc.splitTextToSize(disclaimer, contentW);
  doc.text(dLines, S.margin.l, y + 6.4);
  y += 6.4 + dLines.length * 2.25 + 1.6;

  // Icon Legend
  doc.setFont(S.font, 'bold');
  doc.setFontSize(6.6);
  doc.text('Icon Legend', S.margin.l, y);
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.2);
  y += 3.7;
  doc.setTextColor(...S.colors.orange);
  doc.text('\u25B2', S.margin.l, y);
  doc.setTextColor(...S.colors.black);
  doc.text('Out of Reference Range', S.margin.l + 2.5, y);
  doc.setTextColor(...S.colors.red);
  doc.rect(S.margin.l + 36.5, y - 1.2, 2.1, 2.1, 'F');
  doc.setTextColor(...S.colors.black);
  doc.text('Critical or Alert', S.margin.l + 40, y);
  y += 4.8;

  // Performing Labs
  doc.setFont(S.font, 'bold');
  doc.setFontSize(6.6);
  doc.text('Performing Labs', S.margin.l, y);
  y += 3.7;
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.1);
  doc.text('01: RN - Labcorp Raritan, 69 First Avenue, Raritan, NJ 08869-1800 Dir: Liza Jodry, MD', S.margin.l, y);
  y += 2.5;
  doc.text('For Inquiries, the physician may contact Branch: 800-631-5250 Lab: 800-631-5250', S.margin.l, y);
  y += 6.2;

  // 3-column details
  const colW = contentW / 3;
  const col1 = S.margin.l;
  const col2 = S.margin.l + colW;
  const col3 = S.margin.l + colW * 2;

  // separator
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.18);
  doc.line(S.margin.l, y, S.page.w - S.margin.r, y);
  y += 4;

  doc.setFontSize(5.2);
  doc.setTextColor(...S.colors.muted);
  doc.text('Patient Details', col1, y);
  doc.text('Physician Details', col2, y);
  doc.text('Specimen Details', col3, y);
  y += 3.4;

  doc.setTextColor(...S.colors.black);
  doc.setFont(S.font, 'bold');
  doc.setFontSize(5.7);
  doc.text(PATIENT.name, col1, y);
  doc.text('S CHEKOV', col2, y);
  y += 2.8;
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.1);
  doc.text(PATIENT.address, col1, y);
  doc.text(PATIENT.physicianName, col2, y);
  doc.setFont(S.font, 'bold');
  doc.text('Specimen ID: ' + PATIENT.specimenId, col3, y);
  y += 2.8;
  doc.setFont(S.font, 'normal');
  doc.text('', col1, y);
  doc.text(doc.splitTextToSize(PATIENT.physicianAddress, colW - 2), col2, y);
  doc.setFont(S.font, 'bold');
  doc.text('Control ID: ' + PATIENT.controlId, col3, y);
  y += 2.8;
  doc.setFont(S.font, 'normal');
  doc.text('Phone: ' + PATIENT.phone, col1, y);
  doc.text('', col2, y);
  y += 2.8;
  doc.text('Date of Birth: ' + PATIENT.dob, col1, y);
  doc.text('Phone: ' + PATIENT.physicianPhone, col2, y);
  doc.text('Date Collected: ' + PATIENT.dateCollected + ' Local', col3, y);
  y += 2.8;
  doc.text('Age: ' + PATIENT.age, col1, y);
  doc.text('Account Number: ' + PATIENT.accountNumber, col2, y);
  doc.text('Date Received: ' + PATIENT.dateReceived + ' 0000 ET', col3, y);
  y += 2.8;
  doc.text('Sex: ' + PATIENT.sex, col1, y);
  doc.text('NPI: ' + PATIENT.physicianNPI, col2, y);
  doc.text('Date Reported: ' + PATIENT.dateReported + ' 0607 ET', col3, y);
}

// ─── Main: generatePDF ──────────────────────────────────────────────
function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  // Register PT Sans (Cyrillic support)
  doc.addFileToVFS('PTSans-Regular.ttf', PTSANS_REGULAR);
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal');
  doc.addFileToVFS('PTSans-Bold.ttf', PTSANS_BOLD);
  doc.addFont('PTSans-Bold.ttf', 'PTSans', 'bold');

  const sex = PATIENT.sex;
  const reports = resolveReports(data);
  const orderedItemsText = reports.map(getReportTestName).join('; ');

  // ─── Page 1 setup ───────────────────────────────────────────────
  let currentY = drawHeader(doc);
  currentY = drawDateBar(doc, currentY);
  currentY = drawOrderedItems(doc, currentY, orderedItemsText || data.testName || '');
  currentY = drawDateCollectedRight(doc, currentY);

  for (const report of reports) {
    const rows = buildRows(getReportItems(report), sex);
    if (!rows.length) continue;

    if (currentY > S.page.h - 85) {
      doc.addPage();
      currentY = drawHeader(doc);
      currentY = drawDateCollectedRight(doc, currentY);
    }

    doc.setFont(S.font, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...S.colors.black);
    doc.text(getReportTestName(report), S.margin.l, currentY + 4);
    currentY += 6.2;

    const tableBody = [];
    const tableRowRefs = [];
    rows.forEach(r => {
      const flagText = r.flag ? r.value + '    ' + r.flag : r.value;
      const previousText = joinNonEmpty([r.previousResult, r.previousDate], '      ');
      tableBody.push([
        { content: r.testName, styles: {} },
        { content: flagText, styles: {} },
        { content: previousText, styles: {} },
        { content: r.unit },
        { content: r.refInterval },
      ]);
      tableRowRefs.push({ type: 'result', row: r });

      if (r.note) {
        tableBody.push([
          {
            content: 'Please Note:',
            styles: {
              fontStyle: 'normal',
              fontSize: 5.4,
              textColor: S.colors.black,
            },
          },
          {
            content: r.note,
            colSpan: 4,
            styles: {
              fontSize: 5.1,
              textColor: S.colors.black,
              cellPadding: { top: 1.1, bottom: 1.5, left: 2, right: 2 },
            },
          },
        ]);
        tableRowRefs.push({ type: 'note', row: r });
      }
    });

    doc.autoTable({
      startY: currentY,
      head: [['Test', 'Current Result and Flag', 'Previous Result and Date', 'Units', 'Reference Interval']],
      body: tableBody,
      theme: 'plain',
      styles: {
        font: 'PTSans',
        fontSize: 5.9,
        cellPadding: { top: 1.15, bottom: 1.15, left: 1.8, right: 1.8 },
        textColor: S.colors.black,
        lineWidth: 0,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: S.colors.tableHeaderBg,
        fontStyle: 'normal',
        fontSize: 4.9,
        textColor: S.colors.black,
        cellPadding: { top: 1.1, bottom: 1.3, left: 1.8, right: 1.8 },
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 46 },
        2: { cellWidth: 50 },
        3: { cellWidth: 18 },
        4: { cellWidth: contentW - 50 - 46 - 50 - 18 },
      },
      margin: { left: S.margin.l, right: S.margin.r, top: 28, bottom: S.margin.b + 4 },
      didDrawPage: function (hookData) {
        if (hookData.pageNumber > 1) {
          drawHeader(doc);
          drawDateCollectedRight(doc, 15.6);
        }
      },
      didParseCell: function (hookData) {
        if (hookData.section === 'head') {
          hookData.cell.styles.lineWidth = { bottom: 0.18 };
          hookData.cell.styles.lineColor = S.colors.rowBorder;
        }

        if (hookData.section !== 'body') return;

        const rowRef = tableRowRefs[hookData.row.index];
        const isNoteRow = rowRef && rowRef.type === 'note';

        if (isNoteRow) {
          hookData.cell.styles.textColor = S.colors.black;
          hookData.cell.styles.fontStyle = 'normal';
          if (hookData.column.index === 1) {
            hookData.cell.styles.fillColor = S.colors.resultBg;
          } else {
            hookData.cell.styles.fillColor = [255, 255, 255];
          }
          return;
        }

        if (hookData.column.index === 1) {
          hookData.cell.styles.fillColor = S.colors.resultBg;
          hookData.cell.styles.fontStyle = 'bold';
        }

        if (hookData.column.index === 0) {
          hookData.cell.styles.fontStyle = 'bold';
          if (rowRef && rowRef.type === 'result' && rowRef.row.outOfRange) {
            hookData.cell.styles.cellPadding = { top: 1.15, bottom: 1.15, left: 7, right: 1.8 };
          }
        }
      },
      willDrawCell: function (hookData) {
        if (hookData.section === 'body') {
          const { x, y, width, height } = hookData.cell;
          doc.setDrawColor(...S.colors.rowBorder);
          doc.setLineWidth(0.18);
          doc.line(x, y + height, x + width, y + height);
        }
      },
      didDrawCell: function (hookData) {
        if (hookData.section !== 'body') return;
        const rowRef = tableRowRefs[hookData.row.index];
        if (!rowRef || rowRef.type !== 'result') return;
        if (!rowRef.row.outOfRange || hookData.column.index !== 0) return;

        const arrowX = hookData.cell.x + 1.6;
        const arrowY = hookData.cell.y + hookData.cell.height / 2 + 0.1;
        doc.setTextColor(...S.colors.orange);
        doc.setFont(S.font, 'bold');
        doc.setFontSize(8);
        doc.text(rowRef.row.flag === 'Low' ? '\u25BC' : '\u25B2', arrowX, arrowY, { baseline: 'middle' });
        doc.setTextColor(...S.colors.black);
      },
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  const finalY = currentY;

  // Draw details section
  drawDetailsSection(doc, finalY);

  // Now add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  // Return blob URL for preview
  return doc.output('bloburl');
}
