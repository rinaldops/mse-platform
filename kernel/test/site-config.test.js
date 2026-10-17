import assert from "node:assert/strict";
import { loadGlobalConfig, loadExtensionConfig, loadInstanceConfig } from "../site-config.js";

// --- fixtures --------------------------------------------------------------

function fixtureStore(overrides = {}) {
  const calls = [];
  const store = {
    async loadGlobal() {
      calls.push(["loadGlobal"]);
      return { tema: "claro" };
    },
    async loadExtension(elemento) {
      calls.push(["loadExtension", elemento]);
      return { elemento, habilitado: true };
    },
    async load({ moduleId, instanceId }) {
      calls.push(["load", { moduleId, instanceId }]);
      return { moduleId, instanceId };
    },
    ...overrides
  };
  return { store, calls };
}

// --- loadGlobalConfig --------------------------------------------------

{
  const { store, calls } = fixtureStore();
  const result = await loadGlobalConfig(store);
  assert.deepEqual(result, { tema: "claro" });
  assert.deepEqual(calls, [["loadGlobal"]]);

  console.log("site-config.test.js: loadGlobalConfig caminho feliz ok.");
}

{
  await assert.rejects(
    async () => loadGlobalConfig(undefined),
    TypeError
  );
  await assert.rejects(
    async () => loadGlobalConfig({}),
    TypeError
  );
  await assert.rejects(
    async () => loadGlobalConfig({ loadGlobal: "não é função" }),
    TypeError
  );

  console.log("site-config.test.js: loadGlobalConfig valida store ok.");
}

// --- loadExtensionConfig ------------------------------------------------

{
  const { store, calls } = fixtureStore();
  const result = await loadExtensionConfig(store, "forum");
  assert.deepEqual(result, { elemento: "forum", habilitado: true });
  assert.deepEqual(calls, [["loadExtension", "forum"]]);

  console.log("site-config.test.js: loadExtensionConfig caminho feliz ok.");
}

{
  const { store } = fixtureStore();
  await assert.rejects(
    async () => loadExtensionConfig(undefined, "forum"),
    TypeError
  );
  await assert.rejects(
    async () => loadExtensionConfig({ loadGlobal: () => {}, load: () => {} }, "forum"),
    TypeError
  );
  await assert.rejects(
    async () => loadExtensionConfig(store, undefined),
    TypeError
  );
  await assert.rejects(
    async () => loadExtensionConfig(store, ""),
    TypeError
  );
  await assert.rejects(
    async () => loadExtensionConfig(store, 123),
    TypeError
  );

  console.log("site-config.test.js: loadExtensionConfig valida store e elemento ok.");
}

// --- loadInstanceConfig --------------------------------------------------

{
  const { store, calls } = fixtureStore();
  const result = await loadInstanceConfig(store, { moduleId: "blog", instanceId: "sd" });
  assert.deepEqual(result, { moduleId: "blog", instanceId: "sd" });
  assert.deepEqual(calls, [["load", { moduleId: "blog", instanceId: "sd" }]]);

  console.log("site-config.test.js: loadInstanceConfig caminho feliz ok.");
}

{
  const { store } = fixtureStore();
  await assert.rejects(
    async () => loadInstanceConfig(undefined, { moduleId: "blog", instanceId: "sd" }),
    TypeError
  );
  await assert.rejects(
    async () => loadInstanceConfig({ loadGlobal: () => {}, loadExtension: () => {} }, { moduleId: "blog", instanceId: "sd" }),
    TypeError
  );
  await assert.rejects(
    async () => loadInstanceConfig(store, {}),
    TypeError
  );
  await assert.rejects(
    async () => loadInstanceConfig(store, { moduleId: "blog" }),
    TypeError
  );
  await assert.rejects(
    async () => loadInstanceConfig(store, { instanceId: "sd" }),
    TypeError
  );
  await assert.rejects(
    async () => loadInstanceConfig(store),
    TypeError
  );
  await assert.rejects(
    async () => loadInstanceConfig(store, { moduleId: 1, instanceId: "sd" }),
    TypeError
  );

  console.log("site-config.test.js: loadInstanceConfig valida store e parâmetros ok.");
}

console.log("site-config.test.js: verificações concluídas com sucesso.");
