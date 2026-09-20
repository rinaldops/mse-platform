import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modules = ["home", "forum", "videoteca", "recursos"];
const summaryModules = ["forum", "videoteca", "explore-mais"];

for (const moduleName of modules) {
  const cssUrl = new URL(`../../modules/${moduleName}/${moduleName}.css`, import.meta.url);
  const css = await readFile(cssUrl, "utf8");
  const selector = `[data-mse-module="${moduleName}"][data-mse-module="${moduleName}"]`;
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`${escapedSelector}[^{]*\\{([\\s\\S]*?)\\}`));

  assert.ok(block, `Seletor estrutural ausente para ${moduleName}.`);
  assert.match(
    block[1],
    /border-radius:\s*var\(--mse-section-radius,\s*0\)\s*;/,
    `A raiz de ${moduleName} deve usar --mse-section-radius com fallback 0.`
  );
}

for (const moduleName of summaryModules) {
  const cssName = moduleName === "explore-mais" ? "recursos" : moduleName;
  const cssUrl = new URL(`../../modules/${cssName}/${cssName}.css`, import.meta.url);
  const css = await readFile(cssUrl, "utf8");
  assert.ok(
    css.includes(`[data-mse-module="${moduleName}"][data-mse-view="summary"]`),
    `O resumo genérico de ${moduleName} deve ser estilizado por data-mse-view.`
  );
}

const homeCss = await readFile(new URL("../../modules/home/home.css", import.meta.url), "utf8");
assert.match(homeCss, /\[data-mse-module="home"\][^{]+\{[\s\S]*?background:\s*transparent;/);
assert.match(homeCss, /\.mse-home\s*\{[\s\S]*?background:/);

console.log("section-radius.test.js: verificações concluídas com sucesso.");
