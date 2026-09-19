import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { FORUM_MANIFEST } from "../manifest.js";
import { FORUM_SETTINGS_SCHEMA } from "../settings-schema.js";

assert.equal(defineModuleManifest(FORUM_MANIFEST).id, "forum");
assert.equal(defineSettingsSchema(FORUM_SETTINGS_SCHEMA).version, 1);
console.log("forum contract.test.js: verificações concluídas com sucesso.");
