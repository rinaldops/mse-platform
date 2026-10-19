import assert from "node:assert/strict";
import { renderInstallerScreen } from "../screens/installer.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase(); this.children = []; this.ownerDocument = null;
    this.parentNode = null; this.textContent = ""; this.className = ""; this.onclick = null;
  }
  append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
  remove() { if (!this.parentNode) return; const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); this.parentNode = null; }
  querySelectorAll(tag) { const found = []; const wanted = tag.toUpperCase(); const walk = (node) => { for (const child of node.children) { if (child.tagName === wanted) found.push(child); walk(child); } }; walk(this); return found; }
  click() { this.onclick?.({ target: this }); }
}
const document = { createElement(tag) { const node = new FakeElement(tag); node.ownerDocument = document; return node; } };
function createRoot() { const root = new FakeElement(); root.ownerDocument = document; return root; }
async function flush() { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }
function buttons(root) { return root.querySelectorAll("button"); }

// O kernel installer recebe inspect/verify sem módulo e apply com callback de plano.
{
  const root = createRoot(); const calls = []; let confirmCalls = 0;
  const previousConfirm = globalThis.confirm;
  globalThis.confirm = (message) => { confirmCalls += 1; return true; };
  const kernelInstaller = {
    async inspect(...args) { calls.push(["inspect", args]); return { lists: 5 }; },
    async verify(...args) { calls.push(["verify", args]); return { valid: true }; },
    async apply(confirm) { calls.push(["apply", [confirm]]); assert.equal(typeof confirm, "function"); assert.equal(await confirm({ create: ["MSEMenu"] }), true); return { applied: true }; }
  };
  const view = renderInstallerScreen({ root, services: { kernelInstaller } });
  buttons(root).find((button) => button.textContent === "Inspecionar listas").click(); await flush();
  buttons(root).find((button) => button.textContent === "Verificar listas").click(); await flush();
  assert.deepEqual(calls.slice(0, 2), [["inspect", []], ["verify", []]]);
  buttons(root).find((button) => button.textContent === "Aplicar provisionamento").click(); await flush();
  assert.equal(calls[2][0], "apply"); assert.equal(confirmCalls, 2, "confirmação inicial e confirmação do plano");
  assert.match(root.querySelectorAll("pre")[0].textContent, /applied/);
  view.dispose(); assert.equal(root.children.length, 0);
  globalThis.confirm = previousConfirm;
  console.log("installer.test.js: kernel installer usa o contrato correto e exige confirmações ok.");
}

// O contrato legado continua recebendo o moduleId para não quebrar módulos antigos.
{
  const root = createRoot(); const calls = [];
  const installer = { async inspect(...args) { calls.push(["inspect", args]); return {}; }, async verify(...args) { calls.push(["verify", args]); return {}; }, async apply(...args) { calls.push(["apply", args]); return {}; } };
  const view = renderInstallerScreen({ root, services: { installer, installerModuleId: "custom-module" } });
  buttons(root).find((button) => button.textContent === "Inspecionar listas").click(); await flush();
  buttons(root).find((button) => button.textContent === "Verificar listas").click(); await flush();
  const previousConfirm = globalThis.confirm; globalThis.confirm = () => true;
  buttons(root).find((button) => button.textContent === "Aplicar provisionamento").click(); await flush();
  globalThis.confirm = previousConfirm;
  assert.deepEqual(calls.slice(0, 2).map(([, args]) => args), [["custom-module"], ["custom-module"]]);
  assert.deepEqual(calls[2][1].slice(0, 1), ["custom-module"]);
  view.dispose();
  console.log("installer.test.js: contrato legado preservado ok.");
}

// O instalador modular legado recebe moduleId e callback de confirmação no apply.
{
  const root = createRoot(); const calls = [];
  const installer = {
    async inspect(...args) { calls.push(["inspect", args]); return {}; },
    async verify(...args) { calls.push(["verify", args]); return {}; },
    async apply(...args) { calls.push(["apply", args]); assert.equal(typeof args[1], "function"); assert.equal(await args[1]({ create: ["CAMAP"] }), true); return { applied: true }; }
  };
  const previousConfirm = globalThis.confirm; globalThis.confirm = () => true;
  const view = renderInstallerScreen({ root, services: { installer, installerModuleId: "custom-module" } });
  buttons(root).find((button) => button.textContent === "Aplicar provisionamento").click(); await flush();
  globalThis.confirm = previousConfirm;
  assert.equal(calls[0][0], "apply"); assert.equal(calls[0][1][0], "custom-module");
  assert.equal(typeof calls[0][1][1], "function"); view.dispose();
  console.log("installer.test.js: apply legado encaminha callback de confirmação ok.");
}

// Ausência de serviço deve ser apresentada na tela, sem lançar ao chamador.
{
  const root = createRoot(); const previousConfirm = globalThis.confirm; globalThis.confirm = () => true;
  renderInstallerScreen({ root });
  buttons(root).find((button) => button.textContent === "Inspecionar listas").click(); await flush();
  globalThis.confirm = previousConfirm;
  assert.match(root.querySelectorAll("p").find((p) => p.className === "mse-administrator__error").textContent, /não configurado/);
  console.log("installer.test.js: erro amigável sem serviço ok.");
}

console.log("installer.test.js: verificações concluídas com sucesso.");
