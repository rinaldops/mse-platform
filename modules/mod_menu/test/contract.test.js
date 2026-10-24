import assert from "node:assert/strict";
import { defineModuleManifest } from "../../../core/module-contract.js";
import { MENU_MANIFEST } from "../manifest.js";

const manifest = defineModuleManifest(MENU_MANIFEST);
assert.equal(manifest.id, "menu");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["menu-principal"]);
assert.equal(manifest.dataSources.length, 1);
assert.equal(manifest.dataSources[0].internalName, "MSEMenu");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.summary, true);

console.log("menu contract.test.js: verificações concluídas com sucesso.");
