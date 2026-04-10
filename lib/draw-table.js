import { contentW, S } from "./constants.js";
import { createTableHooks } from "./draw-table-hooks.js";

// ─── Render a results table for one report section ──────────────────

const TABLE_LAYOUT = {
	titleGap: 6.2,
	afterGap: 6,
	marginBottom: S.margin.b + 8,
};

const TABLE_COLUMN_WIDTHS = {
	testName: 65,
	value: 16,
	flag: 16,
	unit: 31,
	refInterval: contentW - 65 - 16 - 16 - 31,
};

const TABLE_TEXT_STYLE = {
	bodyFontSize: 8,
	headFontSize: 7,
	noteLabelFontSize: 6.5,
	noteTextFontSize: 6,
	bodyPadding: { top: 0.7, bottom: 0.7, left: 1.8, right: 1.8 },
	headPadding: { top: 1.1, bottom: 0.9, left: 1.8, right: 1.8 },
	headFirstColumnPadding: { top: 1.1, bottom: 0.9, left: 7, right: 1.8 },
	bodyFirstColumnPadding: { top: 0.55, bottom: 0.55, left: 7, right: 1.8 },
	bodyUnitPadding: { top: 0.7, bottom: 0.7, left: 9, right: 1.8 },
	noteLabelPadding: { top: 1.1, bottom: 1.5, left: 7, right: 1.8 },
	noteTextPadding: { top: 1.1, bottom: 1.5, left: 2, right: 2 },
};

function getTextLines(doc, text, width, fontSize) {
	return doc.splitTextToSize(String(text || " "), width, { fontSize });
}

function getTextHeight(doc, lines, fontSize) {
	const safeLines = lines.length ? lines : [" "];
	return doc.getTextDimensions(safeLines, { fontSize }).h;
}

function getCellHeight(doc, text, width, fontSize, padding) {
	const textWidth = Math.max(width - padding.left - padding.right, 1);
	const lines = getTextLines(doc, text, textWidth, fontSize);
	return (
		getTextHeight(doc, lines, fontSize) + padding.top + padding.bottom
	);
}

function getTableHeaderHeight(doc) {
	return Math.max(
		getCellHeight(
			doc,
			"Показатель",
			TABLE_COLUMN_WIDTHS.testName,
			TABLE_TEXT_STYLE.headFontSize,
			TABLE_TEXT_STYLE.headFirstColumnPadding,
		),
		getCellHeight(
			doc,
			"Результат",
			TABLE_COLUMN_WIDTHS.value + TABLE_COLUMN_WIDTHS.flag,
			TABLE_TEXT_STYLE.headFontSize,
			TABLE_TEXT_STYLE.headPadding,
		),
		getCellHeight(
			doc,
			"Ед. измерения",
			TABLE_COLUMN_WIDTHS.unit,
			TABLE_TEXT_STYLE.headFontSize,
			{ ...TABLE_TEXT_STYLE.headPadding, left: 9 },
		),
		getCellHeight(
			doc,
			"Референсный интервал",
			TABLE_COLUMN_WIDTHS.refInterval,
			TABLE_TEXT_STYLE.headFontSize,
			TABLE_TEXT_STYLE.headPadding,
		),
	);
}

function getResultRowHeight(doc, row) {
	return Math.max(
		getCellHeight(
			doc,
			row.testName,
			TABLE_COLUMN_WIDTHS.testName,
			TABLE_TEXT_STYLE.bodyFontSize,
			TABLE_TEXT_STYLE.bodyFirstColumnPadding,
		),
		getCellHeight(
			doc,
			row.value,
			TABLE_COLUMN_WIDTHS.value,
			TABLE_TEXT_STYLE.bodyFontSize,
			TABLE_TEXT_STYLE.bodyPadding,
		),
		getCellHeight(
			doc,
			row.flag || "",
			TABLE_COLUMN_WIDTHS.flag,
			TABLE_TEXT_STYLE.bodyFontSize,
			TABLE_TEXT_STYLE.bodyPadding,
		),
		getCellHeight(
			doc,
			row.unit || "",
			TABLE_COLUMN_WIDTHS.unit,
			TABLE_TEXT_STYLE.bodyFontSize,
			TABLE_TEXT_STYLE.bodyUnitPadding,
		),
		getCellHeight(
			doc,
			row.refInterval || "",
			TABLE_COLUMN_WIDTHS.refInterval,
			TABLE_TEXT_STYLE.bodyFontSize,
			TABLE_TEXT_STYLE.bodyPadding,
		),
	);
}

