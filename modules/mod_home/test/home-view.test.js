import assert from "node:assert/strict";
import { highlightedTitleParts, normalizeStats, DEFAULT_STATS } from "../home-view.js";

assert.deepEqual(normalizeStats(), DEFAULT_STATS);
assert.deepEqual(normalizeStats([]), DEFAULT_STATS);
assert.deepEqual(normalizeStats("nao-array"), DEFAULT_STATS);

const custom = [{ value: "12", label: "MÓDULOS" }, { value: "sem label" }];
assert.deepEqual(normalizeStats(custom), [{ value: "12", label: "MÓDULOS" }]);

assert.deepEqual(highlightedTitleParts("Tecnologia que conecta. Pessoas que transformam.", {
  primary: { text: "conecta", colorRole: "accentPrimary" },
  secondary: { text: "transformam", colorRole: "accentSecondary" }
}).map(({ text, colorRole }) => ({ text, colorRole })), [
  { text: "Tecnologia que ", colorRole: undefined },
  { text: "conecta", colorRole: "accentPrimary" },
  { text: ". Pessoas que ", colorRole: undefined },
  { text: "transformam", colorRole: "accentSecondary" },
  { text: ".", colorRole: undefined }
]);
assert.deepEqual(highlightedTitleParts("Título sem correspondência", {
  primary: { text: "ausente", colorRole: "accentPrimary" }
}), [{ text: "Título sem correspondência" }]);
assert.equal(highlightedTitleParts("transformam", {
  primary: { text: "transformam", colorRole: "custom", customColor: "red" }
})[0].customColor, "");
assert.equal(highlightedTitleParts("Power Platform", {
  primary: { text: "Power Platform", colorRole: "accentPrimary" },
  secondary: { text: "Platform", colorRole: "accentSecondary" }
}).filter((part) => part.colorRole).length, 1);

console.log("home-view.test.js: verificações concluídas com sucesso.");
