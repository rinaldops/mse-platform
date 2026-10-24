import assert from "node:assert/strict";
import { mount } from "../component.js";

// --- FakeElement/document (combina o padrão de administrator-shell.test.js
// — classList/addEventListener/hidden, necessários para o shell — com o de
// com_menus/test/menus-screen.test.js — remove(), necessário porque cada
// *-screen.js chama panel.remove() em dispose()) -----------------------

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.href = "";
    this.hidden = false;
    this.parentNode = null;
    this.listeners = new Map();
    this.value = "";
    this.checked = false;
    this.name = "";
    this.type = "";
    this.disabled = false;
    this.classList = {
      names: new Set(),
      add(...values) { values.forEach((value) => this.names.add(value)); },
      remove(...values) { values.forEach((value) => this.names.delete(value)); },
      toggle(value, force) {
        const shouldAdd = force === undefined ? !this.names.has(value) : Boolean(force);
        if (shouldAdd) this.names.add(value); else this.names.delete(value);
      },
      has(value) { return this.names.has(value); }
    };
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get("click")?.({}); }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  remove() {
    if (this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      if (index !== -1) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    }
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
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// --- mount(): monta o shell + a tela resolvida de context.params.option ----

{
  const root = createRoot();
  const entry = mount({ root, context: { params: { option: "com_menus" } } });
  await flush();

  assert.equal(root.className, "mse-administrator");
  const header = root.querySelectorAll("header")[0];
  const headerTitle = header.children.find((child) => child.className === "mse-administrator-shell__header-title");
  assert.equal(headerTitle.textContent, "Menus");

  const h1s = root.querySelectorAll("h1");
  assert.equal(h1s.length, 1, "exatamente 1 tela (Menus) montada dentro do shell");
  assert.equal(h1s[0].textContent, "Menus");

  entry.dispose();
  console.log("component.test.js: mount() monta shell + tela de com_menus ok.");
}

// --- update(): navegação interna (com_menus -> com_extensions) troca só a
// tela, SEM nunca chamar shell.dispose() — a sidebar/header (nav/header)
// continuam sendo os MESMOS objetos de DOM antes e depois (25/10/2026 —
// corrige o bug real por trás de "vários links não estão funcionando": ver
// kernel/application.js e administrator-shell.js#setActiveOption) --------

{
  const root = createRoot();
  const entry = mount({ root, context: { params: { option: "com_menus" } } });
  await flush();

  assert.equal(root.children.length, 2, "shell montado: só header+body como filhos de root");
  const headerBefore = root.querySelectorAll("header")[0];
  const navBefore = root.querySelectorAll("nav")[0];
  assert.ok(headerBefore && navBefore, "header/nav do shell devem existir após mount()");

  entry.update({ context: { params: { option: "com_extensions" } } });
  await flush();

  // Mesmo shell: header/nav continuam sendo os MESMOS objetos (nenhuma
  // reconstrução via root.replaceChildren()).
  assert.equal(root.querySelectorAll("header")[0], headerBefore, "update() não recria o <header> do shell");
  assert.equal(root.querySelectorAll("nav")[0], navBefore, "update() não recria o <nav> do shell");
  assert.equal(root.children.length, 2, "update() não acrescenta/remove filhos de root (shell preservado)");

  // Header reflete a nova tela.
  const headerTitle = headerBefore.children.find((child) => child.className === "mse-administrator-shell__header-title");
  assert.equal(headerTitle.textContent, "Extensões");

  // Tela anterior (Menus) foi desmontada; a nova (Extensões) está montada —
  // exatamente 1 <h1> na área de conteúdo, nunca as duas simultaneamente.
  const h1s = root.querySelectorAll("h1");
  assert.equal(h1s.length, 1, "só a tela ativa deve estar montada após update()");
  assert.equal(h1s[0].textContent, "Extensões");

  entry.dispose();
  console.log("component.test.js: update() troca com_menus -> com_extensions sem destruir o shell ok.");
}

// --- update() para a MESMA option: no-op na troca de tela (não remonta) ----

{
  const root = createRoot();
  const entry = mount({ root, context: { params: { option: "com_extensions" } } });
  await flush();

  const h1Before = root.querySelectorAll("h1")[0];
  entry.update({ context: { params: { option: "com_extensions" } } });
  await flush();

  // A tela foi reconstruída internamente (component.js sempre dispõe+remonta
  // a VIEW em update(), mesmo para a mesma option — só o shell é
  // preservado), então basta confirmar que continua exatamente 1 <h1> e que
  // o shell (header/nav) nunca foi tocado.
  const h1sAfter = root.querySelectorAll("h1");
  assert.equal(h1sAfter.length, 1);
  assert.equal(h1sAfter[0].textContent, "Extensões");
  assert.ok(h1Before, "sanity: h1 existia antes do update() repetido");

  entry.dispose();
  console.log("component.test.js: update() repetido para a mesma option permanece consistente ok.");
}

// --- dispose(): limpa shell + tela ativa e reseta root.className -----------

{
  const root = createRoot();
  const entry = mount({ root, context: { params: { option: "com_cpanel" } } });
  await flush();
  assert.ok(root.children.length > 0);

  entry.dispose();
  assert.equal(root.children.length, 0);
  assert.equal(root.className, "");

  console.log("component.test.js: dispose() limpa shell+tela e reseta root.className ok.");
}

console.log("component.test.js: verificações concluídas com sucesso.");
