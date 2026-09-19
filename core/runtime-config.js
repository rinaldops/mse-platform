import { BASE_THEME } from "../themes/base/theme.js";

const ALLOWED_ROOTS = new Set(["layout", "theme", "accessibility", "modules"]);
const ALLOWED_TOKENS = new Set(Object.keys(BASE_THEME.tokens));

function plain(value) {
  return value && !Array.isArray(value) && typeof value === "object";
}

function merge(left, right) {
  const result = { ...left };
  Object.entries(right || {}).forEach(([key, value]) => {
    result[key] = plain(value) && plain(result[key]) ? merge(result[key], value) : value;
  });
  return result;
}

function freeze(value) {
  if (plain(value) || Array.isArray(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function resolveRuntimeConfig({ host = {}, global = {}, module = {}, instance = {}, preview = {} } = {}) {
  const config = [
    { layout: { mode: "contained" }, theme: BASE_THEME, accessibility: { minimumContrast: 4.5 }, modules: {} },
    host, global, module, instance, preview
  ].reduce(merge);
  Object.keys(config).forEach((key) => {
    if (!ALLOWED_ROOTS.has(key)) throw new TypeError(`Configuração não reconhecida: ${key}.`);
  });
  if (!new Set(["contained", "fullBleed"]).has(config.layout?.mode)) throw new TypeError("layout.mode inválido.");
  Object.keys(config.theme?.tokens || {}).forEach((key) => {
    if (!ALLOWED_TOKENS.has(key)) throw new TypeError(`Token não reconhecido: ${key}.`);
  });
  const tokens = config.theme.tokens;
  ["colorBackground", "colorSurface", "colorText", "colorMuted", "colorBorder", "colorPrimary", "colorOnPrimary"]
    .forEach((key) => {
      if (!/^#[0-9a-f]{6}$/i.test(tokens[key])) throw new TypeError(`${key} deve ser uma cor hexadecimal.`);
    });
  if (contrast(tokens.colorText, tokens.colorBackground) < config.accessibility.minimumContrast) {
    throw new TypeError("O contraste entre texto e fundo é insuficiente.");
  }
  if (contrast(tokens.colorOnPrimary, tokens.colorPrimary) < config.accessibility.minimumContrast) {
    throw new TypeError("O contraste da cor primária é insuficiente.");
  }
  return freeze(config);
}
