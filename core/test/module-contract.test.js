import assert from "node:assert/strict";
import { defineModuleManifest, defineSettingsSchema, settingsDefaults } from "../module-contract.js";

const manifest = defineModuleManifest({
  id: "sample-module",
  displayName: "Sample Module",
  version: "1.0.0",
  coreCompatibility: ">=1.0.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 1,
  capabilities: { full: true, summary: true, settings: true, provisioning: true },
  entrypoints: { full: "./module.js", summary: "./summary/module.js" }
});
assert.ok(Object.isFrozen(manifest));
assert.equal(manifest.capabilities.summary, true);
assert.throws(() => defineModuleManifest({ ...manifest, version: "latest" }), /SemVer/);
assert.throws(
  () => defineModuleManifest({ ...manifest, capabilities: { summary: true }, entrypoints: { full: "./module.js" } }),
  /entrypoints.summary/
);

const settings = defineSettingsSchema({
  version: 1,
  groups: [{
    id: "content",
    label: "Content",
    fields: [
      { id: "layout.mode", type: "select", label: "Layout", options: ["contained", "fullBleed"], default: "contained" },
      { id: "pageSize", type: "number", label: "Page size", min: 1, max: 100, default: 20 },
      { id: "enabled", type: "boolean", label: "Enabled", default: true }
    ]
  }]
});
assert.ok(Object.isFrozen(settings.groups[0].fields));
assert.deepEqual(settingsDefaults(settings), { "layout.mode": "contained", pageSize: 20, enabled: true });
assert.throws(() => defineSettingsSchema({ version: 1, groups: [] }), /grupos/);

console.log("module-contract.test.js: verificações concluídas com sucesso.");
