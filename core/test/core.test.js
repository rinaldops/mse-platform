import assert from "node:assert/strict";
import {
  CORE_VERSION,
  ConfigurationLoadError,
  disposeModule,
  loadSharePointConfiguration,
  mountModule,
  resolveConfig
} from "../core.js";
import { createSharePointThemeConfig } from "../theme-adapter.js";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, enabled) {
    if (enabled) this.values.add(name);
    else this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, value);
  }

  removeProperty(name) {
    this.values.delete(name);
  }

  getPropertyValue(name) {
    return this.values.get(name) || "";
  }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.style = new FakeStyle();
    this.attributes = new Map();
    this.children = [];
    this.className = "";
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

let selectedRoots = [];
globalThis.document = {
  querySelectorAll: () => selectedRoots,
  createElement: () => new FakeElement()
};

const globalConfig = {
  title: "global",
  theme: { tokens: { colorPrimary: "#123456" } }
};
const moduleDefaults = { title: "module" };
const instanceConfig = { title: "instance", layout: { mode: "fullBleed" } };
const resolved = resolveConfig({ globalConfig, moduleDefaults, instanceConfig });

assert.equal(CORE_VERSION, "0.13.2");
assert.equal(resolved.title, "instance");
assert.equal(resolved.layout.mode, "fullBleed");
assert.equal(resolved.theme.tokens.colorPrimary, "#123456");
assert.ok(Object.isFrozen(resolved));
assert.ok(Object.isFrozen(resolved.layout));
assert.deepEqual(globalConfig, {
  title: "global",
  theme: { tokens: { colorPrimary: "#123456" } }
});
assert.throws(
  () => resolveConfig({ instanceConfig: { layout: { mode: "invalid" } } }),
  /layout\.mode/
);
assert.throws(
  () => resolveConfig({ instanceConfig: { theme: { tokens: { unknown: "x" } } } }),
  /Token de tema desconhecido/
);
assert.throws(
  () => resolveConfig({
    instanceConfig: { theme: { tokens: { colorPrimary: "url(javascript:x)" } } }
  }),
  /Valor inseguro/
);

const root = new FakeElement("demo");
root.dataset.configKey = "demo";
selectedRoots = [root];
let renderCount = 0;
let cleanupCount = 0;

const options = {
  name: "demo",
  selector: '[data-mse-module="demo"]',
  globalConfig,
  instances: { demo: instanceConfig },
  render({ root: mountedRoot, config }) {
    renderCount += 1;
    assert.equal(mountedRoot, root);
    assert.equal(config.title, "instance");
    return () => cleanupCount += 1;
  }
};

const firstMount = await mountModule(options);
assert.equal(firstMount.mounted.length, 1);
assert.equal(renderCount, 1);
assert.equal(root.dataset.mseState, "ready");
assert.ok(root.classList.contains("mse-app--full-bleed"));
assert.equal(root.style.getPropertyValue("--mse-color-primary"), "#123456");
assert.equal(root.style.getPropertyValue("--mse-color-muted"), "#616161");

const duplicateMount = await mountModule(options);
assert.equal(duplicateMount.skipped.length, 1);
assert.equal(renderCount, 1);

await disposeModule(root);
assert.equal(cleanupCount, 1);
assert.equal(root.dataset.mseInitialized, undefined);
assert.ok(!root.classList.contains("mse-app--full-bleed"));
assert.equal(root.style.getPropertyValue("--mse-color-primary"), "");

const sharePointThemeConfig = createSharePointThemeConfig({
  themePrimary: "#008542",
  themeDarkAlt: "#00773c",
  themeLighterAlt: "#f0faf5",
  bodyText: "#323130",
  bodySubtext: "#605e5c",
  bodyBackground: "#ffffff",
  neutralQuaternary: "#d0d0d0",
  mediumFontFamily: "'Segoe UI'",
  mediumFontSize: "14px",
  elevation4: "0 1px 2px rgba(0,0,0,.14)",
  roundedCorner6: "6px"
});
assert.equal(sharePointThemeConfig.theme.tokens.colorPrimary, "#008542");
assert.equal(sharePointThemeConfig.theme.tokens.colorMuted, "#605e5c");
assert.equal(sharePointThemeConfig.theme.tokens.fontFamily, "'Segoe UI'");

