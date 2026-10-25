import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { ARTICLES_LATEST_MANIFEST } from "../manifest.js";
import { ARTICLES_LATEST_SETTINGS_SCHEMA } from "../articles-latest-settings-schema.js";

const manifest = defineModuleManifest(ARTICLES_LATEST_MANIFEST);
assert.equal(manifest.id, "articles-latest");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 1);
assert.equal(manifest.dataSources[0].internalName, "CAMAPPublicacoes");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.settings, true);

const settings = defineSettingsSchema(ARTICLES_LATEST_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["categoriaId", "count", "showFeatured", "ordering"]);

console.log("articles-latest contract.test.js: verificações concluídas com sucesso.");
