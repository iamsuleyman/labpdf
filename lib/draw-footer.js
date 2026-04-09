import { LOGO, S } from "./constants.js";

// ─── Draw footer (every page) ───────────────────────────────────────

export function drawFooter(doc, pageNum, totalPages) {
	const lineY = S.page.h - S.margin.b;
	const rowGap = 3.6;
	const disclaimerFontSize = 5.5;
	const disclaimerLineStep = 2.8;
	const logoW = LOGO.footer.h * LOGO.footer.aspect;
	const colGap = 6;
	const col1X = S.margin.l;
	const col2X = col1X + logoW + colGap;
	const col2W = 74;
	const col3X = col2X + col2W + colGap;
	const col3Right = S.page.w - S.margin.r;
	const col3W = col3Right - col3X;
	const rowY = lineY + rowGap;

	// separator
	doc.setDrawColor(...S.colors.rowBorder);
	doc.setLineWidth(0.13);
	doc.line(S.margin.l, lineY, S.page.w - S.margin.r, lineY);

	doc.setFont(S.font, "normal");
	doc.setTextColor(...S.colors.black);

	// one row, three columns
	doc.setFontSize(4.9);
	doc.text(
		"Страница " + pageNum + " из " + totalPages,
		col3Right,
		rowY,
		{ align: "right" },
	);

	doc.setFontSize(disclaimerFontSize);
	const rText =
		"Результаты лабораторных исследований не являются самостоятельным основанием для постановки диагноза. Их интерпретация осуществляется врачом с учетом анамнеза, клинических данных и результатов других диагностических исследований.";
	const rLines = doc.splitTextToSize(rText, col2W);
	const disclaimerLines = rLines.slice(0, 4);
	const disclaimerBlockHeight =
		disclaimerLineStep * Math.max(disclaimerLines.length - 1, 0);
	const disclaimerY =
		lineY + (LOGO.footer.h - disclaimerBlockHeight) / 2;
	disclaimerLines.forEach((line, index) => {
		doc.text(line, col2X, disclaimerY + disclaimerLineStep * index);
	});

	doc.setFontSize(4.1);
	doc.text(
		"\u00A92026 Genex Health Laboratories\u00AE",
		col3Right,
		rowY + rowGap,
		{ align: "right" },
	);

	const versionText = "Все права защищены - Версия отчета 2.06";
	const versionLines = doc.splitTextToSize(versionText, col3W);
	doc.text(versionLines, col3Right, rowY + rowGap * 2, { align: "right" });
}
