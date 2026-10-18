import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "administrator.css");
const css = readFileSync(cssPath, "utf8");

// Decisão de design desta tarefa: "nenhum hex nu" não pode ser testado com uma
// simples "a substring #xxxxxx não aparece no arquivo" porque o fallback de
// var(--camap-x, #006298) PRECISA conter o hex original (ver passo 1 da
// tarefa — preserva o visual quando a variável não está definida). Em vez
// disso, o teste varre toda DECLARAÇÃO de propriedade relacionada a cor
// (color/background/border(-color)/outline(-color)) e confirma que, depois
// de remover as ocorrências válidas de "var(--camap-<nome>, #hex)", não resta
// nenhum hex "nu" (fora de var(...)) nessas declarações — ou seja, toda cor
// usada é sempre var(--camap-...), nunca um literal direto.

const COLOR_PROPERTY_PATTERN = /(?:^|[{;])\s*(color|background|border(?:-color)?|outline(?:-color)?)\s*:\s*([^;}]+)/g;
const VAR_WITH_HEX_FALLBACK = /var\(\s*--camap-[a-z-]+\s*,\s*#[0-9A-Fa-f]{3,8}\s*\)/g;
const BARE_HEX = /#[0-9A-Fa-f]{3,8}/;

// (1) Nenhuma declaração de cor contém um hex fora de var(--camap-..., #hex).
{
  const offending = [];
  let match;
  while ((match = COLOR_PROPERTY_PATTERN.exec(css)) !== null) {
    const [, property, rawValue] = match;
    const withoutValidVars = rawValue.replace(VAR_WITH_HEX_FALLBACK, "");
    if (BARE_HEX.test(withoutValidVars)) {
      offending.push(`${property}: ${rawValue.trim()}`);
    }
  }
  assert.deepEqual(offending, [], `declarações de cor com hex fora de var(--camap-...): ${offending.join(" | ")}`);
  console.log("administrator-css.test.js: nenhuma cor usada é hex nu (todas via var(--camap-...)) ok.");
}

// (2) Os hex antigos (CAMAP-AGP, hardcoded antes desta mudança) só aparecem
// como fallback dentro de var(--camap-..., #hex) — nunca soltos no arquivo.
{
  const oldHexValues = ["#006298", "#75787B", "#FDC82F", "#FFFFFF"];
  for (const hex of oldHexValues) {
    const occurrences = [...css.matchAll(new RegExp(hex.replace("#", "#"), "gi"))];
    for (const occurrence of occurrences) {
      const start = occurrence.index;
      const context = css.slice(Math.max(0, start - 40), start + hex.length + 2);
      assert.match(
        context,
        /var\(\s*--camap-[a-z-]+\s*,\s*#[0-9A-Fa-f]{3,8}\s*\)/i,
        `"${hex}" aparece fora de um fallback var(--camap-..., ${hex}): contexto "${context}"`
      );
    }
  }
  console.log("administrator-css.test.js: hex antigos só existem como fallback de var(--camap-...) ok.");
}

// (3) Os nomes de variável usados existem em CAMAP-AGP/theme/tokens.css
// (mesmos nomes, não inventados por este arquivo).
{
  const tokensPath = path.join(path.dirname(cssPath), "..", "..", "CAMAP-AGP", "theme", "tokens.css");
  let tokensCss = "";
  try {
    tokensCss = readFileSync(tokensPath, "utf8");
  } catch {
    // Se o checkout de CAMAP-AGP não estiver presente neste ambiente, pula
    // esta verificação adicional (as duas anteriores já garantem a
    // neutralidade do kernel; esta é só uma confirmação extra de nomenclatura).
  }
  if (tokensCss) {
    const usedVarNames = [...css.matchAll(/var\(\s*(--camap-[a-z-]+)\s*,/g)].map((m) => m[1]);
    assert.ok(usedVarNames.length > 0, "esperava pelo menos uma var(--camap-...) em administrator.css");
    for (const varName of usedVarNames) {
      assert.match(tokensCss, new RegExp(`${varName}\\s*:`), `"${varName}" não está declarado em CAMAP-AGP/theme/tokens.css`);
    }
    console.log("administrator-css.test.js: nomes de variável usados existem em CAMAP-AGP/theme/tokens.css ok.");
  }
}

console.log("administrator-css.test.js: verificações concluídas com sucesso.");
