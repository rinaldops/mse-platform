/**
 * Kernel-only helpers for opt-in extension runtime.
 *
 * IMPORTANT:
 * - This module is intentionally NOT wired into kernel/application.js.
 * - It is an opt-in helper consumed by kernel/extension-loader.js.
 * - It must remain side-effect free (no network, no DOM).
 *
 * Goals:
 * - Provide a minimal compatibility check between an extension manifest
 *   (`core/module-contract.js` shape) and the running mse-core version.
 * - Provide safe parsing of ParamsJson for extension rows (MSEExtensions).
 */

const RANGE_RE = /^>=\d+\.\d+\.\d+\s+<\d+\.\d+\.\d+$/;

function toNumberTuple(version) {
  const parts = String(version || "").trim().split(".");
  if (parts.length !== 3) return null;
  const nums = parts.map((part) => Number(String(part).replace(/[^0-9].*$/, "")));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return nums;
}

function compareTuple(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Parse a simple compatibility range of the form: ">=x.y.z <a.b.c".
 *
 * @param {string} value
 * @returns {{ min: number[], max: number[] } | null}
 */
export function parseCoreCompatibility(value) {
  const text = String(value || "").trim();
  if (!RANGE_RE.test(text)) return null;
  const [minText, maxText] = text.split(/\s+</);
  const min = toNumberTuple(minText.replace(/^>=/, ""));
  const max = toNumberTuple(maxText);
  if (!min || !max) return null;
  return { min, max };
}

/**
 * Returns true when coreVersion satisfies the manifest coreCompatibility.
 *
 * - If coreVersion cannot be parsed, returns false.
 * - If manifest has no valid coreCompatibility string, returns false.
 * - Range is inclusive for min and exclusive for max.
 *
 * @param {{ coreCompatibility?: string } | null | undefined} manifest
 * @param {string} coreVersion
 */
export function isManifestCompatibleWithCore(manifest, coreVersion) {
  const range = parseCoreCompatibility(manifest?.coreCompatibility);
  const current = toNumberTuple(coreVersion);
  if (!range || !current) return false;
  return compareTuple(current, range.min) >= 0 && compareTuple(current, range.max) < 0;
}

/**
 * Safe JSON parse of MSEExtensions.ParamsJson.
 *
 * @param {string | null | undefined} value
 * @returns {object}
 */
export function parseExtensionParams(value) {
  if (value === null || value === undefined) return {};
  const text = String(value).trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}
