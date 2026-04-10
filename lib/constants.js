// ─── Default data shapes ───────────────────────────────────────────

export const DEFAULT_PATIENT = {
	name: "",
	patientId: "",
	specimenId: "", // set from report sampleId at render time
	dob: "",
	age: "",
	sex: "",
	phone: "",
};

export const DEFAULT_DOCTOR = {
	name: "",
	accountNumber: "",
	phone: "",
};

// ─── Style constants (matching genex style) ─────────────────────────

export const S = {
	// page in mm (letter)
	page: { w: 210, h: 297 },
	margin: { l: 7.5, r: 7.5, t: 7.5, b: 19.5 },
	colors: {
		black: [0, 0, 0],
		gray: [90, 90, 90],
		muted: [110, 110, 110],
		lightGrayBg: [249, 249, 249],
		resultBg: [235, 247, 255],
		criticalBg: [255, 235, 235],
		tableHeaderBg: [255, 255, 255],
		rowBorder: [156, 156, 156],
		sectionRule: [140, 140, 140],
		orange: [239, 140, 32],
		red: [194, 40, 40],
		blue: [0, 114, 206],
		cyan: [45, 196, 226],
		genexBlue: [8, 25, 153],
		genexOrange: [255, 66, 0],
	},
	font: "SourceSans3",
};

export const contentW = S.page.w - S.margin.l - S.margin.r;

export const LOGO = {
	header: { h: 10, aspect: 1840.5 / 677.6 },
	footer: { h: 16, aspect: 1118.4667 / 1020.1027 },
};
