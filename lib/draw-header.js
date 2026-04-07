import { contentW, S } from "./constants.js";
import { calculateAge, displayFasting, displaySex } from "./helpers.js";

// ─── Draw header (every page) ───────────────────────────────────────

export function drawHeader(doc, patient, doctor) {
	const y0 = S.margin.t;

	// Patient name
	doc.setFont(S.font, "bold");
	doc.setFontSize(10);
	doc.setTextColor(...S.colors.black);
	doc.text(patient.name, S.margin.l, y0 + 3.8);

	// Patient details (left)
	doc.setFont(S.font, "normal");
	doc.setFontSize(6.5);
	doc.setTextColor(...S.colors.black);
	doc.text("ID пациента: ", S.margin.l, y0 + 7.8);
	doc.setFont(S.font, "bold");
	doc.text(
		patient.patientId,
		S.margin.l + doc.getTextWidth("ID пациента: "),
		y0 + 7.8,
	);

	doc.setFont(S.font, "normal");
	doc.text("ID образца: ", S.margin.l, y0 + 11.1);
	doc.setFont(S.font, "bold");
	doc.text(
		patient.specimenId,
		S.margin.l + doc.getTextWidth("ID образца: "),
		y0 + 11.1,
	);

	// DOB / Age / Sex (center-left)
	const cx = 63;
	const age = patient.age ? String(patient.age) : calculateAge(patient.dob);
	const dobY = y0 + 3.8;
	let ageY = y0 + 7.7;
	let sexY = y0 + 11;

	doc.setFont(S.font, "normal");
	doc.setFontSize(6.5);
	doc.setTextColor(...S.colors.black);

	if (patient.dob) {
		doc.text("Дата рождения:", cx, dobY);
		const dobLabelW = doc.getTextWidth("Дата рождения: ");
		doc.setFont(S.font, "bold");
		doc.setFontSize(10);
		doc.text(patient.dob, cx + dobLabelW, dobY);
		doc.setFont(S.font, "normal");
		doc.setFontSize(6.5);
	} else {
		ageY = dobY;
		sexY = y0 + 7.7;
	}

	doc.text("Возраст: ", cx, ageY);
	doc.setFont(S.font, "bold");
	doc.text(age, cx + doc.getTextWidth("Возраст: "), ageY);

	doc.setFont(S.font, "normal");
	doc.setFontSize(5.6);
	doc.text("Пол: ", cx, sexY);
	doc.setFont(S.font, "bold");
	doc.text(displaySex(patient.sex), cx + doc.getTextWidth("Пол: "), sexY);

	// "Patient Report" title
	const tx = 110;
	doc.setFont(S.font, "bold");
	doc.setFontSize(10);
	doc.setTextColor(...S.colors.black);
	doc.text("Отчет пациента", tx, y0 + 3.8);

	// Account / Physician
	doc.setFont(S.font, "normal");
	doc.setFontSize(6.5);
	doc.setTextColor(...S.colors.black);
	doc.text("Номер аккаунта: ", tx, y0 + 7.8);
	doc.setFont(S.font, "bold");
	doc.text(
		doctor.accountNumber,
		tx + doc.getTextWidth("Номер аккаунта: "),
		y0 + 7.8,
	);

	doc.setFont(S.font, "normal");
	doc.text("Назначивший врач: ", tx, y0 + 11.1);
	doc.setFont(S.font, "bold");
	doc.text(doctor.name, tx + doc.getTextWidth("Назначивший врач: "), y0 + 11.1);

	// separator line
	const lineY = y0 + 13.8;
	doc.setDrawColor(...S.colors.sectionRule);
	doc.setLineWidth(0.13);
	doc.line(S.margin.l, lineY, S.page.w - S.margin.r, lineY);

	return lineY;
}

// ─── Draw date bar ──────────────────────────────────────────────────

export function drawDateBar(doc, y, specimen) {
	const barH = 7;
	const insetX = 3;

	// Blue background
	doc.setFillColor(...S.colors.resultBg);
	doc.rect(S.margin.l, y, contentW, barH, "F");

	// top border
	doc.setDrawColor(...S.colors.black);
	doc.setLineWidth(0.1);
	doc.line(S.margin.l, y, S.page.w - S.margin.r, y);

	doc.setFontSize(9);
	const items = [
		["Дата взятия: ", specimen.dateCollected],
		["Дата получения: ", specimen.dateReceived],
		["Дата отчета: ", specimen.dateReported],
	];
	// Calculate total text width to distribute spacing evenly
	let totalTextW = 0;
	items.forEach(([label, val]) => {
		doc.setFont(S.font, "normal");
		const labelW = doc.getTextWidth(label);
		doc.setFont(S.font, "bold");
		const valueW = doc.getTextWidth(val);
		totalTextW += labelW + valueW;
	});
	const startX = S.margin.l + insetX;
	const endX = S.page.w - S.margin.r - insetX;
	const gap = (endX - startX - totalTextW) / (items.length - 1);

	let x = startX;
	const ty = y + barH / 2;
	doc.setTextColor(...S.colors.black);
	items.forEach(([label, val], i) => {
		if (i === items.length - 1) {
			doc.setFont(S.font, "normal");
			const labelW = doc.getTextWidth(label);
			doc.setFont(S.font, "bold");
			const valueW = doc.getTextWidth(val);
			x = endX - labelW - valueW;
		}
		doc.setFont(S.font, "normal");
		doc.text(label, x, ty, { baseline: "middle" });
		const lw = doc.getTextWidth(label);
		doc.setFont(S.font, "bold");
		doc.text(val, x + lw, ty, { baseline: "middle" });
		x += lw + doc.getTextWidth(val) + (i < items.length - 1 ? gap : 0);
	});

	// bottom border
	doc.setDrawColor(...S.colors.black);
	doc.setLineWidth(0.1);
	doc.line(S.margin.l, y + barH, S.page.w - S.margin.r, y + barH);

	return y + 7.8;
}

// ─── Draw ordered items block ───────────────────────────────────────

export function drawOrderedItems(doc, y, testName) {
	doc.setFontSize(7.5);
	doc.setFont(S.font, "normal");
	doc.setTextColor(...S.colors.black);

	const label = "Назначенные анализы: ";
	const orderedText = testName || "-";
	doc.text(label, S.margin.l, y + 3.5);
	const lw = doc.getTextWidth(label);
	doc.setFont(S.font, "bold");

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

export function drawDateCollectedRight(doc, y, specimen) {
	doc.setFontSize(5.4);
	doc.setFont(S.font, "normal");
	doc.setTextColor(...S.colors.black);
	const label = "Дата взятия: ";
	const val = specimen.dateCollected;
	doc.setFont(S.font, "bold");
	const vw = doc.getTextWidth(val);
	doc.text(val, S.page.w - S.margin.r - vw, y + 3.2);
	doc.setFont(S.font, "normal");
	doc.text(
		label,
		S.page.w - S.margin.r - vw - doc.getTextWidth(label),
		y + 3.2,
	);
	return y + 5.5;
}
