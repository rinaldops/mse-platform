import assert from "node:assert/strict";
import { createModuleInstaller } from "../../admin/installer.js";

assert.throws(() => createModuleInstaller(), /schemasByModule/);
const installer = createModuleInstaller({ schemasByModule: {} });
assert.equal(installer.has("missing"), false);
assert.throws(() => installer.inspect("missing"), /Schemas não registrados/);
assert.equal(typeof installer.apply, "function");
assert.equal(typeof installer.verify, "function");

const registered = createModuleInstaller({ schemasByModule: { forum: [{}] } });
assert.equal(registered.has("forum"), true);

console.log("installer.test.js: verificações concluídas com sucesso.");
