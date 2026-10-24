import assert from "node:assert/strict";
import { createAdministratorShell, ADMINISTRATOR_NAV_LINKS, ADMINISTRATOR_NAV_GROUPS } from "../administrator-shell.js";

// --- FakeElement/document mínimos (mesmo padrão de com_extensions/test/extensions-screen.test.js) --
// 24/10/2026 (agrupamento hierárquico da sidebar): ganhou `addEventListener`/
// `dispatch` (mesmo padrão de `kernel/test/application.test.js#FakeElement`)
// e a propriedade `hidden`, necessários para exercitar o toggle
// expandir/recolher de cada grupo (`administrator-shell.js#createAdministratorShell`).

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

// --- monta cabeçalho + nav com todos os links (soltos + agrupados) + slot
// de conteúdo vazio ----------------------------------------------------------

{
  const root = createRoot();
  const shell = createAdministratorShell({ root, activeOption: "com_modules" });

  assert.equal(root.classList.names.has("mse-administrator-shell"), true);
  const links = root.querySelectorAll("a");
  assert.equal(links.length, ADMINISTRATOR_NAV_LINKS.length, "todos os links (soltos + dentro de grupos) continuam presentes, só reorganizados");
  assert.deepEqual(
    new Set(links.map((a) => a.href)),
    new Set(ADMINISTRATOR_NAV_LINKS.map(([option]) => `#/administrator?option=${option}`)),
    "mesmo conjunto de destinos de antes, independente da ordem/agrupamento"
  );

  // Só o link ativo tem aria-current="page".
  const activeLinks = links.filter((a) => a.getAttribute("aria-current") === "page");
  assert.equal(activeLinks.length, 1);
  assert.equal(activeLinks[0].href, "#/administrator?option=com_modules");

  assert.ok(shell.contentElement);
  assert.equal(shell.contentElement.children.length, 0);

  console.log("administrator-shell.test.js: monta cabeçalho+nav com link ativo marcado ok.");
}

// --- agrupamento hierárquico (24/10/2026): com_cpanel fica solto no topo;
// todas as demais opções pertencem a exatamente 1 grupo; os cabeçalhos de
// grupo são <button>, nunca <a> (não contam para a asserção acima) --------

{
  const root = createRoot();
  createAdministratorShell({ root, activeOption: "com_cpanel" });

  const groups = root.querySelectorAll("div").filter((node) => node.className === "mse-administrator-shell__group");
  assert.equal(groups.length, ADMINISTRATOR_NAV_GROUPS.length, "um <div> de grupo por entrada de ADMINISTRATOR_NAV_GROUPS");

  const toggles = root.querySelectorAll("button");
  assert.equal(toggles.length, ADMINISTRATOR_NAV_GROUPS.length, "um botão de toggle por grupo, nenhum <a> adicional");

  const groupedOptionCount = ADMINISTRATOR_NAV_GROUPS.reduce((total, group) => total + group.options.length, 0);
  assert.equal(groupedOptionCount + 1, ADMINISTRATOR_NAV_LINKS.length, "com_cpanel (solto) + todas as opções agrupadas = total de links");

  console.log("administrator-shell.test.js: com_cpanel solto no topo, demais opções em grupos, cabeçalhos são <button> ok.");
}

// --- toggle de grupo: clique recolhe (hidden=true, aria-expanded="false") e
// um segundo clique expande de novo -----------------------------------------

{
  const root = createRoot();
  createAdministratorShell({ root, activeOption: "com_cpanel" });

  const toggle = root.querySelectorAll("button")[0];
  const sublist = toggle.parentNode.children.find((child) => child !== toggle);

  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal(sublist.hidden, false);

  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "false", "1º clique recolhe o grupo");
  assert.equal(sublist.hidden, true);

  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "true", "2º clique expande de novo");
  assert.equal(sublist.hidden, false);

  console.log("administrator-shell.test.js: toggle de grupo recolhe/expande corretamente ok.");
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
