import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { TAGS_POPULAR_MANIFEST } from "../manifest.js";
import { TAGS_POPULAR_SETTINGS_SCHEMA } from "../popular-settings-schema.js";

const manifest = defineModuleManifest(TAGS_POPULAR_MANIFEST);
assert.equal(manifest.id, "tags-popular");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 2);
assert.equal(manifest.dataSources[0].internalName, "MSEPublicacoes");
assert.equal(manifest.dataSources[1].internalName, "MSETags");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.summary, true);

const settings = defineSettingsSchema(TAGS_POPULAR_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, [
  "maximum", "timeframe", "orderValue", "orderDirection", "displayCount", "noResultsText", "cloud", "minSize", "maxSize"
]);

console.log("tags-popular contract.test.js: verificações concluídas com sucesso.");
