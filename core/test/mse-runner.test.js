import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../../host-adapters/modern-script-editor/runner.js", import.meta.url), "utf8");
const errors = [];
const attributes = {
  "data-release-base": "/sites/demo/SiteAssets/mse-platform/releases/1.0.3",
  "data-core-version": "0.8.0",
  "data-enabled-modules": "forum",
  "data-mse-instance": "forum-principal"
};
const original = {
  src: `${attributes["data-release-base"]}/host-adapters/modern-script-editor/runner.js?mseInstance=forum-principal`,
  getAttribute: (name) => attributes[name] ?? null
};
const pnpCopy = {
  src: `${original.src}?pnp=1`,
  getAttribute: () => null
};
const context = vm.createContext({
  document: {
    currentScript: pnpCopy,
    baseURI: "https://example.invalid/",
    getElementsByTagName: () => [original, pnpCopy],
    querySelector: () => ({ dataset: { mseInstance: "forum-principal" } })
  },
  console: { error: (...args) => errors.push(args.map(String).join(" ")) }
});

new vm.Script(source, {
  importModuleDynamically: async () => { throw new Error("import reached"); }
}).runInContext(context);
await new Promise((resolve) => setImmediate(resolve));

assert.equal(errors.some((message) => message.includes("data-release-base é obrigatório")), false);
assert.equal(errors.some((message) => message.includes("import reached")), true);
console.log("mse-runner.test.js: verificações concluídas com sucesso.");
