import { S } from "./constants.js";
import { drawDateCollectedRight, drawHeader } from "./draw-header.js";

export function createTableHooks(
	doc,
	tableBody,
	tableRowRefs,
	patient,
	doctor,
	specimen,
) {
	return {
		didDrawPage(hookData) {
			if (hookData.pageNumber > 1) {
				drawHeader(doc, patient, doctor);
				drawDateCollectedRight(doc, 15.6, specimen);
			}
		},

		didParseCell(hookData) {
			if (hookData.section === "head") {
				hookData.cell.styles.lineWidth = { bottom: 0.35 };
				hookData.cell.styles.lineColor = [78, 78, 82];
				if (hookData.column.index === 0) {
					hookData.cell.styles.cellPadding = {
						top: 1.1,
						bottom: 0.9,
						left: 7,
						right: 1.8,
					};
				}
				if (hookData.column.index >= 1 && hookData.column.index <= 4) {
					hookData.cell.styles.halign = "center";
				}
				if (hookData.column.index === 3) {
					hookData.cell.styles.cellPadding = {
						top: 1.1,
						bottom: 0.9,
						left: 9,
						right: 1.8,
					};
				}
				return;
			}

			if (hookData.section !== "body") return;

			const rowRef = tableRowRefs[hookData.row.index];
			const isNoteRow = rowRef && rowRef.type === "note";

			if (isNoteRow) {
				hookData.cell.styles.textColor = S.colors.black;
				hookData.cell.styles.fontStyle = "normal";
				hookData.cell.styles.fillColor = [255, 255, 255];
				hookData.cell.styles.halign = "left";
				if (hookData.column.index === 0) {
					hookData.cell.styles.cellPadding = {
						top: 1.1,
						bottom: 1.5,
						left: 7,
						right: 1.8,
					};
				}
				return;
			}

			if (hookData.column.index === 1 || hookData.column.index === 2) {
				hookData.cell.styles.fillColor = S.colors.resultBg;
				hookData.cell.styles.halign = "center";
				hookData.cell.styles.fontStyle =
					rowRef && rowRef.row.outOfRange ? "bold" : "normal";
			}

			if (hookData.column.index === 0) {
				hookData.cell.styles.fontStyle =
					rowRef && rowRef.row.outOfRange ? "bold" : "normal";
				hookData.cell.styles.cellPadding = {
					top: 0.55,
					bottom: 0.55,
					left: 7,
					right: 1.8,
				};
			}
		},

		willDrawCell(hookData) {
			if (hookData.section !== "body") return;
			const rowRef = tableRowRefs[hookData.row.index];
			const isNoteRow = rowRef && rowRef.type === "note";
			const { x, y, width, height } = hookData.cell;

			if (
				!isNoteRow &&
				(hookData.column.index === 1 || hookData.column.index === 2)
			) {
				const insetTop = hookData.row.index === 0 ? 0.25 : 0.1;
				const inset = 0.1;
				doc.setFillColor(...S.colors.resultBg);
				doc.rect(x, y + insetTop, width, height - insetTop - inset, "F");
				hookData.cell.styles.fillColor = false;
			}

			doc.setDrawColor(...S.colors.rowBorder);
			doc.setLineWidth(0.13);
			doc.line(x, y + height, x + width, y + height);
		},

		didDrawCell(hookData) {
			if (hookData.section !== "body") return;
			const rowRef = tableRowRefs[hookData.row.index];
			if (!rowRef || rowRef.type !== "result") return;
			if (!rowRef.row.outOfRange || hookData.column.index !== 0) return;

			const arrowX = hookData.cell.x + 1.5;
			const arrowY = hookData.cell.y + hookData.cell.height / 2 + 0.1;
			doc.setTextColor(...S.colors.orange);
			doc.setFont(S.font, "bold");
			doc.setFontSize(10);
			doc.text(
				rowRef.row.flag === "Низкий" ? "\u25BC" : "\u25B2",
				arrowX,
				arrowY,
				{ baseline: "middle" },
			);
			doc.setTextColor(...S.colors.black);
		},
	};
}
