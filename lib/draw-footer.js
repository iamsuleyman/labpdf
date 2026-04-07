import { S } from "./constants.js";

// ─── Draw footer (every page) ───────────────────────────────────────

export function drawFooter(doc, pageNum, totalPages) {
	const y = S.page.h - S.margin.b;

	// separator
	doc.setDrawColor(...S.colors.rowBorder);
	doc.setLineWidth(0.13);
	doc.line(S.margin.l, y, S.page.w - S.margin.r, y);

	// page number
	doc.setFont(S.font, "normal");
	doc.setFontSize(4.9);
	doc.text(
		"Страница " + pageNum + " из " + totalPages,
		S.page.w - S.margin.r,
		y + 4.8,
		{ align: "right" },
	);

	// bottom left
	doc.setFontSize(4.1);
	doc.setTextColor(...S.colors.black);
	doc.text("\u00A92026 Genex Health Laboratories\u00AE", S.margin.l, y + 8.3);
	doc.text("Все права защищены - Версия отчета 2.05", S.margin.l, y + 11);

	// bottom right
	doc.setFontSize(4.1);
	const rText =
		"Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.";
	const rLines = doc.splitTextToSize(rText, 78);
	doc.text(rLines, S.page.w - S.margin.r, y + 8.3, { align: "right" });
}
