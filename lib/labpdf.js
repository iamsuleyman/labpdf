import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SOURCESANS3_REGULAR, SOURCESANS3_BOLD } from './fonts.js';

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

const DEFAULT_PATIENT = {
  name: '',
  patientId: '',
  specimenId: '',
  dob: '',
  age: '',
  sex: '',
  address: '',
  phone: '',
};

const DEFAULT_DOCTOR = {
  name: '',
  accountNumber: '',
  address: '',
  phone: '',
  npi: '',
};

const DEFAULT_SPECIMEN = {
  controlId: '',
  dateCollected: '',
  dateReceived: '',
  dateReported: '',
  fasting: '',
};

let PATIENT = { ...DEFAULT_PATIENT };
let DOCTOR = { ...DEFAULT_DOCTOR };
let SPECIMEN = { ...DEFAULT_SPECIMEN };

// ─── Style constants (matching genex style) ─────────────────────────
const S = {
  // page in mm (letter)
  page: { w: 210, h: 297 },
  margin: { l: 7.5, r: 7.5, t: 7.5, b: 19.5 },
  colors: {
    black: [0, 0, 0],
    gray: [90, 90, 90],
    muted: [110, 110, 110],
    lightGrayBg: [249, 249, 249],
    resultBg: [235, 247, 255],
    tableHeaderBg: [255, 255, 255],
    rowBorder: [156, 156, 156],
    sectionRule: [140, 140, 140],
    orange: [239, 140, 32],
    red: [194, 40, 40],
    blue: [0, 114, 206],
    cyan: [45, 196, 226],
    genexBlue: [8, 25, 153],
    genexOrange: [255, 66, 0],
  },
  font: 'SourceSans3',
};

const contentW = S.page.w - S.margin.l - S.margin.r;

// ─── Logo loader ───────────────────────────────────────────────────
const _logoCache = {};