await mountModule(options);
assert.equal(renderCount, 2);

const failingRoot = new FakeElement("failing");
selectedRoots = [failingRoot];
const failedMount = await mountModule({
  name: "failing",
  selector: '[data-mse-module="failing"]',
  render() {
    throw new Error("falha controlada");
  }
});
assert.equal(failedMount.failed.length, 1);
assert.equal(failingRoot.dataset.mseState, "error");
assert.equal(failingRoot.children[0].attributes.get("role"), "alert");
assert.equal(failingRoot.children[0].textContent, "Não foi possível carregar este módulo.");

function response(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return value;
    }
  };
}

const listItems = [
  {
    Title: "global",
    Escopo: "Global",
    Layout: "Contained",
    Tema: "default",
    ConfiguracaoJson: JSON.stringify({
      theme: { tokens: { colorPrimary: "#008542" } },
      source: "global"
    }),
    Ativo: true
  },
  {
    Title: "forum-home",
    Escopo: "Instancia",
    Modulo: "forum",
    Layout: "FullBleed",
    ConfiguracaoJson: JSON.stringify({ source: "instance", pageSize: 20 }),
    Ativo: true
  },
  {
    Title: "forum-inativo",
    Escopo: "Instancia",
    Modulo: "forum",
    Layout: "Herdar",
    ConfiguracaoJson: "{}",
    Ativo: false
  }
];

let fetchCount = 0;
const fetchConfig = async (url, options) => {
  fetchCount += 1;
  assert.match(url, /MSEConfiguracoes/);
  assert.equal(options.headers.Accept, "application/json;odata=nometadata");
  return response(200, { value: listItems });
};

const loadedConfig = await loadSharePointConfiguration({
  webUrl: "/sites/core-test",
  fetchImpl: fetchConfig
});
const cachedConfig = await loadSharePointConfiguration({
  webUrl: "/sites/core-test",
  fetchImpl: fetchConfig
});

assert.equal(fetchCount, 1);
assert.equal(cachedConfig, loadedConfig);
assert.equal(loadedConfig.globalConfig.layout.mode, "contained");
assert.equal(loadedConfig.globalConfig.theme.name, "default");
assert.equal(loadedConfig.globalConfig.theme.tokens.colorPrimary, "#008542");
assert.equal(loadedConfig.instancesByModule.forum["forum-home"].layout.mode, "fullBleed");
assert.equal(loadedConfig.instancesByModule.forum["forum-home"].pageSize, 20);
assert.equal(loadedConfig.instancesByModule.forum["forum-inativo"], undefined);
assert.ok(Object.isFrozen(loadedConfig.instancesByModule.forum));

const listResolved = resolveConfig({
  globalConfig: loadedConfig.globalConfig,
  moduleDefaults: { source: "module" },
  instanceConfig: loadedConfig.instancesByModule.forum["forum-home"]
});
assert.equal(listResolved.source, "instance");
assert.equal(listResolved.layout.mode, "fullBleed");

for (const [status, code] of [[404, "list-not-found"], [403, "access-denied"]]) {
  await assert.rejects(
    loadSharePointConfiguration({
      webUrl: `/sites/error-${status}`,
      fetchImpl: async () => response(status, {})
    }),
    (error) => error instanceof ConfigurationLoadError && error.code === code
  );
}

let networkAttempts = 0;
const failingFetch = async () => {
  networkAttempts += 1;
  throw new Error("offline");
};
for (const attempt of [1, 2]) {
  await assert.rejects(
    loadSharePointConfiguration({
      webUrl: "/sites/network-retry",
      fetchImpl: failingFetch
    }),
    (error) => error.code === "network-error"
  );
  assert.equal(networkAttempts, attempt);
}

await assert.rejects(
  loadSharePointConfiguration({
    webUrl: "/sites/invalid-json",
    fetchImpl: async () => response(200, {
      value: [{
        Title: "global",
        Escopo: "Global",
        Layout: "Herdar",
        ConfiguracaoJson: "{",
        Ativo: true
      }]
    })
  }),
  (error) => error.code === "invalid-config" && error.configKey === "global"
);

console.log("core.test.js: verificações concluídas com sucesso.");
