const _svgCache = {};

async function fetchSvg(url) {
  if (_svgCache[url]) return _svgCache[url];
  const text = await fetch(url).then(r => r.text());
  const el = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
  _svgCache[url] = el;
  return el;
}

export async function drawLogo(doc, url, x, y, width, height) {
  const fn = window.svg2pdf?.svg2pdf ?? window.svg2pdf;
  if (typeof fn !== 'function') throw new Error('svg2pdf is not loaded. Include svg2pdf.umd.min.js before labpdf.js.');
  const el = await fetchSvg(url);
  await fn(el, doc, { x, y, width, height });
}
