import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { HOME_MANIFEST } from "../manifest.js";
import { HOME_SETTINGS_SCHEMA } from "../settings-schema.js";

assert.equal(defineModuleManifest(HOME_MANIFEST).capabilities.summary, false);
assert.equal(defineSettingsSchema(HOME_SETTINGS_SCHEMA).version, 4);
console.log("home contract.test.js: verificações concluídas com sucesso.");
