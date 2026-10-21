import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { RECURSOS_MANIFEST } from "../manifest.js";
import { RECURSOS_SETTINGS_SCHEMA } from "../settings-schema.js";

assert.equal(defineModuleManifest(RECURSOS_MANIFEST).id, "explore-mais");
assert.equal(defineSettingsSchema(RECURSOS_SETTINGS_SCHEMA).version, 2);
console.log("recursos contract.test.js: verificações concluídas com sucesso.");
