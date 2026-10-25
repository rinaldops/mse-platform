import assert from "node:assert/strict";
import { defineExtensionContract, supportsCore } from "../extension-contract.js";

// component defaults
const component = defineExtensionContract({
  id: "com-example",
  type: "component",
  version: "1.0.0",
  coreCompatibility: ">=1.0.0 <2.0.0",
  entrypoints: { full: "./component.js" }
});
assert.equal(component.type, "component");
assert.deepEqual(component.views, { full: true });
assert.equal(component.entrypoints.full, "./component.js");
assert.ok(Object.isFrozen(component));

// component with views and route params
const component2 = defineExtensionContract({
  id: "com-content",
  type: "component",
  displayName: "Content",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  entrypoints: { full: "./component.js" },
  views: { list: true, article: true, featured: false },
  routeParams: ["id", "slug", "id"]
});
assert.deepEqual(component2.views, { list: true, article: true });
assert.deepEqual(component2.routeParams, ["id", "slug"]);

// module requires positions
assert.throws(
  () => defineExtensionContract({
    id: "menu",
    type: "module",
    version: "0.1.0",
    coreCompatibility: ">=0.8.0 <2.0.0",
    entrypoints: { full: "./module.js" }
  }),
  /positions/
);
const module = defineExtensionContract({
  id: "menu",
  type: "module",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  entrypoints: { full: "./module.js", summary: "./module.js" },
  positions: ["menu-principal", "menu-principal"]
});
assert.deepEqual(module.positions, ["menu-principal"]);

// plugin requires events
assert.throws(
  () => defineExtensionContract({
    id: "installer-core",
    type: "plugin",
    version: "1.0.0",
    coreCompatibility: ">=1.0.0 <2.0.0",
    entrypoints: { full: "./plugin.js" }
  }),
  /events/
);
const plugin = defineExtensionContract({
  id: "installer-core",
  type: "plugin",
  version: "1.0.0",
  coreCompatibility: ">=1.0.0 <2.0.0",
  entrypoints: { full: "./plugin.js" },
  events: ["onInstallerInspect", "onInstallerVerify"]
});
assert.deepEqual(plugin.events, ["onInstallerInspect", "onInstallerVerify"]);

// invalid type
assert.throws(
  () => defineExtensionContract({
    id: "x",
    type: "widget",
    version: "1.0.0",
    coreCompatibility: ">=1.0.0 <2.0.0",
    entrypoints: { full: "./x.js" }
  }),
  /type deve ser/
);

// supportsCore minimal
assert.equal(supportsCore(">=0.8.0 <2.0.0", "0.8.0"), true);
assert.equal(supportsCore(">=0.8.0 <2.0.0", "2.0.0"), false);
assert.equal(supportsCore(">=0.8.0 <2.0.0", "invalid"), false);

console.log("extension-contract.test.js: ok");


