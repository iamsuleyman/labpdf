import { svg2pdf } from "svg2pdf.js";

const _svgCache = {};

async function fetchSvg(url) {
	if (_svgCache[url]) return _svgCache[url];
	const text = await fetch(url).then((r) => r.text());
	const el = new DOMParser().parseFromString(
		text,
		"image/svg+xml",
	).documentElement;
	_svgCache[url] = el;
	return el;
}

export async function drawLogo(doc, url, x, y, width, height) {
	const el = await fetchSvg(url);
	await svg2pdf(el, doc, { x, y, width, height });
}
