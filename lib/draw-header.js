import { contentW, S } from "./constants.js";
import { calculateAge, displaySex } from "./helpers.js";

const HEADER_TEXT = {
	patientId: "ID пациента: ",
	specimenId: "ID образца: ",
	dob: "Дата рождения: ",
	age: "Возраст: ",
	sex: "Пол: ",
	reportTitle: "Отчет пациента",
	accountNumber: "Номер аккаунта: ",
	physician: "Назначивший врач: ",
	dateCollected: "Дата взятия: ",
	dateReceived: "Дата получения: ",
	dateReported: "Дата отчета: ",
	orderedItems: "Назначенные анализы: ",
	method: "Метод: ",
};

const HEADER_STYLE = {
	header: {
		patientNameY: 3.8,
		patientIdY: 7.8,
		specimenIdY: 11.1,
		centerX: 63,
		dobY: 3.8,
		ageY: 7.7,
		sexY: 11,
		sexYWithoutDob: 7.7,
		reportX: 110,
		separatorOffset: 13.8,
	},
	dateBar: {
		height: 7,
		insetX: 3,
		borderWidth: 0.1,
		returnOffset: 7.8,
	},
	orderedItems: {
		fontSize: 7.5,
		textOffset: 3.5,
		lineStep: 3.05,
		blockPaddingTop: 3.8,
		blockPaddingBottom: 1.8,
		ruleWidth: 0.13,
	},
	method: {
		fontSize: 5.4,
		yOffset: 3.2,
		returnOffset: 5.5,
	},
	fontSize: {
		title: 10,
		body: 6.5,
		sex: 5.6,
		dateBar: 9,
	},
	ruleWidth: 0.13,
};

function applyTextStyle(doc, fontStyle, fontSize) {
	doc.setFont(S.font, fontStyle);
	doc.setFontSize(fontSize);
	doc.setTextColor(...S.colors.black);
}

function drawHorizontalRule(doc, y, color, width) {
	doc.setDrawColor(...color);
	doc.setLineWidth(width);
	doc.line(S.margin.l, y, S.page.w - S.margin.r, y);
}

function measureText(doc, text, fontStyle, fontSize) {
	applyTextStyle(doc, fontStyle, fontSize);
	return doc.getTextWidth(text);
}

function drawInlinePair(
	doc,
	{ label, value, x, y, labelFontSize, valueFontSize, baseline },
) {
	applyTextStyle(doc, "normal", labelFontSize);
	doc.text(label, x, y, baseline ? { baseline } : undefined);
	const labelWidth = doc.getTextWidth(label);

	applyTextStyle(doc, "bold", valueFontSize);
	doc.text(value, x + labelWidth, y, baseline ? { baseline } : undefined);
}

function drawRightAlignedPair(doc, { label, value, rightX, y, fontSize }) {
	applyTextStyle(doc, "bold", fontSize);
	const valueWidth = doc.getTextWidth(value);
	doc.text(value, rightX - valueWidth, y);

	applyTextStyle(doc, "normal", fontSize);
	doc.text(label, rightX - valueWidth - doc.getTextWidth(label), y);
}

function drawWrappedLines(doc, lines, x, startY, lineStep) {
	lines.forEach((line, index) => {
		doc.text(line, x, startY + lineStep * index);
	});
}

function getHeaderLayout(hasDob) {
	const top = S.margin.t;

	return {
		top,
		leftX: S.margin.l,
		centerX: HEADER_STYLE.header.centerX,
		reportX: HEADER_STYLE.header.reportX,
		patientNameY: top + HEADER_STYLE.header.patientNameY,
		patientIdY: top + HEADER_STYLE.header.patientIdY,
		specimenIdY: top + HEADER_STYLE.header.specimenIdY,
		dobY: top + HEADER_STYLE.header.dobY,
		ageY: top + (hasDob ? HEADER_STYLE.header.ageY : HEADER_STYLE.header.dobY),
		sexY:
			top +
			(hasDob ? HEADER_STYLE.header.sexY : HEADER_STYLE.header.sexYWithoutDob),
		separatorY: top + HEADER_STYLE.header.separatorOffset,
	};
}

function drawPatientBlock(doc, patient, layout) {
	applyTextStyle(doc, "bold", HEADER_STYLE.fontSize.title);
	doc.text(patient.name, layout.leftX, layout.patientNameY);

	drawInlinePair(doc, {
		label: HEADER_TEXT.patientId,
		value: patient.patientId,
		x: layout.leftX,
		y: layout.patientIdY,
		labelFontSize: HEADER_STYLE.fontSize.body,
		valueFontSize: HEADER_STYLE.fontSize.body,
	});

	drawInlinePair(doc, {
		label: HEADER_TEXT.specimenId,
		value: patient.specimenId,
		x: layout.leftX,
		y: layout.specimenIdY,
		labelFontSize: HEADER_STYLE.fontSize.body,
		valueFontSize: HEADER_STYLE.fontSize.body,
	});
}

function drawPatientMetaBlock(doc, patient, layout) {
	const age = patient.age ? String(patient.age) : calculateAge(patient.dob);

	if (patient.dob) {
		drawInlinePair(doc, {
			label: HEADER_TEXT.dob,
			value: patient.dob,
			x: layout.centerX,
			y: layout.dobY,
			labelFontSize: HEADER_STYLE.fontSize.body,
			valueFontSize: HEADER_STYLE.fontSize.title,
		});
	}

	drawInlinePair(doc, {
		label: HEADER_TEXT.age,
		value: age,
		x: layout.centerX,
		y: layout.ageY,
		labelFontSize: HEADER_STYLE.fontSize.body,
		valueFontSize: HEADER_STYLE.fontSize.body,
	});

	drawInlinePair(doc, {
		label: HEADER_TEXT.sex,
		value: displaySex(patient.sex),
		x: layout.centerX,
		y: layout.sexY,
		labelFontSize: HEADER_STYLE.fontSize.sex,
		valueFontSize: HEADER_STYLE.fontSize.sex,
	});
}

