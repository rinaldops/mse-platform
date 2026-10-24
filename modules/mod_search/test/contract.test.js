import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { SEARCH_MANIFEST } from "../manifest.js";
import { SEARCH_SETTINGS_SCHEMA } from "../search-settings-schema.js";

const manifest = defineModuleManifest(SEARCH_MANIFEST);
assert.equal(manifest.id, "search");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 0);
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");

const settings = defineSettingsSchema(SEARCH_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["placeholder", "maxResults"]);

console.log("search contract.test.js: verificações concluídas com sucesso.");
