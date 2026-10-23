import assert from "node:assert/strict";
import { createAdministratorShell, ADMINISTRATOR_NAV_LINKS } from "../administrator-shell.js";

// --- FakeElement/document mínimos (mesmo padrão de com_extensions/test/extensions-screen.test.js) --

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.href = "";
    this.parentNode = null;
    this.classList = {
      names: new Set(),
      add(...values) { values.forEach((value) => this.names.add(value)); },
      remove(...values) { values.forEach((value) => this.names.delete(value)); }
    };
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }

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

// --- monta cabeçalho + nav com todos os links + slot de conteúdo vazio -----

{
  const root = createRoot();
  const shell = createAdministratorShell({ root, activeOption: "com_modules" });

  assert.equal(root.classList.names.has("mse-administrator-shell"), true);
  const links = root.querySelectorAll("a");
  assert.equal(links.length, ADMINISTRATOR_NAV_LINKS.length);
  assert.deepEqual(
    links.map((a) => a.href),
    ADMINISTRATOR_NAV_LINKS.map(([option]) => `#/administrator?option=${option}`)
  );

  // Só o link ativo tem aria-current="page".
  const activeLinks = links.filter((a) => a.getAttribute("aria-current") === "page");
  assert.equal(activeLinks.length, 1);
  assert.equal(activeLinks[0].href, "#/administrator?option=com_modules");

  assert.ok(shell.contentElement);
  assert.equal(shell.contentElement.children.length, 0);

  console.log("administrator-shell.test.js: monta cabeçalho+nav com link ativo marcado ok.");
}

// --- nenhum activeOption informado -> nenhum link marcado aria-current -----

{
  const root = createRoot();
  createAdministratorShell({ root });
  const links = root.querySelectorAll("a");
  assert.equal(links.filter((a) => a.getAttribute("aria-current") === "page").length, 0);

  console.log("administrator-shell.test.js: sem activeOption, nenhum link marcado ok.");
}

// --- dispose() limpa o root por completo ------------------------------------

{
  const root = createRoot();
  const shell = createAdministratorShell({ root, activeOption: "com_cpanel" });
  assert.ok(root.children.length > 0);

  shell.dispose();
  assert.equal(root.children.length, 0);
  assert.equal(root.classList.names.has("mse-administrator-shell"), false);

  console.log("administrator-shell.test.js: dispose() limpa o root por completo ok.");
}

// --- validação de root inválido lança erro claro ----------------------------

{
  assert.throws(() => createAdministratorShell({ root: null }), TypeError);
  assert.throws(() => createAdministratorShell({ root: {} }), TypeError);

  console.log("administrator-shell.test.js: validação de root inválido ok.");
}

console.log("administrator-shell.test.js: verificações concluídas com sucesso.");
