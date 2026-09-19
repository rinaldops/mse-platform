import assert from "node:assert/strict";
import { generateMseSnippet } from "../../admin/snippet-generator.js";

const snippet = generateMseSnippet({
  moduleId: "explore-mais",
  instanceId: "explore-home",
  view: "summary",
  releaseBase: "/sites/demo/SiteAssets/mse-platform/releases/0.8.1"
});
assert.match(snippet, /modules\/recursos\/manifest\.js/);
assert.match(snippet, /data-mse-view="summary"/);
assert.match(snippet, /coreVersion: "0\.8\.0"/);
assert.throws(
  () => generateMseSnippet({ moduleId: "forum", instanceId: "bad id", releaseBase: "/sites/demo" }),
  /instanceId inválido/
);
assert.throws(
  () => generateMseSnippet({ moduleId: "unknown", instanceId: "test", releaseBase: "/sites/demo" }),
  /não registrado/
);

console.log("snippet-generator.test.js: verificações concluídas com sucesso.");
