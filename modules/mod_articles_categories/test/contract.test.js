import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { ARTICLES_CATEGORIES_MANIFEST } from "../manifest.js";
import { ARTICLES_CATEGORIES_SETTINGS_SCHEMA } from "../articles-categories-settings-schema.js";

const manifest = defineModuleManifest(ARTICLES_CATEGORIES_MANIFEST);
assert.equal(manifest.id, "articles-categories");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 2);
assert.equal(manifest.dataSources[0].internalName, "MSECategories");
assert.equal(manifest.dataSources[1].internalName, "CAMAPPublicacoes");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.settings, true);

const settings = defineSettingsSchema(ARTICLES_CATEGORIES_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["parent", "showDescription", "numitems", "showChildren", "count", "maxlevel"]);

console.log("articles-categories contract.test.js: verificações concluídas com sucesso.");
