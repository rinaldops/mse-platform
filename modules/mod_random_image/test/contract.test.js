import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { RANDOM_IMAGE_MANIFEST } from "../manifest.js";
import { RANDOM_IMAGE_SETTINGS_SCHEMA } from "../random-settings-schema.js";

const manifest = defineModuleManifest(RANDOM_IMAGE_MANIFEST);
assert.equal(manifest.id, "random-image");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["lateral"]);
assert.equal(manifest.dataSources.length, 1);
assert.equal(manifest.dataSources[0].internalName, "MSEMedia");
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");
assert.equal(manifest.capabilities.summary, true);

const settings = defineSettingsSchema(RANDOM_IMAGE_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["extensions", "link", "maxWidth", "noImageText"]);

console.log("random-image contract.test.js: verificações concluídas com sucesso.");
