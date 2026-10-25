import assert from "node:assert/strict";
import { createEventBus } from "../events.js";
import { createExtensionLoader } from "../extension-loader.js";

function createFakeImportModule(map) {
  const calls = [];
  async function importModule(url) {
    calls.push(url);
    if (!map[url]) throw new Error(`missing module: ${url}`);
    return map[url];
  }
  return { importModule, calls };
}

// --- listEnabledByType -----------------------------------------------------

{
  const extensionsItems = [
    { Type: "Plugin", Element: "audit", ClientId: "Site", Enabled: true, Ordering: 2, ParamsJson: null },
    { Type: "Plugin", Element: "cache", ClientId: "Site", Enabled: true, Ordering: 1, ParamsJson: null },
    { Type: "Module", Element: "menu", ClientId: "Site", Enabled: true, ParamsJson: null },
    { Type: "Plugin", Element: "off", ClientId: "Site", Enabled: false, Ordering: 0, ParamsJson: null },
    { Type: "Plugin", Element: "admin-plugin", ClientId: "Administrator", Enabled: true, Ordering: 1, ParamsJson: null }
  ];

  const loader = createExtensionLoader({ coreVersion: "0.8.0", extensionsItems, importModule: async () => ({ default: {} }) });

  assert.equal(loader.listEnabledByType("Plugin", "Site").length, 2);
  assert.deepEqual(loader.listEnabledByType("Plugin", "Administrator").map((p) => p.Element), ["admin-plugin"]);
  assert.deepEqual(loader.listEnabledByType("Module", "Site").map((m) => m.Element), ["menu"]);

  console.log("extension-loader.test.js: listEnabledByType ok.");
}

// --- loadManifestForExtension (compatibility) ------------------------------

{
  const extensionsItems = [
    { Type: "Plugin", Element: "audit", ClientId: "Site", Enabled: true, Ordering: 1, ParamsJson: null }
  ];

  const base = "https://example.local/release";
  const manifestUrl = `${base}/plugins/audit/manifest.js`;
  const goodManifest = {
    id: "audit",
    displayName: "Audit",
    version: "0.1.0",
    coreCompatibility: ">=0.8.0 <2.0.0",
    stability: "preview",
    dataSchemaVersion: 0,
    settingsSchemaVersion: 1,
    permissions: ["read"],
    locales: ["pt-BR"],
    styles: [],
    type: "plugin",
    events: ["onAfterRoute"],
    entrypoints: { full: "./plugin.js" },
    capabilities: { full: true, summary: false, settings: true, provisioning: false },
    dataSources: []
  };

  const badManifest = { ...goodManifest, coreCompatibility: ">=1.0.0 <2.0.0" };

  const { importModule } = createFakeImportModule({
    [manifestUrl]: { default: goodManifest }
  });

  const loader = createExtensionLoader({
    coreVersion: "0.8.0",
    extensionsItems,
    importModule,
    resolveManifestUrl: () => manifestUrl
  });

  const loaded = await loader.loadManifestForExtension(extensionsItems[0]);
  assert.equal(loaded.manifest.id, "audit");

  const { importModule: importBad } = createFakeImportModule({
    [manifestUrl]: { default: badManifest }
  });

  const loaderBad = createExtensionLoader({
    coreVersion: "0.8.0",
    extensionsItems,
    importModule: importBad,
    resolveManifestUrl: () => manifestUrl
  });

  await assert.rejects(() => loaderBad.loadManifestForExtension(extensionsItems[0]), /incompatível/);

  console.log("extension-loader.test.js: loadManifestForExtension compatibility ok.");
}

// --- registerPlugins -------------------------------------------------------

{
  const base = "https://example.local/release";
  const extensionsItems = [
    { Type: "Plugin", Element: "cache", ClientId: "Site", Enabled: true, Ordering: 1, ParamsJson: "{\"clientId\":\"Site\"}" },
    { Type: "Plugin", Element: "audit", ClientId: "Site", Enabled: true, Ordering: 2, ParamsJson: null }
  ];

  const manifestCacheUrl = `${base}/plugins/cache/manifest.js`;
  const manifestAuditUrl = `${base}/plugins/audit/manifest.js`;
  const entryCacheUrl = `${base}/plugins/cache/plugin.js`;
  const entryAuditUrl = `${base}/plugins/audit/plugin.js`;

  const makeManifest = (id) => ({
    id,
    displayName: id,
    version: "0.1.0",
    coreCompatibility: ">=0.8.0 <2.0.0",
    stability: "preview",
    dataSchemaVersion: 0,
    settingsSchemaVersion: 1,
    permissions: ["read"],
    locales: ["pt-BR"],
    styles: [],
    type: "plugin",
    events: ["onAfterRoute"],
    entrypoints: { full: "./plugin.js" },
    capabilities: { full: true, summary: false, settings: true, provisioning: false },
    dataSources: []
  });

  const calls = [];
  const pluginCache = {
    default({ events }) {
      events.on("onAfterRoute", () => calls.push("cache"));
    }
  };
  const pluginAudit = {
    default({ events }) {
      events.on("onAfterRoute", () => calls.push("audit"));
    }
  };

  const { importModule } = createFakeImportModule({
    [manifestCacheUrl]: { default: makeManifest("cache") },
    [manifestAuditUrl]: { default: makeManifest("audit") },
    [entryCacheUrl]: pluginCache,
    [entryAuditUrl]: pluginAudit
  });

  const loader = createExtensionLoader({
    coreVersion: "0.8.0",
    extensionsItems,
    importModule,
    resolveManifestUrl: (element) => `${base}/plugins/${element}/manifest.js`,
    resolveEntrypointUrl: (element) => `${base}/plugins/${element}/plugin.js`
  });

  const bus = createEventBus();
  await loader.registerPlugins({ eventBus: bus, services: { any: true }, clientId: "Site" });
  bus.emit("onAfterRoute");

  assert.deepEqual(calls, ["cache", "audit"], "ordenação de plugins deve respeitar Ordering asc");

  console.log("extension-loader.test.js: registerPlugins ok.");
}

console.log("extension-loader.test.js: verificações concluídas com sucesso.");
