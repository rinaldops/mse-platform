import assert from "node:assert/strict";
import { renderInstallerScreen } from "../installer-screen.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.parentNode = null;
    this.onclick = null;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  remove() {
    if (this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      if (index !== -1) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    }
  }

  addEventListener(type, handler) {
    if (type === "click") this.onclick = handler;
  }

  click() {
    return this.onclick?.({ currentTarget: this });
  }

  querySelectorAll(tag) {
    const upper = tag.toUpperCase();
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.tagName === upper) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

const document = {
  createElement(tag) {
    const node = new FakeElement(tag);
    node.ownerDocument = document;
    return node;
  }
};

function createRoot() {
  const root = new FakeElement("div");
  root.ownerDocument = document;
  return root;
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function buttons(root) {
  return root.querySelectorAll("button");
}

// --- com_installer: inspecionar/verificar são somente leitura; aplicar exige
// confirmação inicial + confirmação do plano antes de qualquer escrita -----

{
  const root = createRoot();
  const calls = [];
  let confirmCalls = 0;
  const previousConfirm = globalThis.confirm;
  globalThis.confirm = () => { confirmCalls += 1; return true; };
  const kernelInstaller = {
    async inspect(...args) { calls.push(["inspect", args]); return { lists: 5 }; },
    async verify(...args) { calls.push(["verify", args]); return { valid: true }; },
    async apply(confirm) {
      calls.push(["apply", [confirm]]);
      assert.equal(typeof confirm, "function");
      assert.equal(await confirm({ create: ["MSEMenu"] }), true);
      return { applied: true };
    }
  };
  const view = renderInstallerScreen({ root, services: { kernelInstaller } });

  buttons(root).find((button) => button.textContent === "Inspecionar listas").click();
  await flush();
  buttons(root).find((button) => button.textContent === "Verificar listas").click();
  await flush();
  assert.deepEqual(calls.slice(0, 2), [["inspect", []], ["verify", []]]);

  buttons(root).find((button) => button.textContent === "Aplicar provisionamento").click();
  await flush();
  assert.equal(calls[2][0], "apply");
  assert.equal(confirmCalls, 2, "confirmação inicial e confirmação do plano");
  assert.match(root.querySelectorAll("pre")[0].textContent, /applied/);

  view.dispose();
  assert.equal(root.children.length, 0);
  globalThis.confirm = previousConfirm;
  console.log("installer-screen.test.js: kernelInstaller com confirmações explícitas ok.");
}

// --- apply cancelado na confirmação inicial: nunca chama installer.apply ---

{
  const root = createRoot();
  const calls = [];
  const previousConfirm = globalThis.confirm;
  globalThis.confirm = () => false;
  const kernelInstaller = { async apply(...args) { calls.push(args); return {}; } };
  const view = renderInstallerScreen({ root, services: { kernelInstaller } });

  buttons(root).find((button) => button.textContent === "Aplicar provisionamento").click();
  await flush();
  assert.equal(calls.length, 0, "apply não deve ser chamado sem confirmação inicial");

  view.dispose();
  globalThis.confirm = previousConfirm;
  console.log("installer-screen.test.js: cancelamento na confirmação inicial não aplica ok.");
}

// --- Ausência de serviço deve ser apresentada na tela, sem lançar ao chamador --

{
  const root = createRoot();
  renderInstallerScreen({ root });
  buttons(root).find((button) => button.textContent === "Inspecionar listas").click();
  await flush();
  assert.match(root.querySelectorAll("p").find((p) => p.className === "mse-administrator__error").textContent, /não configurado/);
  console.log("installer-screen.test.js: erro amigável sem serviço ok.");
}

console.log("installer-screen.test.js: verificações concluídas com sucesso.");
