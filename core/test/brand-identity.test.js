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

for (const relativePath of [...cssFiles, ...scriptFiles]) {
  const css = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const colors = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => normalizeHex(match[0]));
  const invalidColors = [...new Set(colors.filter((color) => !approvedColors.has(color)))];

  assert.deepEqual(invalidColors, [], `${relativePath}: cores fora da paleta: ${invalidColors.join(", ")}`);
  if (relativePath.endsWith(".css")) {
    assert.doesNotMatch(css, /(?:color-mix\(|(?:linear|radial|conic|repeating-linear)-gradient\(|box-shadow\s*:)/i,
      `${relativePath}: mistura de cores, gradiente ou sombra não permitido.`);
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
