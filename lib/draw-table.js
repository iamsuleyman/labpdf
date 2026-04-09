import { contentW, S } from "./constants.js";
import { createTableHooks } from "./draw-table-hooks.js";

// ─── Render a results table for one report section ──────────────────

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
				"Единица измерения",
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
			fontSize: 7,
			textColor: S.colors.black,
			cellPadding: { top: 1.1, bottom: 0.9, left: 1.8, right: 1.8 },
		},
		columnStyles: {
			0: { cellWidth: 65 },
			1: { cellWidth: 16, halign: "center" },
			2: { cellWidth: 16, halign: "center" },
			3: {
				cellWidth: 33,
				halign: "center",
				cellPadding: { top: 0.7, bottom: 0.7, left: 9, right: 1.8 },
			},
			4: { cellWidth: contentW - 65 - 16 - 16 - 33, halign: "center" },
		},
		margin: {
			left: S.margin.l,
			right: S.margin.r,
			top: 28,
			bottom: S.margin.b + 8,
		},
		...hooks,
	});

	return doc.lastAutoTable.finalY + 6;
}
