import assert from "node:assert/strict";
import { mount as mountFull } from "../module.js";
import { mount as mountSummary } from "../summary/module.js";

assert.throws(() => mountFull({ root: {} }), /root/);
assert.throws(() => mountSummary({ root: {} }), /root/);
const root = { ownerDocument: {}, dataset: {} };
assert.throws(() => mountFull({ root, services: {} }), /serviço de dados/);
assert.throws(() => mountSummary({ root, services: {} }), /serviço de dados/);
assert.throws(
  () => mountFull({ root, services: { forum: { listTopics() {} } } }),
  /rich text/
);

console.log("forum module.test.js: verificações concluídas com sucesso.");
