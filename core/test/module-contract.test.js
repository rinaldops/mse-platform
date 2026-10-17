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

// manifesto v1 sem `type`: tratado como "component" com views.full implícito
assert.equal(manifest.type, "component");
assert.deepEqual(manifest.views, { full: true });
assert.equal(manifest.routeParams, undefined);
assert.equal(manifest.positions, undefined);
assert.equal(manifest.events, undefined);

// type: "component" com views e routeParams explícitos
const componentManifest = defineModuleManifest({
  ...manifest,
  type: "component",
  views: { list: true, article: true, featured: false },
  routeParams: ["id", "slug"]
});
assert.equal(componentManifest.type, "component");
assert.deepEqual(componentManifest.views, { list: true, article: true });
assert.deepEqual(componentManifest.routeParams, ["id", "slug"]);
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "component", views: {} }),
  /views deve possuir ao menos uma visão habilitada/
);
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "component", views: { featured: false } }),
  /views deve possuir ao menos uma visão habilitada/
);

// type: "module" com positions e params
const moduleManifest = defineModuleManifest({
  ...manifest,
  type: "module",
  positions: ["hero", "home-a"],
  params: {
    version: 1,
    groups: [{ id: "content", label: "Content", fields: [{ id: "title", type: "text", label: "Título" }] }]
  }
});
assert.equal(moduleManifest.type, "module");
assert.deepEqual(moduleManifest.positions, ["hero", "home-a"]);
assert.equal(moduleManifest.params.version, 1);
assert.ok(Object.isFrozen(moduleManifest.params));
assert.equal(moduleManifest.views, undefined);

// type: "module" sem params (opcional)
const moduleManifestNoParams = defineModuleManifest({ ...manifest, type: "module", positions: ["hero"] });
assert.equal(moduleManifestNoParams.params, undefined);

// type: "module" sem positions deve lançar erro
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "module" }),
  /positions deve ser um array não vazio/
);
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "module", positions: [] }),
  /positions deve ser um array não vazio/
);

// type: "plugin" com events
const pluginManifest = defineModuleManifest({
  ...manifest,
  type: "plugin",
  events: ["afterRoute", "beforeRender", "afterRender"]
});
assert.equal(pluginManifest.type, "plugin");
assert.deepEqual(pluginManifest.events, ["afterRoute", "beforeRender", "afterRender"]);
assert.equal(pluginManifest.views, undefined);

// type: "plugin" sem events deve lançar erro
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "plugin" }),
  /events deve ser um array não vazio/
);
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "plugin", events: [] }),
  /events deve ser um array não vazio/
);

// type inválido deve lançar erro claro
assert.throws(
  () => defineModuleManifest({ ...manifest, type: "widget" }),
  /type deve ser "component", "module" ou "plugin"/
);

const settings = defineSettingsSchema({
  version: 1,
  groups: [{
    id: "content",
    label: "Content",
    fields: [
      { id: "layout.mode", type: "select", label: "Layout", options: ["contained", "fullBleed"], optionLabels: { contained: "Contido", fullBleed: "Largura total" }, default: "contained" },
      { id: "pageSize", type: "number", label: "Page size", min: 1, max: 100, default: 20 },
      { id: "accent", type: "color", label: "Accent", default: "#FDC82F" },
      { id: "enabled", type: "boolean", label: "Enabled", default: true }
    ]
  }]
});
assert.ok(Object.isFrozen(settings.groups[0].fields));
assert.equal(settings.groups[0].fields[0].optionLabels.fullBleed, "Largura total");
assert.deepEqual(settingsDefaults(settings), { "layout.mode": "contained", pageSize: 20, accent: "#FDC82F", enabled: true });
assert.throws(() => defineSettingsSchema({ version: 1, groups: [] }), /grupos/);

console.log("module-contract.test.js: verificações concluídas com sucesso.");
