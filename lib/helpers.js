// ─── Helpers ────────────────────────────────────────────────────────

function joinNonEmpty(parts, separator) {
	return parts.filter(Boolean).join(separator);
}

function htmlToPlainText(value) {
	const source = String(value || "");
	if (!/[<&]/.test(source)) return source;

	if (typeof document !== "undefined") {
		const root = document.createElement("div");
		root.innerHTML = source;

		const blocks = root.querySelectorAll("br, div, p, li");
		blocks.forEach((node) => {
			if (node.tagName === "BR") {
				node.replaceWith("\n");
				return;
			}
			if (node.nextSibling) node.insertAdjacentText("afterend", "\n");
		});

		return root.textContent || "";
	}

	return source
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/?(div|p|li)[^>]*>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'");
}

export function normalizeText(value) {
	return htmlToPlainText(value)
		.replace(/\\n/g, "\n")
		.replace(/\s+\n/g, "\n")
		.replace(/\n\s+/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function normalizeSex(value) {
	const sex = normalizeText(value).toLowerCase();
	if (["female", "f", "женский", "жен", "ж"].includes(sex)) return "female";
	if (["male", "m", "мужской", "муж", "м"].includes(sex)) return "male";
	return sex;
}

export function displaySex(value) {
	const sex = normalizeSex(value);
	if (sex === "female") return "Женский";
	if (sex === "male") return "Мужской";
	return normalizeText(value);
}

export function displayFasting(value) {
	const normalized = normalizeText(value).toLowerCase();
	if (["yes", "y", "true", "1", "да"].includes(normalized)) return "Да";
	if (["no", "n", "false", "0", "нет"].includes(normalized)) return "Нет";
	return normalizeText(value);
}

function getSexSpecificRange(rf, sex, type = "reference") {
	if (!rf) return { lo: NaN, hi: NaN };

	const normalizedSex = normalizeSex(sex);
	const isFemale = normalizedSex === "female";
	const lowerKey = type === "critical"
		? isFemale
			? "criticalLowerFemale"
			: "criticalLowerMale"
		: isFemale
			? "lowerBoundFemale"
			: "lowerBoundMale";
	const upperKey = type === "critical"
		? isFemale
			? "criticalUpperFemale"
			: "criticalUpperMale"
		: isFemale
			? "upperBoundFemale"
			: "upperBoundMale";

	return {
		lo: parseFloat(rf[lowerKey]),
		hi: parseFloat(rf[upperKey]),
	};
}

function getValueDirection(value, range) {
	if (!Number.isFinite(value)) return "";
	if (Number.isFinite(range.lo) && value < range.lo) return "Низкий";
	if (Number.isFinite(range.hi) && value > range.hi) return "Высокий";
	return "";
}

export function isOutOfRange(item, sex) {
	if (item.highlight === 1) return true;
	const rf = item.reportFormat;
	const val = parseFloat(item.value);
	if (isNaN(val)) return false;
	const range = getSexSpecificRange(rf, sex);
	return Boolean(getValueDirection(val, range));
}

export function isCritical(item, sex) {
	const rf = item.reportFormat;
	const hasCriticalFlag = item.highlightFlag === 1 || rf?.highlightFlag === 1;
	if (!hasCriticalFlag) return false;

	const val = parseFloat(item.value);
	if (isNaN(val)) return false;

	const range = getSexSpecificRange(rf, sex, "critical");
	return Boolean(getValueDirection(val, range));
}

export function flagDirection(item, sex) {
	const rf = item.reportFormat;
	const val = parseFloat(item.value);
	if (isNaN(val)) return "";
	return getValueDirection(val, getSexSpecificRange(rf, sex));
}

export function refInterval(rf, sex) {
	const normalizedSex = normalizeSex(sex);
	const isFemale = normalizedSex === "female";
	const other = normalizeText(isFemale ? rf.otherFemale : rf.otherMale);
	const lo = normalizeText(
		isFemale ? rf.lowerBoundFemale : rf.lowerBoundMale,
	);
	const hi = normalizeText(
		isFemale ? rf.upperBoundFemale : rf.upperBoundMale,
	);
	const hasBounds = lo && lo !== "-" && hi && hi !== "-";
	const hasAlternateRange = other && other !== "-";

	if (hasBounds) return lo + "-" + hi;
	if (hasAlternateRange && !hasBounds) return "";
	return "";
}

export function buildRowNote(item, patientSex) {
	const rf = item.reportFormat;
	const noteParts = [];
	const normalizedSex = normalizeSex(patientSex);
	const isFemale = normalizedSex === "female";

	const alternateRange = isFemale ? rf.otherFemale : rf.otherMale;
	const normalizedRange = normalizeText(alternateRange);
	const lo = normalizeText(isFemale ? rf.lowerBoundFemale : rf.lowerBoundMale);
	const hi = normalizeText(isFemale ? rf.upperBoundFemale : rf.upperBoundMale);
	const hasBounds = lo && lo !== "-" && hi && hi !== "-";
	if (
		normalizedRange &&
		normalizedRange !== "-" &&
		(!hasBounds || normalizedRange.includes("\n"))
	) {
		noteParts.push(normalizedRange);
	}

	return joinNonEmpty(noteParts, "\n");
}

function getPreviousResult(item) {
	return normalizeText(
		item.previousResult ||
			item.prevResult ||
			item.previousValue ||
			item.reportFormat?.previousResult ||
			item.reportFormat?.previousValue ||
			"",
	);
}

function getPreviousDate(item) {
	return normalizeText(
		item.previousDate ||
			item.prevDate ||
			item.previousResultDate ||
			item.reportFormat?.previousDate ||
			item.reportFormat?.previousResultDate ||
			"",
	);
}

export function buildRows(items, sex) {
	const rows = [];

	for (let i = 0; i < items.length; i++) {
		const it = items[i];
		const rf = it.reportFormat;
		if (!rf) continue;
		if (rf.descriptionFlag === 1) continue;
		if (it.value === "-" || it.value === "") continue;

		const outOfRange = isOutOfRange(it, sex);
		const critical = isCritical(it, sex);

		rows.push({
			testName: rf.testName,
			value: it.value,
			flag: flagDirection(it, sex),
			previousResult: getPreviousResult(it),
			previousDate: getPreviousDate(it),
			unit: rf.testUnit && rf.testUnit !== "-" ? rf.testUnit : "",
			refInterval: refInterval(rf, sex),
			outOfRange,
			critical,
			note: buildRowNote(it, sex),
		});
	}

	return rows;
}

function formatDate(isoString) {
	if (!isoString) return "";
	const d = new Date(isoString);
	if (isNaN(d)) return isoString;
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const yyyy = d.getFullYear();
	return `${dd}.${mm}.${yyyy}`;
}

export function calculateAge(dob) {
	if (!dob) return "";
	// Try parsing common formats: DD.MM.YYYY, DD-MM-YYYY, MM/DD/YYYY, ISO
	let d;
	const dmyDot = dob.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
	const dmyDash = dob.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
	const mdy = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (dmyDot) d = new Date(+dmyDot[3], +dmyDot[2] - 1, +dmyDot[1]);
	else if (dmyDash) d = new Date(+dmyDash[3], +dmyDash[2] - 1, +dmyDash[1]);
	else if (mdy) d = new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);
	else d = new Date(dob);
	if (isNaN(d)) return "";
	const today = new Date();
	let age = today.getFullYear() - d.getFullYear();
	const m = today.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
	return age >= 0 ? String(age) : "";
}

export function resolveSpecimenFromReport(report) {
	const reportItems = Array.isArray(report.reportFormatAndValues)
		? report.reportFormatAndValues
		: [];
	const methodItem = reportItems.find((item) => item?.reportFormat?.method);

	return {
		controlId: report.accessionNo || report.sampleId || "",
		dateCollected: formatDate(
			report["Sample Date"] || report["Order Date"] || "",
		),
		dateReceived: formatDate(report["Accession Date"] || ""),
		dateReported: formatDate(
			report["Report Date"] || report["Approval Date"] || "",
		),
		fasting: "",
		method: normalizeText(methodItem?.reportFormat?.method || ""),
	};
}

export function resolveReports(data) {
	if (Array.isArray(data.reportDetails) && data.reportDetails.length) {
		return data.reportDetails;
	}
	return [data];
}

export function getReportTestName(report) {
	return report["Test Name"] || report.testName || "Лабораторный результат";
}

export function sortReportsByTestName(reports) {
	return reports
		.map((report, index) => ({
			report,
			index,
			testName: normalizeText(getReportTestName(report)).toLocaleLowerCase("ru"),
		}))
		.sort((a, b) => {
			const byName = a.testName.localeCompare(b.testName, "ru", {
				sensitivity: "base",
				numeric: true,
			});
			return byName || a.index - b.index;
		})
		.map(({ report }) => report);
}

export function getReportItems(report) {
	return Array.isArray(report.reportFormatAndValues)
		? report.reportFormatAndValues
		: [];
}
