import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { FOOTER_MANIFEST } from "../manifest.js";
import { FOOTER_SETTINGS_SCHEMA } from "../footer-settings-schema.js";

const manifest = defineModuleManifest(FOOTER_MANIFEST);
assert.equal(manifest.id, "footer");
assert.equal(manifest.type, "module");
assert.deepEqual(manifest.positions, ["rodape"]);
assert.equal(manifest.dataSources.length, 0);
assert.equal(manifest.entrypoints.full, "./module.js");
assert.equal(manifest.entrypoints.summary, "./module.js");

const settings = defineSettingsSchema(FOOTER_SETTINGS_SCHEMA);
assert.equal(settings.version, 1);
const fieldIds = settings.groups.flatMap((group) => group.fields.map((field) => field.id));
assert.deepEqual(fieldIds, ["copyrightText", "showYear"]);

console.log("footer contract.test.js: verificações concluídas com sucesso.");
