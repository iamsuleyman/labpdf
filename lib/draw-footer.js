import { LOGO, S } from "./constants.js";

const FOOTER_TEXT = {
	disclaimer:
		"Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.",
	copyright: "\u00A92026 Genex Health Laboratories\u00AE",
	version: "Все права защищены - Версия отчета 2.08",
};

const FOOTER_STYLE = {
	separatorWidth: 0.13,
	rowGap: 3.6,
	columnGap: 6,
	pageNumberFontSize: 5.5,
	metaFontSize: 4,
	disclaimerFontSize: 5.5,
	disclaimerLineStep: 3,
	disclaimerColumnWidth: 74,
	disclaimerMaxLines: 4,
};

function getFooterLayout() {
	const lineY = S.page.h - S.margin.b;
	const logoWidth = LOGO.footer.h * LOGO.footer.aspect;
	const disclaimerX = S.margin.l + logoWidth + FOOTER_STYLE.columnGap;
	const disclaimerW = FOOTER_STYLE.disclaimerColumnWidth;
	const rightEdge = S.page.w - S.margin.r;
	const rightColumnX = disclaimerX + disclaimerW + FOOTER_STYLE.columnGap;
	const rightColumnW = rightEdge - rightColumnX;

	return {
		lineY,
		rowY: lineY + FOOTER_STYLE.rowGap,
		disclaimerX,
		disclaimerW,
		rightEdge,
		rightColumnW,
	};
}

function applyFooterTextStyle(doc) {
	doc.setFont(S.font, "normal");
	doc.setTextColor(...S.colors.black);
}

function drawSeparator(doc, lineY) {
	doc.setDrawColor(...S.colors.rowBorder);
	doc.setLineWidth(FOOTER_STYLE.separatorWidth);
	doc.line(S.margin.l, lineY, S.page.w - S.margin.r, lineY);
}

function getDisclaimerLines(doc, width) {
	return doc
		.splitTextToSize(FOOTER_TEXT.disclaimer, width)
		.slice(0, FOOTER_STYLE.disclaimerMaxLines);
}

function getCenteredBlockTop(lineY, lineCount) {
	const blockHeight =
		FOOTER_STYLE.disclaimerLineStep * Math.max(lineCount - 1, 0);
	return lineY + (LOGO.footer.h - blockHeight) / 2;
}

function drawPageNumber(doc, layout, pageNum, totalPages) {
	doc.setFontSize(FOOTER_STYLE.pageNumberFontSize);
	doc.text(
		"Страница " + pageNum + " из " + totalPages,
		layout.rightEdge,
		layout.rowY,
		{ align: "right" },
	);
}

function drawDisclaimerColumn(doc, layout) {
	doc.setFontSize(FOOTER_STYLE.disclaimerFontSize);
	const lines = getDisclaimerLines(doc, layout.disclaimerW);
	const startY = getCenteredBlockTop(layout.lineY, lines.length);

	lines.forEach((line, index) => {
		doc.text(
			line,
			layout.disclaimerX,
			startY + FOOTER_STYLE.disclaimerLineStep * index,
		);
	});
}

function drawRightAlignedLines(doc, lines, x, startY, lineStep) {
	lines.forEach((line, index) => {
		doc.text(line, x, startY + lineStep * index, { align: "right" });
	});
}

function drawRightColumn(doc, layout) {
	doc.setFontSize(FOOTER_STYLE.metaFontSize);
	const metaStartY = layout.rowY + FOOTER_STYLE.rowGap;
	doc.text(
		FOOTER_TEXT.copyright,
		layout.rightEdge,
		metaStartY,
		{ align: "right" },
	);
	const versionLines = doc.splitTextToSize(
		FOOTER_TEXT.version,
		layout.rightColumnW,
	);
	drawRightAlignedLines(
		doc,
		versionLines,
		layout.rightEdge,
		metaStartY + FOOTER_STYLE.disclaimerLineStep,
		FOOTER_STYLE.disclaimerLineStep,
	);
}

// ─── Draw footer (every page) ───────────────────────────────────────

export function drawFooter(doc, pageNum, totalPages) {
	const layout = getFooterLayout();

	drawSeparator(doc, layout.lineY);
	applyFooterTextStyle(doc);
	drawPageNumber(doc, layout, pageNum, totalPages);
	drawDisclaimerColumn(doc, layout);
	drawRightColumn(doc, layout);
}
