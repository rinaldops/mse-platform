import assert from "node:assert/strict";
import { resolveRuntimeConfig } from "../runtime-config.js";

const config = resolveRuntimeConfig({
  module: { layout: { mode: "fullBleed" } },
  instance: { theme: { tokens: { colorPrimary: "#005ea8" } } }
});
assert.equal(config.layout.mode, "fullBleed");
assert.equal(config.theme.name, "base");
assert.equal(config.theme.tokens.colorPrimary, "#005ea8");
assert.ok(Object.isFrozen(config.theme.tokens));

assert.throws(
  () => resolveRuntimeConfig({ instance: { theme: { tokens: { colorText: "#ffffff" } } } }),
  /contraste/
);
assert.throws(() => resolveRuntimeConfig({ instance: { css: "*{}" } }), /não reconhecida/);
assert.throws(
  () => resolveRuntimeConfig({ instance: { theme: { tokens: { arbitrary: "10px" } } } }),
  /Token não reconhecido/
);

console.log("runtime-config.test.js: verificações concluídas com sucesso.");