function loadLogoPng(svgUrl) {
  if (_logoCache[svgUrl]) return Promise.resolve(_logoCache[svgUrl]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      _logoCache[svgUrl] = canvas.toDataURL('image/png');
      resolve(_logoCache[svgUrl]);
    };
    img.onerror = reject;
    img.src = svgUrl;
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

function isOutOfRange(item, sex) {
  if (item.highlight === 1) return true;
  const rf = item.reportFormat;
  const val = parseFloat(item.value);
  if (isNaN(val)) return false;
  const normalizedSex = normalizeSex(sex);
  const lo = parseFloat(normalizedSex === 'female' ? rf.lowerBoundFemale : rf.lowerBoundMale);
  const hi = parseFloat(normalizedSex === 'female' ? rf.upperBoundFemale : rf.upperBoundMale);
  if (isNaN(lo) || isNaN(hi)) return false;
  return val < lo || val > hi;
}

function flagDirection(item, sex) {
  const rf = item.reportFormat;
  const val = parseFloat(item.value);
  if (isNaN(val)) return '';
  const normalizedSex = normalizeSex(sex);
  const lo = parseFloat(normalizedSex === 'female' ? rf.lowerBoundFemale : rf.lowerBoundMale);
  const hi = parseFloat(normalizedSex === 'female' ? rf.upperBoundFemale : rf.upperBoundMale);
  if (!isNaN(lo) && val < lo) return 'Низкий';
  if (!isNaN(hi) && val > hi) return 'Высокий';
  return '';
}

function refInterval(rf, sex) {
  const normalizedSex = normalizeSex(sex);
  if (normalizedSex === 'female') {
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

function normalizeSex(value) {
  const sex = normalizeText(value).toLowerCase();
  if (['female', 'f', 'женский', 'жен', 'ж'].includes(sex)) return 'female';
  if (['male', 'm', 'мужской', 'муж', 'м'].includes(sex)) return 'male';
  return sex;
}

function displaySex(value) {
  const sex = normalizeSex(value);
  if (sex === 'female') return 'Женский';
  if (sex === 'male') return 'Мужской';
  return normalizeText(value);
}

function displayFasting(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (['yes', 'y', 'true', '1', 'да'].includes(normalized)) return 'Да';
  if (['no', 'n', 'false', '0', 'нет'].includes(normalized)) return 'Нет';
  return normalizeText(value);
}

function buildRowNote(item) {
  const rf = item.reportFormat;
  const noteParts = [];

  const alternateRange = normalizeSex(PATIENT.sex) === 'female' ? rf.otherFemale : rf.otherMale;
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

function resolveOptions(options) {
  const src = options || {};

  // Support legacy flat patient object
  const legacyPatient = src.patient || src.user || {};

  const patient = {
    ...DEFAULT_PATIENT,
    name: legacyPatient.name || '',
    patientId: legacyPatient.patientId || '',
    specimenId: legacyPatient.specimenId || '',
    dob: legacyPatient.dob || '',
    age: legacyPatient.age || '',
    sex: legacyPatient.sex || '',
    address: legacyPatient.address || '',
    phone: legacyPatient.phone || '',
  };

  const doctor = {
    ...DEFAULT_DOCTOR,
    name: (src.doctor && src.doctor.name) || legacyPatient.orderingPhysician || legacyPatient.physicianName || '',
    accountNumber: (src.doctor && src.doctor.accountNumber) || legacyPatient.accountNumber || '',
    address: (src.doctor && src.doctor.address) || legacyPatient.physicianAddress || '',
    phone: (src.doctor && src.doctor.phone) || legacyPatient.physicianPhone || '',
    npi: (src.doctor && src.doctor.npi) || legacyPatient.physicianNPI || '',
  };

  const specimen = {
    ...DEFAULT_SPECIMEN,
    controlId: (src.specimen && src.specimen.controlId) || legacyPatient.controlId || '',
    dateCollected: (src.specimen && src.specimen.dateCollected) || legacyPatient.dateCollected || '',
    dateReceived: (src.specimen && src.specimen.dateReceived) || legacyPatient.dateReceived || '',
    dateReported: (src.specimen && src.specimen.dateReported) || legacyPatient.dateReported || '',
    fasting: (src.specimen && src.specimen.fasting) || legacyPatient.fasting || '',
  };

  if (!patient.name) {
    throw new Error('LabPdf.generatePDF requires options.patient with at least a name.');
  }

  return { patient, doctor, specimen };
}

function resolveReports(data) {
  if (Array.isArray(data.reportDetails) && data.reportDetails.length) {
    return data.reportDetails;
  }

  return [data];
}

function getReportTestName(report) {
  return report['Test Name'] || report.testName || 'Лабораторный результат';
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
function drawHeader(doc, logoPng) {
  const y0 = S.margin.t;

  // Patient name
  doc.setFont(S.font, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...S.colors.black);
  doc.text(PATIENT.name, S.margin.l, y0 + 3.8);

  // Patient details (left)
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.black);
  doc.text('ID пациента: ', S.margin.l, y0 + 7.8);
  doc.setFont(S.font, 'bold');
  doc.text(PATIENT.patientId, S.margin.l + doc.getTextWidth('ID пациента: '), y0 + 7.8);

  doc.setFont(S.font, 'normal');
  doc.text('ID образца: ', S.margin.l, y0 + 11.1);
  doc.setFont(S.font, 'bold');
  doc.text(PATIENT.specimenId, S.margin.l + doc.getTextWidth('ID образца: '), y0 + 11.1);

  // DOB / Age / Sex (center-left)
  const cx = 63;
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.black);
  doc.text('Дата рождения:', cx, y0 + 3.8);
  const dobLabelW = doc.getTextWidth('Дата рождения: ');
  doc.setFont(S.font, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...S.colors.black);
  doc.text(PATIENT.dob, cx + dobLabelW, y0 + 3.8);

  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.black);
  doc.text('Возраст: ', cx, y0 + 7.7);
  doc.setFont(S.font, 'bold');
  doc.text(String(PATIENT.age), cx + doc.getTextWidth('Возраст: '), y0 + 7.7);

  doc.setFont(S.font, 'normal');
  doc.text('Пол: ', cx, y0 + 11);
  doc.setFont(S.font, 'bold');
  doc.text(displaySex(PATIENT.sex), cx + doc.getTextWidth('Пол: '), y0 + 11);

  // "Patient Report" title
  const tx = 110;
  doc.setFont(S.font, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...S.colors.black);
  doc.text('Отчет пациента', tx, y0 + 3.8);

  // Account / Physician
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...S.colors.black);
  doc.text('Номер аккаунта: ', tx, y0 + 7.8);
  doc.setFont(S.font, 'bold');
  doc.text(DOCTOR.accountNumber, tx + doc.getTextWidth('Номер аккаунта: '), y0 + 7.8);

  doc.setFont(S.font, 'normal');
  doc.text('Назначивший врач: ', tx, y0 + 11.1);
  doc.setFont(S.font, 'bold');
  doc.text(DOCTOR.name, tx + doc.getTextWidth('Назначивший врач: '), y0 + 11.1);

  // Genex logo image
  if (logoPng) {
    const logoH = 9.2;
    const logoW = logoH * (1840.5 / 677.6);
    const logoX = S.page.w - S.margin.r - logoW;
    doc.addImage(logoPng, 'PNG', logoX, y0, logoW, logoH);
  }

  // separator line
  const lineY = y0 + 13.8;
  doc.setDrawColor(...S.colors.sectionRule);
  doc.setLineWidth(0.13);
  doc.line(S.margin.l, lineY, S.page.w - S.margin.r, lineY);

  return lineY;
}

// ─── Draw date bar ──────────────────────────────────────────────────
function drawDateBar(doc, y) {
  const barH = 5.4;

  // Blue background
  doc.setFillColor(...S.colors.resultBg);
  doc.rect(S.margin.l, y, contentW, barH, 'F');

  doc.setFontSize(5.9);
  const items = [
    ['Дата взятия: ', SPECIMEN.dateCollected],
    ['Дата получения: ', SPECIMEN.dateReceived],
    ['Дата отчета: ', SPECIMEN.dateReported],
    ['Натощак: ', displayFasting(SPECIMEN.fasting)],
  ];
  // Calculate total text width to distribute spacing evenly
  let totalTextW = 0;
  items.forEach(([label, val]) => {
    doc.setFont(S.font, 'bold');
    totalTextW += doc.getTextWidth(label) + doc.getTextWidth(val);
  });
  const gap = (contentW - 3.6 - totalTextW) / (items.length - 1);

  let x = S.margin.l + 1.8;
  const ty = y + barH / 2;
  items.forEach(([label, val], i) => {
    doc.setFont(S.font, 'bold');
    doc.setTextColor(...S.colors.black);
    doc.text(label, x, ty, { baseline: 'middle' });
    const lw = doc.getTextWidth(label);
    doc.setFont(S.font, 'bold');
    doc.setTextColor(...S.colors.black);
    doc.text(val, x + lw, ty, { baseline: 'middle' });
    x += lw + doc.getTextWidth(val) + (i < items.length - 1 ? gap : 0);
  });

  // bottom border
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.13);
  doc.line(S.margin.l, y + barH, S.page.w - S.margin.r, y + barH);

  return y + 7.8;
}

