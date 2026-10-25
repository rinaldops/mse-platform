import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildExtensionIndex, validateExtensionIndex } from "../extension-index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

// buildExtensionIndex produz índice determinístico e inclui plugins.
{
  const index = await buildExtensionIndex({ root, platformVersion: "1.0.23" });
  validateExtensionIndex(index);

  // deve conter ao menos 1 plugin (system/mse_diagnostics)
  const plugin = index.entries.find((e) => e.kind === "plugin" && e.group === "system" && e.element === "mse_diagnostics");
  assert.ok(plugin, "esperava encontrar plugin system/mse_diagnostics no índice");
  assert.equal(plugin.manifestPath, "plugins/system/mse_diagnostics/manifest.json");

  // deve conter template mse-default
  const tpl = index.entries.find((e) => e.kind === "template" && e.element === "mse-default");
  assert.ok(tpl);

  // entradas únicas
  const keys = index.entries.map((e) => `${e.kind}:${e.group || ""}:${e.element}`);
  assert.equal(new Set(keys).size, keys.length);

  console.log("extension-index.test.js: índice inclui plugins/templates e é válido.");
}

console.log("extension-index.test.js: concluído com sucesso.");
