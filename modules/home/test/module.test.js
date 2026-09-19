import assert from "node:assert/strict";
import { normalizeSections, sectionsFromSlots } from "../module.js";

assert.deepEqual(normalizeSections(), []);
assert.deepEqual(normalizeSections([
  { id: "forum", moduleId: "forum", instanceId: "forum-home" },
  { id: "videos", moduleId: "videoteca", instanceId: "videoteca-home", enabled: false }
]), [{ id: "forum", moduleId: "forum", instanceId: "forum-home", enabled: true }]);
assert.throws(
  () => normalizeSections([{ id: "forum", moduleId: "forum", instanceId: "a" }, { id: "forum", moduleId: "videoteca", instanceId: "b" }]),
  /Seção inválida/
);
assert.deepEqual(sectionsFromSlots({
  1: { enabled: true, moduleId: "forum", instanceId: "forum-resumo" },
  2: { enabled: false, moduleId: "videoteca", instanceId: "videoteca-resumo" }
}), [
  { id: "summary-1", moduleId: "forum", instanceId: "forum-resumo", enabled: true },
  { id: "summary-2", moduleId: "videoteca", instanceId: "videoteca-resumo", enabled: false }
]);

console.log("home module.test.js: verificações concluídas com sucesso.");