// ─── Draw ordered items block ───────────────────────────────────────
function drawOrderedItems(doc, y, testName) {
  doc.setFontSize(6.1);
  doc.setFont(S.font, 'normal');
  doc.setTextColor(...S.colors.black);

  const label = 'Назначенные анализы: ';
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
  doc.setLineWidth(0.13);
  doc.line(S.margin.l, y + blockH, S.page.w - S.margin.r, y + blockH);
  return y + blockH;
}

// ─── Draw "Date Collected" right-aligned ────────────────────────────
function drawDateCollectedRight(doc, y) {
  doc.setFontSize(5.4);
  doc.setFont(S.font, 'normal');
  doc.setTextColor(...S.colors.black);
  const label = 'Дата взятия: ';
  const val = SPECIMEN.dateCollected;
  doc.setFont(S.font, 'bold');
  const vw = doc.getTextWidth(val);
  doc.text(val, S.page.w - S.margin.r - vw, y + 3.2);
  doc.setFont(S.font, 'normal');
  doc.text(label, S.page.w - S.margin.r - vw - doc.getTextWidth(label), y + 3.2);
  return y + 5.5;
}

// ─── Draw footer (every page) ───────────────────────────────────────
function drawFooter(doc, pageNum, totalPages, logoBlackPng) {
  const y = S.page.h - S.margin.b;

  // separator
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.13);
  doc.line(S.margin.l, y, S.page.w - S.margin.r, y);

  // genex logo (black)
  if (logoBlackPng) {
    const fLogoH = 4.5;
    const fLogoW = fLogoH * (1840.5 / 677.6);
    doc.addImage(logoBlackPng, 'PNG', S.margin.l, y + 1, fLogoW, fLogoH);
  }

  // page number
  doc.setFont(S.font, 'normal');
  doc.setFontSize(4.9);
  doc.text('Страница ' + pageNum + ' из ' + totalPages, S.page.w - S.margin.r, y + 4.8, { align: 'right' });

  // bottom left
  doc.setFontSize(4.1);
  doc.setTextColor(...S.colors.black);
  doc.text('\u00A92024 Laboratory Corporation of America\u00AE Holdings', S.margin.l, y + 8.3);
  doc.text('Все права защищены - Версия отчета Enterprise 2.00', S.margin.l, y + 11);

  // bottom right
  doc.setFontSize(4.1);
  const rText = 'Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.';
  const rLines = doc.splitTextToSize(rText, 78);
  doc.text(rLines, S.page.w - S.margin.r, y + 8.3, { align: 'right' });
}

