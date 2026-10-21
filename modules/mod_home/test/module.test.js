import assert from "node:assert/strict";
import { normalizeSections, resolveHomeStats, sectionsFromSlots } from "../module.js";

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
assert.deepEqual(await resolveHomeStats(null, {
  metrics: { itemCount: async (key) => key === "videoteca-videos" ? 55 : 69 }
}), [
  { value: "17", label: "ENCONTROS REALIZADOS" },
  { value: "1×/mês", label: "ENCONTRO AO VIVO" },
  { value: "55", label: "APRESENTAÇÕES REALIZADAS" },
  { value: "69", label: "MENSAGENS NO FÓRUM" }
]);

console.log("home module.test.js: verificações concluídas com sucesso.");
