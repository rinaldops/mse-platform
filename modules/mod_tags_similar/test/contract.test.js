import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { TAGS_SIMILAR_MANIFEST } from "../manifest.js";
import { TAGS_SIMILAR_SETTINGS_SCHEMA } from "../similar-settings-schema.js";

const manifest = defineModuleManifest(TAGS_SIMILAR_MANIFEST);
assert.equal(manifest.id, "tags-similar");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 2);
assert.equal(manifest.dataSources[0].internalName, "MSEPublicacoes");
assert.equal(manifest.dataSources[1].internalName, "MSETags");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.summary, true);

const settings = defineSettingsSchema(TAGS_SIMILAR_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["maximum", "matchType", "ordering", "noResultsText"]);

console.log("tags-similar contract.test.js: verificações concluídas com sucesso.");