function drawReportBlock(doc, doctor, layout) {
	applyTextStyle(doc, "bold", HEADER_STYLE.fontSize.title);
	doc.text(HEADER_TEXT.reportTitle, layout.reportX, layout.patientNameY);

	drawInlinePair(doc, {
		label: HEADER_TEXT.accountNumber,
		value: doctor.accountNumber,
		x: layout.reportX,
		y: layout.patientIdY,
		labelFontSize: HEADER_STYLE.fontSize.body,
		valueFontSize: HEADER_STYLE.fontSize.body,
	});

	drawInlinePair(doc, {
		label: HEADER_TEXT.physician,
		value: doctor.name,
		x: layout.reportX,
		y: layout.specimenIdY,
		labelFontSize: HEADER_STYLE.fontSize.body,
		valueFontSize: HEADER_STYLE.fontSize.body,
	});
}

function getDateBarItems(specimen) {
	return [
		[HEADER_TEXT.dateCollected, specimen.dateCollected],
		[HEADER_TEXT.dateReceived, specimen.dateReceived],
		[HEADER_TEXT.dateReported, specimen.dateReported],
	];
}

function getInlinePairWidth(doc, label, value, fontSize) {
	const labelWidth = measureText(doc, label, "normal", fontSize);
	const valueWidth = measureText(doc, value, "bold", fontSize);
	return labelWidth + valueWidth;
}

function getDateBarGap(doc, items, startX, endX) {
	const totalWidth = items.reduce((sum, [label, value]) => {
		return sum + getInlinePairWidth(doc, label, value, HEADER_STYLE.fontSize.dateBar);
	}, 0);

	return (endX - startX - totalWidth) / (items.length - 1);
}

function drawDateBarItem(doc, label, value, x, y) {
	drawInlinePair(doc, {
		label,
		value,
		x,
		y,
		labelFontSize: HEADER_STYLE.fontSize.dateBar,
		valueFontSize: HEADER_STYLE.fontSize.dateBar,
		baseline: "middle",
	});
}

// ─── Draw header (every page) ───────────────────────────────────────

export function drawHeader(doc, patient, doctor) {
	const layout = getHeaderLayout(Boolean(patient.dob));

	drawPatientBlock(doc, patient, layout);
	drawPatientMetaBlock(doc, patient, layout);
	drawReportBlock(doc, doctor, layout);
	drawHorizontalRule(
		doc,
		layout.separatorY,
		S.colors.sectionRule,
		HEADER_STYLE.ruleWidth,
	);

	return layout.separatorY;
}

// ─── Draw date bar ──────────────────────────────────────────────────

export function drawDateBar(doc, y, specimen) {
	const { height, insetX, borderWidth, returnOffset } = HEADER_STYLE.dateBar;
	const items = getDateBarItems(specimen);
	const startX = S.margin.l + insetX;
	const endX = S.page.w - S.margin.r - insetX;
	const textY = y + height / 2;
	const gap = getDateBarGap(doc, items, startX, endX);

	doc.setFillColor(...S.colors.resultBg);
	doc.rect(S.margin.l, y, contentW, height, "F");

	drawHorizontalRule(doc, y, S.colors.black, borderWidth);

	let x = startX;
	items.forEach(([label, value], index) => {
		if (index === items.length - 1) {
			x = endX - getInlinePairWidth(doc, label, value, HEADER_STYLE.fontSize.dateBar);
		}

		drawDateBarItem(doc, label, value, x, textY);
		x +=
			getInlinePairWidth(doc, label, value, HEADER_STYLE.fontSize.dateBar) +
			(index < items.length - 1 ? gap : 0);
	});

	drawHorizontalRule(doc, y + height, S.colors.black, borderWidth);

	return y + returnOffset;
}

// ─── Draw ordered items block ───────────────────────────────────────

export function drawOrderedItems(doc, y, testName) {
	const orderedText = testName || "-";
	const {
		fontSize,
		textOffset,
		lineStep,
		blockPaddingTop,
		blockPaddingBottom,
		ruleWidth,
	} = HEADER_STYLE.orderedItems;

	applyTextStyle(doc, "normal", fontSize);
	doc.text(HEADER_TEXT.orderedItems, S.margin.l, y + textOffset);
	const labelWidth = doc.getTextWidth(HEADER_TEXT.orderedItems);

	applyTextStyle(doc, "bold", fontSize);
	const lines = doc.splitTextToSize(orderedText, contentW - labelWidth);

	doc.text(lines[0], S.margin.l + labelWidth, y + textOffset);
	drawWrappedLines(doc, lines.slice(1), S.margin.l, y + textOffset + lineStep, lineStep);

	const blockHeight = blockPaddingTop + lines.length * lineStep + blockPaddingBottom;
	drawHorizontalRule(doc, y + blockHeight, S.colors.rowBorder, ruleWidth);

	return y + blockHeight;
}

// ─── Draw method right-aligned ──────────────────────────────────────

export function drawDateCollectedRight(doc, y, specimen) {
	if (!specimen.method) return y;

	drawRightAlignedPair(doc, {
		label: HEADER_TEXT.method,
		value: specimen.method,
		rightX: S.page.w - S.margin.r,
		y: y + HEADER_STYLE.method.yOffset,
		fontSize: HEADER_STYLE.method.fontSize,
	});

	return y + HEADER_STYLE.method.returnOffset;
}
