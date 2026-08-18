import assert from "node:assert/strict";
import { normalizeStats, DEFAULT_STATS } from "../home-view.js";

assert.deepEqual(normalizeStats(), DEFAULT_STATS);
assert.deepEqual(normalizeStats([]), DEFAULT_STATS);
assert.deepEqual(normalizeStats("nao-array"), DEFAULT_STATS);

const custom = [{ value: "12", label: "MÓDULOS" }, { value: "sem label" }];
assert.deepEqual(normalizeStats(custom), [{ value: "12", label: "MÓDULOS" }]);

console.log("home-view.test.js: verificações concluídas com sucesso.");
