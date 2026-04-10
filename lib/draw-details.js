import { contentW, S } from "./constants.js";
import { drawHeader } from "./draw-header.js";
import { calculateAge, displaySex } from "./helpers.js";

const DETAILS_STYLE = {
	disclaimerTitleOffset: 3.4,
	disclaimerTextOffset: 6.4,
	disclaimerLineStep: 2.25,
	disclaimerBottomGap: 1.6,
	legendTitleToRow: 3.7,
	legendSectionHeight: 4.8,
	labTitleToFirstLine: 3.7,
	labLineStep: 2.5,
	bottomGap: 10,
};

function getDetailsBottomY() {
	return S.page.h - S.margin.b - DETAILS_STYLE.bottomGap;
}

function getVisibleDetailsBlockHeight(doc) {
	doc.setFont(S.font, "normal");
	doc.setFontSize(5.1);
	const disclaimer =
		"Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.";
	const dLines = doc.splitTextToSize(disclaimer, contentW);
	const disclaimerBottom =
		DETAILS_STYLE.disclaimerTextOffset +
		DETAILS_STYLE.disclaimerLineStep * Math.max(dLines.length - 1, 0);
	const afterDisclaimerY =
		DETAILS_STYLE.disclaimerTextOffset +
		DETAILS_STYLE.disclaimerLineStep * dLines.length +
		DETAILS_STYLE.disclaimerBottomGap;
	const labTitleY =
		afterDisclaimerY + DETAILS_STYLE.legendSectionHeight;
	const emailY =
		labTitleY +
		DETAILS_STYLE.labTitleToFirstLine +
		DETAILS_STYLE.labLineStep * 2;

	return Math.max(
		DETAILS_STYLE.disclaimerTitleOffset,
		disclaimerBottom,
		emailY,
	);
}

function getDetailsStartY(doc, currentY) {
	const bottomAlignedY = getDetailsBottomY() - getVisibleDetailsBlockHeight(doc);
	return Math.max(currentY, bottomAlignedY);
}

// ─── Draw details section (last page) ───────────────────────────────

export function drawDetailsSection(doc, y, patient, doctor, specimen) {
	const detailsBlockHeight = getVisibleDetailsBlockHeight(doc);
	const bottomAlignedY = getDetailsBottomY() - detailsBlockHeight;

	if (y > bottomAlignedY) {
		doc.addPage();
		y = drawHeader(doc, patient, doctor);
	}
	y = getDetailsStartY(doc, y);

	// Disclaimer
	doc.setFont(S.font, "bold");
	doc.setFontSize(6.6);
	doc.setTextColor(...S.colors.black);
	doc.text("Примечание", S.margin.l, y + DETAILS_STYLE.disclaimerTitleOffset);
	doc.setFont(S.font, "normal");
	doc.setFontSize(5.1);
	const disclaimer =
		"Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.";
	const dLines = doc.splitTextToSize(disclaimer, contentW);
	doc.text(dLines, S.margin.l, y + DETAILS_STYLE.disclaimerTextOffset);
	y +=
		DETAILS_STYLE.disclaimerTextOffset +
		dLines.length * DETAILS_STYLE.disclaimerLineStep +
		DETAILS_STYLE.disclaimerBottomGap;

	// Icon Legend
	doc.setFont(S.font, "bold");
	doc.setFontSize(6.6);
	doc.text("Условные обозначения", S.margin.l, y);
	doc.setFont(S.font, "normal");
	doc.setFontSize(5.2);
	y += DETAILS_STYLE.legendTitleToRow;
	doc.setTextColor(...S.colors.orange);
	doc.setFontSize(8);
	doc.text("\u25B2", S.margin.l, y);
	doc.setFontSize(5.2);
	doc.setTextColor(...S.colors.black);
	doc.text("Вне референсного диапазона", S.margin.l + 3.5, y);
	doc.setFillColor(...S.colors.red);
	doc.rect(S.margin.l + 36.5, y - 1.5, 2.1, 2.1, "F");
	doc.setTextColor(...S.colors.black);
	doc.text("Критическое значение или предупреждение", S.margin.l + 40, y);
	y += DETAILS_STYLE.legendSectionHeight;

	// Performing Labs
	doc.setFont(S.font, "bold");
	doc.setFontSize(6.6);
	doc.text("Информация о лаборатории", S.margin.l, y);
	y += DETAILS_STYLE.labTitleToFirstLine;
	doc.setFont(S.font, "normal");
	doc.setFontSize(5.1);
	doc.text(
		"ООО Genex Laboratories, Bodomzor yo\u2019li 72, 100052, Toshkent",
		S.margin.l,
		y,
	);
	y += DETAILS_STYLE.labLineStep;
	doc.text(
		"По вопросам врач может связаться с лабораторией: +998 77 733 35 33",
		S.margin.l,
		y,
	);
	y += DETAILS_STYLE.labLineStep;
	doc.text("Email: info@genex.uz", S.margin.l, y);

	// TODO: Come back later and restore/redesign this bottom 3-column details block.
	/*
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
	doc.text("Данные пациента", col1, y);
	doc.text("Данные врача", col2, y);
	doc.text("Данные образца", col3, y);
	y += 3.4;

	doc.setTextColor(...S.colors.black);
	doc.setFont(S.font, "bold");
	doc.setFontSize(5.7);
	doc.text(patient.name, col1, y);
	doc.text(doctor.name, col2, y);
	doc.setFont(S.font, "bold");
	doc.text("ID образца: " + patient.specimenId, col3, y);
	y += 2.8;
	doc.setFont(S.font, "normal");
	doc.setFontSize(5.1);
	doc.text("Телефон: " + patient.phone, col1, y);
	doc.text("Телефон: " + doctor.phone, col2, y);
	doc.text("Дата взятия: " + specimen.dateCollected, col3, y);
	y += 2.8;
	if (patient.dob) doc.text("Дата рождения: " + patient.dob, col1, y);
	doc.text("Номер аккаунта: " + doctor.accountNumber, col2, y);
	doc.text("Дата получения: " + specimen.dateReceived, col3, y);
	y += 2.8;
	const age = patient.age ? String(patient.age) : calculateAge(patient.dob);
	doc.text("Возраст: " + age, col1, y);
	doc.text("Дата отчета: " + specimen.dateReported, col3, y);
	y += 2.8;
	doc.text("Пол: " + displaySex(patient.sex), col1, y);
	*/
}
