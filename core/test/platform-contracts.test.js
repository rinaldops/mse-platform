import assert from "node:assert/strict";
import { createModuleCatalog } from "../../admin/catalog.js";
import { epubSettingsGroups } from "../epub-settings.js";
import { settingsDefaults } from "../module-contract.js";
import { expandSettings, getSettingValue, setSettingValue } from "../../admin/settings-renderer.js";
import { mountAllMseModules, mountMseModule, supportsCore, unmountMseModule } from "../../host-adapters/modern-script-editor/bootstrap.js";
import sampleManifest from "../../examples/sample-module/manifest.js";
import sampleSettings from "../../examples/sample-module/settings-schema.js";
import forumManifestDefault, { FORUM_MANIFEST } from "../../modules/forum/manifest.js";
import homeManifestDefault, { HOME_MANIFEST } from "../../modules/home/manifest.js";
import recursosManifestDefault, { RECURSOS_MANIFEST } from "../../modules/recursos/manifest.js";
import videotecaManifestDefault, { VIDEOTECA_MANIFEST } from "../../modules/videoteca/manifest.js";

const nested = setSettingValue({}, "summary.pageSize", 8);
assert.deepEqual(nested, { summary: { pageSize: 8 } });
assert.equal(getSettingValue(nested, "summary.pageSize"), 8);
assert.deepEqual(expandSettings({ "layout.mode": "contained", title: "Exemplo" }), {
  layout: { mode: "contained" },
  title: "Exemplo"
});
const epubDefaults = expandSettings(settingsDefaults({ version: 1, groups: epubSettingsGroups("Exemplo") }));
assert.equal(epubDefaults.title.visible, false);
assert.equal(epubDefaults.title.text, "Exemplo");
assert.equal(epubDefaults.theme.name, "Standard");
assert.equal(epubDefaults.layout.gridGap, 16);

const catalog = createModuleCatalog([{ manifest: sampleManifest, settingsSchema: sampleSettings }]);
assert.equal(catalog.list().length, 1);
assert.equal(catalog.get("sample").manifest.displayName, "Módulo de exemplo");
assert.throws(
  () => createModuleCatalog([
    { manifest: sampleManifest, settingsSchema: sampleSettings },
    { manifest: sampleManifest, settingsSchema: sampleSettings }
  ]),
  /duplicado/
);

assert.equal(supportsCore(">=0.8.0 <1.0.0", "0.8.0"), true);
assert.equal(supportsCore(">=0.8.0 <1.0.0", "1.0.0"), false);
assert.equal(forumManifestDefault, FORUM_MANIFEST);
assert.equal(homeManifestDefault, HOME_MANIFEST);
assert.equal(recursosManifestDefault, RECURSOS_MANIFEST);
assert.equal(videotecaManifestDefault, VIDEOTECA_MANIFEST);

let disposed = false;
function classList() {
  const values = new Set();
  return { add: (...items) => items.forEach((item) => values.add(item)), remove: (...items) => items.forEach((item) => values.delete(item)), toggle: (item, force) => force ? values.add(item) : values.delete(item), contains: (item) => values.has(item) };
}
const root = {
  dataset: {
    mseModule: "sample",
    mseInstance: "sample-home",
    mseManifest: "https://example.test/sample/manifest.js"
  },
  classList: classList(),
  replaceChildren() {}
};
const result = await mountMseModule(root, {
  coreVersion: "0.8.0",
  importModule: async (url) => url.endsWith("manifest.js")
    ? { default: sampleManifest }
    : { mount: ({ context }) => ({ dispose: () => { disposed = context.instanceId === "sample-home"; } }) }
});
assert.equal(result.context.host, "modern-script-editor");
await unmountMseModule(root);
assert.equal(disposed, true);

let serverRelativeImport;
await mountMseModule({
  dataset: {
    mseModule: "sample",
    mseInstance: "sample-relative",
    mseManifest: "/teams/demo/SiteAssets/mse-platform/releases/0.8.2/examples/sample-module/manifest.js"
  },
  ownerDocument: { baseURI: "https://example.test/teams/demo/SitePages/Home.aspx" },
  classList: classList(),
  replaceChildren() {}
}, {
  coreVersion: "0.8.0",
  importModule: async (url) => {
    serverRelativeImport ??= url;
    return url.endsWith("manifest.js") ? { default: sampleManifest } : { mount: () => ({}) };
  }
});
assert.equal(
  serverRelativeImport,
  "https://example.test/teams/demo/SiteAssets/mse-platform/releases/0.8.2/examples/sample-module/manifest.js"
);

await mountMseModule({
  dataset: { mseModule: "admin", mseInstance: "admin", mseManifest: "https://example.test/admin/manifest.js" },
  classList: classList(),
  replaceChildren() {}
}, {
  coreVersion: "0.8.0",
  configurationStore: { load: async () => { throw new Error("configuration must not load"); } },
  importModule: async (url) => url.endsWith("manifest.js")
    ? { default: { ...sampleManifest, id: "admin", capabilities: { ...sampleManifest.capabilities, settings: false } } }
    : { mount: () => ({}) }
});

const roots = [
  { ...root, classList: classList(), dataset: { ...root.dataset }, replaceChildren() {} },
  { ...root, classList: classList(), dataset: { ...root.dataset, mseInstance: "sample-second" }, replaceChildren() {} }
];
const allResults = await mountAllMseModules({
  document: { querySelectorAll: () => roots },
  coreVersion: "0.8.0",
  configurationStore: { load: async ({ instanceId }) => ({ instanceId }) },
  importModule: async (url) => url.endsWith("manifest.js")
    ? { default: sampleManifest }
    : { mount: ({ config }) => ({ dispose: () => config.instanceId }) }
});
assert.equal(allResults.length, 2);
assert.equal(allResults.every((result) => result.status === "fulfilled"), true);

let summaryContext;
const homeRoot = {
  dataset: { mseModule: "home", mseInstance: "home", mseManifest: "https://example.test/home/manifest.js" },
  classList: classList(),
  replaceChildren() {}
};
await mountMseModule(homeRoot, {
  coreVersion: "0.8.0",
  manifestResolver: async (moduleId) => `https://example.test/${moduleId}/manifest.js`,
  importModule: async (url) => {
    if (url.endsWith("home/manifest.js")) return { default: { ...sampleManifest, id: "home", entrypoints: { full: "./module.js" } } };
    if (url.endsWith("sample/manifest.js")) return { default: { ...sampleManifest, capabilities: { ...sampleManifest.capabilities, summary: true }, entrypoints: { ...sampleManifest.entrypoints, summary: "./summary.js" } } };
    if (url.endsWith("home/module.js")) return { mount: async ({ services }) => {
      const summaryRoot = { dataset: {}, classList: classList(), replaceChildren() {} };
      await services.host.mountSummary({ root: summaryRoot, moduleId: "sample", instanceId: "sample-home" });
      return {};
    } };
    return { mount: ({ context }) => { summaryContext = context; return {}; } };
  }
});
assert.equal(summaryContext.instanceId, "sample-home");

console.log("platform contracts tests passed");