// ─── Draw details section (last page) ───────────────────────────────
function drawDetailsSection(doc, y, logoPng) {
  if (y > S.page.h - 100) {
    doc.addPage();
    y = drawHeader(doc, logoPng);
  }

  // Disclaimer
  doc.setFont(S.font, 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...S.colors.black);
  doc.text('Примечание', S.margin.l, y + 3.4);
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.1);
  const disclaimer = 'Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.';
  const dLines = doc.splitTextToSize(disclaimer, contentW);
  doc.text(dLines, S.margin.l, y + 6.4);
  y += 6.4 + dLines.length * 2.25 + 1.6;

  // Icon Legend
  doc.setFont(S.font, 'bold');
  doc.setFontSize(6.6);
  doc.text('Условные обозначения', S.margin.l, y);
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.2);
  y += 3.7;
  doc.setTextColor(...S.colors.orange);
  doc.setFontSize(8);
  doc.text('\u25B2', S.margin.l, y);
  doc.setFontSize(5.2);
  doc.setTextColor(...S.colors.black);
  doc.text('Вне референсного диапазона', S.margin.l + 3.5, y);
  doc.setFillColor(...S.colors.red);
  doc.rect(S.margin.l + 36.5, y - 1.5, 2.1, 2.1, 'F');
  doc.setTextColor(...S.colors.black);
  doc.text('Критическое значение или предупреждение', S.margin.l + 40, y);
  y += 4.8;

  // Performing Labs
  doc.setFont(S.font, 'bold');
  doc.setFontSize(6.6);
  doc.text('Информация о лаборатории', S.margin.l, y);
  y += 3.7;
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.1);
  doc.text('ООО Genex Laboratories, Bodomzor yo\u2019li 72, 100052, Toshkent', S.margin.l, y);
  y += 2.5;
  doc.text('По вопросам врач может связаться с лабораторией: +998 77 733 35 33', S.margin.l, y);
  y += 2.5;
  doc.text('Email: info@genex.uz', S.margin.l, y);
  y += 6.2;

  // 3-column details
  const colW = contentW / 3;
  const col1 = S.margin.l;
  const col2 = S.margin.l + colW;
  const col3 = S.margin.l + colW * 2;

  // separator
  doc.setDrawColor(...S.colors.rowBorder);
  doc.setLineWidth(0.13);
  doc.line(S.margin.l, y, S.page.w - S.margin.r, y);
  y += 4;

  doc.setFontSize(5.2);
  doc.setTextColor(...S.colors.black);
  doc.text('Данные пациента', col1, y);
  doc.text('Данные врача', col2, y);
  doc.text('Данные образца', col3, y);
  y += 3.4;

  doc.setTextColor(...S.colors.black);
  doc.setFont(S.font, 'bold');
  doc.setFontSize(5.7);
  doc.text(PATIENT.name, col1, y);
  doc.text(DOCTOR.name, col2, y);
  y += 2.8;
  doc.setFont(S.font, 'normal');
  doc.setFontSize(5.1);
  doc.text(PATIENT.address, col1, y);
  doc.text(DOCTOR.address ? doc.splitTextToSize(DOCTOR.address, colW - 2) : '', col2, y);
  doc.setFont(S.font, 'bold');
  doc.text('ID образца: ' + PATIENT.specimenId, col3, y);
  y += 2.8;
  doc.setFont(S.font, 'normal');
  doc.text('', col1, y);
  doc.text('', col2, y);
  doc.setFont(S.font, 'bold');
  doc.text('Контрольный ID: ' + SPECIMEN.controlId, col3, y);
  y += 2.8;
  doc.setFont(S.font, 'normal');
  doc.text('Телефон: ' + PATIENT.phone, col1, y);
  doc.text('Телефон: ' + DOCTOR.phone, col2, y);
  y += 2.8;
  doc.text('Дата рождения: ' + PATIENT.dob, col1, y);
  doc.text('Номер аккаунта: ' + DOCTOR.accountNumber, col2, y);
  doc.text('Дата взятия: ' + SPECIMEN.dateCollected + ' Local', col3, y);
  y += 2.8;
  doc.text('Возраст: ' + PATIENT.age, col1, y);
  doc.text('NPI: ' + DOCTOR.npi, col2, y);
  doc.text('Дата получения: ' + SPECIMEN.dateReceived + ' 0000 ET', col3, y);
  y += 2.8;
  doc.text('Пол: ' + displaySex(PATIENT.sex), col1, y);
  doc.text('', col2, y);
  doc.text('Дата отчета: ' + SPECIMEN.dateReported + ' 0607 ET', col3, y);
}

