import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modules = ["home", "forum", "videoteca", "recursos"];

for (const moduleName of modules) {
  const cssUrl = new URL(`../../modules/${moduleName}/${moduleName}.css`, import.meta.url);
  const css = await readFile(cssUrl, "utf8");
  const selector = `[data-mse-module="${moduleName}"][data-mse-module="${moduleName}"]`;
  const block = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\}`));

  assert.ok(block, `Seletor estrutural ausente para ${moduleName}.`);
  assert.match(
    block[1],
    /border-radius:\s*var\(--mse-section-radius,\s*0\)\s*;/,
    `A raiz de ${moduleName} deve usar --mse-section-radius com fallback 0.`
  );
}

console.log("section-radius.test.js: verificações concluídas com sucesso.");
