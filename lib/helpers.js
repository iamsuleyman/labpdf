// ─── Helpers ────────────────────────────────────────────────────────

function joinNonEmpty(parts, separator) {
  return parts.filter(Boolean).join(separator);
}

export function normalizeText(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .trim();
}

export function normalizeSex(value) {
  const sex = normalizeText(value).toLowerCase();
  if (['female', 'f', 'женский', 'жен', 'ж'].includes(sex)) return 'female';
  if (['male', 'm', 'мужской', 'муж', 'м'].includes(sex)) return 'male';
  return sex;
}

export function displaySex(value) {
  const sex = normalizeSex(value);
  if (sex === 'female') return 'Женский';
  if (sex === 'male') return 'Мужской';
  return normalizeText(value);
}

export function displayFasting(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (['yes', 'y', 'true', '1', 'да'].includes(normalized)) return 'Да';
  if (['no', 'n', 'false', '0', 'нет'].includes(normalized)) return 'Нет';
  return normalizeText(value);
}

export function isOutOfRange(item, sex) {
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

export function flagDirection(item, sex) {
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

export function refInterval(rf, sex) {
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

export function buildRowNote(item, patientSex) {
  const rf = item.reportFormat;
  const noteParts = [];

  const alternateRange = normalizeSex(patientSex) === 'female' ? rf.otherFemale : rf.otherMale;
  const normalizedRange = normalizeText(alternateRange);
  if (normalizedRange && normalizedRange !== '-' && normalizedRange.includes('\n')) {
    noteParts.push(normalizedRange);
  }

  return joinNonEmpty(noteParts, '\n');
}

function getPreviousResult(item) {
  return normalizeText(
    item.previousResult || item.prevResult || item.previousValue ||
    item.reportFormat?.previousResult || item.reportFormat?.previousValue || ''
  );
}

function getPreviousDate(item) {
  return normalizeText(
    item.previousDate || item.prevDate || item.previousResultDate ||
    item.reportFormat?.previousDate || item.reportFormat?.previousResultDate || ''
  );
}

export function buildRows(items, sex) {
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
      note: buildRowNote(it, sex),
    });
  }

  return rows;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function calculateAge(dob) {
  if (!dob) return '';
  // Try parsing common formats: DD.MM.YYYY, DD-MM-YYYY, MM/DD/YYYY, ISO
  let d;
  const dmyDot = dob.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const dmyDash = dob.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const mdy = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyDot) d = new Date(+dmyDot[3], +dmyDot[2] - 1, +dmyDot[1]);
  else if (dmyDash) d = new Date(+dmyDash[3], +dmyDash[2] - 1, +dmyDash[1]);
  else if (mdy) d = new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);
  else d = new Date(dob);
  if (isNaN(d)) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

export function resolveSpecimenFromReport(report) {
  return {
    controlId: report.accessionNo || report.sampleId || '',
    dateCollected: formatDate(report['Sample Date'] || report['Order Date'] || ''),
    dateReceived: formatDate(report['Accession Date'] || ''),
    dateReported: formatDate(report['Report Date'] || report['Approval Date'] || ''),
    fasting: '',
  };
}

export function resolveReports(data) {
  if (Array.isArray(data.reportDetails) && data.reportDetails.length) {
    return data.reportDetails;
  }
  return [data];
}

export function getReportTestName(report) {
  return report['Test Name'] || report.testName || 'Лабораторный результат';
}

export function getReportItems(report) {
  return Array.isArray(report.reportFormatAndValues) ? report.reportFormatAndValues : [];
}