// ─── Main: generatePDF ──────────────────────────────────────────────
async function generatePDF(data, options = {}) {
  const resolved = resolveOptions(options);
  PATIENT = resolved.patient;
  DOCTOR = resolved.doctor;
  SPECIMEN = resolved.specimen;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Register Source Sans 3 (Cyrillic support)
  doc.addFileToVFS('SourceSans3-Regular.ttf', SOURCESANS3_REGULAR);
  doc.addFont('SourceSans3-Regular.ttf', 'SourceSans3', 'normal');
  doc.addFileToVFS('SourceSans3-Bold.ttf', SOURCESANS3_BOLD);
  doc.addFont('SourceSans3-Bold.ttf', 'SourceSans3', 'bold');

  // Load logos
  const logoUrl = options.logoUrl || 'lib/logo.svg';
  const logoBlackUrl = options.logoBlackUrl || logoUrl.replace('logo.svg', 'logo-black.svg');
  const [logoPng, logoBlackPng] = await Promise.all([
    loadLogoPng(logoUrl),
    loadLogoPng(logoBlackUrl),
  ]);

  const sex = PATIENT.sex;
  const reports = resolveReports(data);
  const orderedItemsText = reports.map(getReportTestName).join('; ');

  // Group reports by sampleId
  const sampleGroups = new Map();
  for (const report of reports) {
    const sid = report.sampleId || '';
    if (!sampleGroups.has(sid)) sampleGroups.set(sid, []);
    sampleGroups.get(sid).push(report);
  }

  // Fill specimenId from first report's sampleId if not set
  if (!PATIENT.specimenId && reports.length) {
    PATIENT.specimenId = reports[0].sampleId || '';
  }

  // ─── Page 1 setup ───────────────────────────────────────────────
  let currentY = drawHeader(doc, logoPng);
  currentY = drawDateBar(doc, currentY);
  currentY = drawOrderedItems(doc, currentY, orderedItemsText || data.testName || '');
  currentY = drawDateCollectedRight(doc, currentY);

  for (const [sampleId, groupReports] of sampleGroups) {
    for (const report of groupReports) {
      const rows = buildRows(getReportItems(report), sex);
      if (!rows.length) continue;

      if (currentY > S.page.h - 85) {
        doc.addPage();
        currentY = drawHeader(doc, logoPng);
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
      tableBody.push([
        { content: r.testName, styles: {} },
        { content: r.value, styles: {} },
        { content: r.flag || '', styles: {} },
        { content: r.unit },
        { content: r.refInterval },
      ]);
      tableRowRefs.push({ type: 'result', row: r });

      if (r.note) {
        tableBody.push([
          {
            content: 'Примечание:',
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

    autoTable(doc, {
      startY: currentY,
      head: [['Показатель', { content: 'Результат', colSpan: 2 }, 'Единица измерения', 'Референсный интервал']],
      body: tableBody,
      theme: 'plain',
      styles: {
        font: 'SourceSans3',
        fontSize: 5.9,
        cellPadding: { top: 0.4, bottom: 0.4, left: 1.8, right: 1.8 },
        textColor: S.colors.black,
        lineWidth: 0,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: S.colors.tableHeaderBg,
        fontStyle: 'normal',
        fontSize: 5.9,
        textColor: S.colors.black,
        cellPadding: { top: 1.1, bottom: 0.9, left: 1.8, right: 1.8 },
      },
      columnStyles: {
        0: { cellWidth: 58 },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 31, halign: 'center', cellPadding: { top: 0.4, bottom: 0.4, left: 9, right: 1.8 } },
        4: { cellWidth: contentW - 58 - 24 - 14 - 31, halign: 'center' },
      },
      margin: { left: S.margin.l, right: S.margin.r, top: 28, bottom: S.margin.b + 8 },
      didDrawPage: function (hookData) {
        if (hookData.pageNumber > 1) {
          drawHeader(doc, logoPng);
          drawDateCollectedRight(doc, 15.6);
        }
      },
      didParseCell: function (hookData) {
        if (hookData.section === 'head') {
          hookData.cell.styles.lineWidth = { bottom: 0.35 };
          hookData.cell.styles.lineColor = [78, 78, 82];
          if (hookData.column.index === 0) {
            hookData.cell.styles.cellPadding = { top: 1.1, bottom: 0.9, left: 7, right: 1.8 };
          }
          if (hookData.column.index >= 1 && hookData.column.index <= 4) {
            hookData.cell.styles.halign = 'center';
          }
          if (hookData.column.index === 3) {
            hookData.cell.styles.cellPadding = { top: 1.1, bottom: 0.9, left: 9, right: 1.8 };
          }
        }

        if (hookData.section !== 'body') return;

        const rowRef = tableRowRefs[hookData.row.index];
        const isNoteRow = rowRef && rowRef.type === 'note';

        if (isNoteRow) {
          hookData.cell.styles.textColor = S.colors.black;
          hookData.cell.styles.fontStyle = 'normal';
          if (hookData.column.index === 1 || hookData.column.index === 2) {
            hookData.cell.styles.fillColor = S.colors.resultBg;
          } else {
            hookData.cell.styles.fillColor = [255, 255, 255];
          }
          return;
        }

        if (hookData.column.index === 1 || hookData.column.index === 2) {
          hookData.cell.styles.fillColor = S.colors.resultBg;
          hookData.cell.styles.halign = 'center';
          hookData.cell.styles.fontStyle = rowRef && rowRef.row.outOfRange ? 'bold' : 'normal';
        }

        if (hookData.column.index === 0) {
          hookData.cell.styles.fontStyle = rowRef && rowRef.row.outOfRange ? 'bold' : 'normal';
          hookData.cell.styles.cellPadding = { top: 0.4, bottom: 0.4, left: 7, right: 1.8 };
        }
      },
      willDrawCell: function (hookData) {
        if (hookData.section === 'body') {
          const { x, y, width, height } = hookData.cell;
          if (hookData.column.index === 1 || hookData.column.index === 2) {
            // draw blue fill manually; first row gets extra top inset
            const isFirstRow = hookData.row.index === 0;
            const insetTop = isFirstRow ? 0.25 : 0.1;
            const inset = 0.1;
            doc.setFillColor(...S.colors.resultBg);
            doc.rect(x, y + insetTop, width, height - insetTop - inset, 'F');
            hookData.cell.styles.fillColor = false;
          }
          doc.setDrawColor(...S.colors.rowBorder);
          doc.setLineWidth(0.13);
          doc.line(x, y + height, x + width, y + height);
        }
      },
      didDrawCell: function (hookData) {
        if (hookData.section !== 'body') return;
        const rowRef = tableRowRefs[hookData.row.index];

        if (!rowRef || rowRef.type !== 'result') return;

        if (!rowRef.row.outOfRange || hookData.column.index !== 0) return;

        const arrowX = hookData.cell.x + 2.1;
        const arrowY = hookData.cell.y + hookData.cell.height / 2 + 0.1;
        doc.setTextColor(...S.colors.orange);
        doc.setFont(S.font, 'bold');
        doc.setFontSize(8);
        doc.text(rowRef.row.flag === 'Низкий' ? '\u25BC' : '\u25B2', arrowX, arrowY, { baseline: 'middle' });
        doc.setTextColor(...S.colors.black);
      },
    });

    currentY = doc.lastAutoTable.finalY + 6;
    }
  }

  const finalY = currentY;

  // Draw details section
  drawDetailsSection(doc, finalY, logoPng);

  // Now add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, logoBlackPng);
  }

  // Return blob URL for preview
  return doc.output('bloburl');
}

export { generatePDF, generatePDF as createLabReportPdf };
export { DEFAULT_PATIENT, DEFAULT_DOCTOR, DEFAULT_SPECIMEN };