function getNoteRowHeight(doc, row) {
	return Math.max(
		getCellHeight(
			doc,
			"Примечание:",
			TABLE_COLUMN_WIDTHS.testName,
			TABLE_TEXT_STYLE.noteLabelFontSize,
			TABLE_TEXT_STYLE.noteLabelPadding,
		),
		getCellHeight(
			doc,
			row.note,
			contentW - TABLE_COLUMN_WIDTHS.testName,
			TABLE_TEXT_STYLE.noteTextFontSize,
			TABLE_TEXT_STYLE.noteTextPadding,
		),
	);
}

export function canFitResultSection(doc, currentY, rows) {
	if (!rows.length) return true;

	const firstRow = rows[0];
	const firstBlockHeight =
		getTableHeaderHeight(doc) +
		getResultRowHeight(doc, firstRow) +
		(firstRow.note ? getNoteRowHeight(doc, firstRow) : 0);
	const maxStartY = S.page.h - TABLE_LAYOUT.marginBottom;

	return currentY + TABLE_LAYOUT.titleGap + firstBlockHeight <= maxStartY;
}

export function drawResultTable(
	doc,
	currentY,
	rows,
	patient,
	doctor,
	specimen,
) {
	const tableBody = [];
	const tableRowRefs = [];

	rows.forEach((r) => {
		tableBody.push([
			{ content: r.testName, styles: {} },
			{ content: r.value, styles: {} },
			{ content: r.flag || "", styles: {} },
			{ content: r.unit },
			{ content: r.refInterval },
		]);
		tableRowRefs.push({ type: "result", row: r });

		if (r.note) {
			tableBody.push([
				{
					content: "Примечание:",
					styles: {
						fontStyle: "normal",
						fontSize: 6.5,
						textColor: S.colors.black,
						cellPadding: { top: 1.1, bottom: 1.5, left: 7, right: 1.8 },
						halign: "left",
					},
				},
				{
					content: r.note,
					colSpan: 4,
					styles: {
						fontSize: 6,
						textColor: S.colors.black,
						halign: "left",
						cellPadding: { top: 1.1, bottom: 1.5, left: 2, right: 2 },
					},
				},
			]);
			tableRowRefs.push({ type: "note", row: r });
		}
	});

	const hooks = createTableHooks(
		doc,
		tableBody,
		tableRowRefs,
		patient,
		doctor,
		specimen,
	);

	doc.autoTable({
		startY: currentY,
		head: [
			[
				"Показатель",
				{ content: "Результат", colSpan: 2 },
				"Ед. измерения",
				"Референсный интервал",
			],
		],
		body: tableBody,
		theme: "plain",
		styles: {
			font: "SourceSans3",
			fontSize: 8,
			cellPadding: { top: 0.7, bottom: 0.7, left: 1.8, right: 1.8 },
			textColor: S.colors.black,
			lineWidth: 0,
			overflow: "linebreak",
			valign: "middle",
		},
		headStyles: {
			fillColor: S.colors.tableHeaderBg,
			fontStyle: "normal",
			fontSize: TABLE_TEXT_STYLE.headFontSize,
			textColor: S.colors.black,
			cellPadding: TABLE_TEXT_STYLE.headPadding,
		},
		columnStyles: {
			0: { cellWidth: TABLE_COLUMN_WIDTHS.testName },
			1: { cellWidth: TABLE_COLUMN_WIDTHS.value, halign: "center" },
			2: { cellWidth: TABLE_COLUMN_WIDTHS.flag, halign: "center" },
			3: {
				cellWidth: TABLE_COLUMN_WIDTHS.unit,
				halign: "center",
				cellPadding: TABLE_TEXT_STYLE.bodyUnitPadding,
			},
			4: { cellWidth: TABLE_COLUMN_WIDTHS.refInterval, halign: "center" },
		},
		margin: {
			left: S.margin.l,
			right: S.margin.r,
			top: 28,
			bottom: TABLE_LAYOUT.marginBottom,
		},
		...hooks,
	});

	return doc.lastAutoTable.finalY + TABLE_LAYOUT.afterGap;
}
