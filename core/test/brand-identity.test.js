import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const cssFiles = [
  "../core.css",
  "../editor-quill.css",
  "../editor-summernote.css",
  "../../modules/home/home.css",
  "../../modules/forum/forum.css",
  "../../modules/recursos/recursos.css",
  "../../modules/videoteca/videoteca.css",
  "../../modules/ui/accordion/accordion.css",
  "../../modules/ui/carousel/carousel.css"
];
const scriptFiles = [
  "../core.js",
  "../theme-adapter.js",
  "../../modules/home/home-view.js",
  "../../modules/forum/forum-data.js",
  "../../modules/forum/forum-view.js",
  "../../modules/videoteca/videoteca-view.js"
];
const approvedColors = new Set([
  "#008542", "#FDC82F", "#FFFFFF", "#00B2A9", "#C4D600",
  "#EBFF00", "#ED8B00", "#006298", "#3DDAFF", "#75787B", "#000000"
]);

function normalizeHex(value) {
  if (value.length === 4) {
    return `#${[...value.slice(1)].map((digit) => digit.repeat(2)).join("")}`.toUpperCase();
  }
  return value.toUpperCase();
}

function hexColors(text) {
  return [...text.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => normalizeHex(match[0]));
}

function isNearBlack(hex) {
  const value = hex.length === 7 ? hex.slice(1) : hex.slice(1).split("").map((d) => d + d).join("");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return Math.max(r, g, b) < 60;
}

// Doc section 3 explicitly allows gradients that pass through tones outside the main
// palette (e.g. a tint of an approved color) as long as they stay harmonious/legible.
// So hex colors used strictly as gradient() stops are exempt from the approved-set
// check below, but must still never be near-black (the actual incident this guards).
function splitGradients(css) {
  const gradientCalls = [];
  let outside = "";
  const re = /(?:linear|radial|conic|repeating-linear)-gradient\(/gi;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(css))) {
    const start = match.index;
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "(") depth++;
      else if (css[i] === ")") depth--;
      i++;
    }
    outside += css.slice(lastIndex, start);
    gradientCalls.push(css.slice(start, i));
    lastIndex = i;
    re.lastIndex = i;
  }
  outside += css.slice(lastIndex);
  return { outside, gradientCalls };
}

for (const relativePath of [...cssFiles, ...scriptFiles]) {
  const css = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outside, gradientCalls } = relativePath.endsWith(".css")
    ? splitGradients(css)
    : { outside: css, gradientCalls: [] };

  const invalidColors = [...new Set(hexColors(outside).filter((color) => !approvedColors.has(color)))];
  assert.deepEqual(invalidColors, [], `${relativePath}: cores fora da paleta: ${invalidColors.join(", ")}`);

  const nearBlackInGradients = [...new Set(gradientCalls.flatMap((call) => hexColors(call)).filter(isNearBlack))];
  assert.deepEqual(nearBlackInGradients, [],
    `${relativePath}: tom quase-preto usado em gradiente: ${nearBlackInGradients.join(", ")}`);

  if (relativePath.endsWith(".css")) {
    assert.doesNotMatch(css, /box-shadow\s*:/i, `${relativePath}: sombra não permitida.`);
    assert.doesNotMatch(css, /color-mix\(/i, `${relativePath}: color-mix não permitido.`);
    // rgba()/rgb() fabricate transparency-based surfaces and stay banned, with ONE documented
    // local exception (doc secao 4 exige justificativa + aprovacao para excecao local): a single
    // very diffuse 10% black vignette at the hero's margin, approved to add focus toward the
    // center without creating any predominance of an off-palette color across the whole page.
    const rgbCalls = css.match(/rgba?\([^)]*\)/gi) ?? [];
    const disallowedRgb = rgbCalls.filter((call) => call.replace(/\s+/g, "") !== "rgba(0,0,0,0.1)");
    assert.deepEqual(disallowedRgb, [],
      `${relativePath}: uso de rgba/rgb não permitido (só a vinheta de margem 10% preto é uma exceção aprovada): ${disallowedRgb.join(", ")}`);
    assert.doesNotMatch(css, /letter-spacing\s*:\s*-/i,
      `${relativePath}: letter-spacing negativo não permitido.`);
  }

  for (const match of relativePath.endsWith(".css") ? css.matchAll(/border-radius\s*:\s*([^;]+);/gi) : []) {
    const value = match[1].trim();
    assert.match(value, /^(?:0|var\(--mse-(?:section-)?radius,\s*0\))$/,
      `${relativePath}: border-radius não aprovado: ${value}`);
  }
}

console.log("brand-identity.test.js: identidade visual validada com sucesso.");
