import assert from "node:assert/strict";
import adminManifest from "../../admin/manifest.js";
import { createDefaultCatalog } from "../../admin/default-catalog.js";
import { mount } from "../../admin/module.js";

assert.equal(adminManifest.id, "mse-admin");
assert.equal(adminManifest.styles[0], "./admin.css");
assert.deepEqual(createDefaultCatalog().list().map(({ manifest }) => manifest.id), [
  "home", "forum", "videoteca", "explore-mais"
]);
assert.throws(() => mount({ root: {} }), /root/);
assert.throws(() => mount({ root: { ownerDocument: {} }, services: {} }), /configurationStore/);

console.log("admin-module.test.js: verificações concluídas com sucesso.");
