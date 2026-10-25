import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { ARTICLES_CATEGORY_MANIFEST } from "../manifest.js";
import { ARTICLES_CATEGORY_SETTINGS_SCHEMA } from "../articles-category-settings-schema.js";

const manifest = defineModuleManifest(ARTICLES_CATEGORY_MANIFEST);
assert.equal(manifest.id, "articles-category");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 2);
assert.equal(manifest.dataSources[0].internalName, "CAMAPPublicacoes");
assert.equal(manifest.dataSources[1].internalName, "MSECategories");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.settings, true);

const settings = defineSettingsSchema(ARTICLES_CATEGORY_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, [
  "categoriaId", "count", "showFront", "filterTag", "dateFiltering", "dateField",
  "startDateRange", "endDateRange", "relativeDate", "articleOrdering", "articleOrderingDirection", "showIntrotext"
]);

console.log("articles-category contract.test.js: verificações concluídas com sucesso.");
