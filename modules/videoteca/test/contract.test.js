import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema } from "../../../core/module-contract.js";
import { VIDEOTECA_MANIFEST } from "../manifest.js";
import { VIDEOTECA_SETTINGS_SCHEMA } from "../settings-schema.js";

assert.equal(defineModuleManifest(VIDEOTECA_MANIFEST).id, "videoteca");
assert.equal(defineSettingsSchema(VIDEOTECA_SETTINGS_SCHEMA).version, 1);
console.log("videoteca contract.test.js: verificações concluídas com sucesso.");
