import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { RELATED_ITEMS_MANIFEST } from "../manifest.js";
import { RELATED_ITEMS_SETTINGS_SCHEMA } from "../related-settings-schema.js";

const manifest = defineModuleManifest(RELATED_ITEMS_MANIFEST);
assert.equal(manifest.id, "related-items");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 1);
assert.equal(manifest.dataSources[0].internalName, "MSEPublicacoes");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.summary, true);

const settings = defineSettingsSchema(RELATED_ITEMS_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["maximum", "showDate", "noResultsText"]);

console.log("related-items contract.test.js: verificações concluídas com sucesso.");
