import assert from "node:assert/strict";
import { mount as mountFull } from "../module.js";
import { mount as mountSummary } from "../summary/module.js";

assert.throws(() => mountFull({ root: {} }), /root/);
assert.throws(() => mountSummary({ root: {} }), /root/);
const root = { ownerDocument: {} };
assert.throws(() => mountFull({ root, services: {} }), /serviço de leitura/);
assert.throws(() => mountSummary({ root, services: {} }), /serviço de leitura/);
assert.equal(typeof mountFull, "function");
assert.equal(typeof mountSummary, "function");

console.log("videoteca module.test.js: verificações concluídas com sucesso.");
