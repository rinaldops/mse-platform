import assert from "node:assert/strict";
import { defineModuleManifest } from "../../../core/module-contract.js";
import { BREADCRUMBS_MANIFEST } from "../manifest.js";

const manifest = defineModuleManifest(BREADCRUMBS_MANIFEST);
assert.equal(manifest.id, "breadcrumbs");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["breadcrumbs"]);
assert.equal(manifest.dataSources.length, 1);
assert.equal(manifest.dataSources[0].internalName, "MSEMenu");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.summary, true);

console.log("breadcrumbs contract.test.js: verificações concluídas com sucesso.");
