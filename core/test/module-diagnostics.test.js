import assert from "node:assert/strict";
import { diagnoseModuleInstallation } from "../module-diagnostics.js";

const manifest = {
  id: "diagnostic-sample",
  displayName: "Diagnostic Sample",
  version: "1.0.0",
  coreCompatibility: ">=0.8.0 <1.0.0",
  dataSchemaVersion: 1,
  settingsSchemaVersion: 1,
  capabilities: { full: true, settings: true, provisioning: true },
  entrypoints: { full: "./module.js" },
  dataSources: [
    { key: "items", type: "list", internalName: "SampleItems", displayName: "Sample - Items" },
    { key: "files", type: "library", internalName: "SampleFiles", displayName: "Sample - Files" }
  ]
};
const client = {
  request: async () => ({ data: { value: [
    { Id: "list-id", BaseTemplate: 100, RootFolder: { Name: "SampleItems" } }
  ] } })
};
const diagnostic = await diagnoseModuleInstallation({ manifest, client });
assert.equal(diagnostic.status, "installation-required");
assert.equal(diagnostic.sources[0].status, "ready");
assert.equal(diagnostic.sources[1].status, "missing");
assert.ok(Object.isFrozen(diagnostic.sources));

const conflict = await diagnoseModuleInstallation({
  manifest,
  client: { request: async () => ({ data: { value: [
    { Id: "wrong", BaseTemplate: 101, RootFolder: { Name: "SampleItems" } },
    { Id: "files", BaseTemplate: 101, RootFolder: { Name: "SampleFiles" } }
  ] } }) }
});
assert.equal(conflict.status, "conflict");

console.log("module-diagnostics.test.js: verificações concluídas com sucesso.");
