import assert from "node:assert/strict";
import { createAdministratorToolbar } from "../administrator-toolbar.js";

// --- FakeElement/document mínimos (mesmo padrão de com_extensions/test/extensions-screen.test.js) --

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.parentNode = null;
    this.value = "";
    this.type = "";
    this.placeholder = "";
    this.onclick = null;
    this.oninput = null;
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
    if (type === "input") this.oninput = handler;
  }

  click() { return this.onclick?.({ currentTarget: this }); }
  dispatchInput(value) { this.value = value; return this.oninput?.({ currentTarget: this }); }

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

// --- botões de ação aparecem com texto certo e disparam onClick -----------

{
  const root = createRoot();
  let primaryClicks = 0; let secondaryClicks = 0;
  const toolbar = createAdministratorToolbar({
    root,
    primaryActions: [{ label: "Novo item", onClick: () => { primaryClicks += 1; } }],
    secondaryActions: [{ label: "Recarregar", onClick: () => { secondaryClicks += 1; } }]
  });

  const buttons = root.querySelectorAll("button");
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].textContent, "Novo item");
  assert.equal(buttons[1].textContent, "Recarregar");

  buttons[0].click();
  assert.equal(primaryClicks, 1);
  buttons[1].click();
  assert.equal(secondaryClicks, 1);

  assert.equal(toolbar.searchInput, null, "sem opção search, searchInput deve ser null");
  assert.equal(root.querySelectorAll("input").length, 0, "sem opção search, nenhum <input> deve ser criado");

  console.log("administrator-toolbar.test.js: botões de ação aparecem e disparam onClick ok.");
}

// --- primaryActions vazio (ex. templates-editor.js, só tem reloadButton) --

{
  const root = createRoot();
  createAdministratorToolbar({ root, primaryActions: [], secondaryActions: [{ label: "Recarregar", onClick: () => {} }] });
  const buttons = root.querySelectorAll("button");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, "Recarregar");

  console.log("administrator-toolbar.test.js: primaryActions vazio não cria botão extra ok.");
}

// --- search só aparece se fornecido; digitar dispara onInput --------------

{
  const root = createRoot();
  const values = [];
  const toolbar = createAdministratorToolbar({
    root,
    primaryActions: [{ label: "Novo item", onClick: () => {} }],
    search: { placeholder: "Buscar...", onInput: (value) => values.push(value) }
  });

  assert.ok(toolbar.searchInput, "search deve criar um input");
  assert.equal(toolbar.searchInput.type, "search");
  assert.equal(toolbar.searchInput.className, "mse-administrator__toolbar-search");
  assert.equal(toolbar.searchInput.placeholder, "Buscar...");

  toolbar.searchInput.dispatchInput("menu");
  assert.deepEqual(values, ["menu"]);
  toolbar.searchInput.dispatchInput("menu principal");
  assert.deepEqual(values, ["menu", "menu principal"]);

  console.log("administrator-toolbar.test.js: busca client-side dispara onInput a cada digitação ok.");
}

// --- dispose() remove o elemento do toolbar --------------------------------

{
  const root = createRoot();
  const toolbar = createAdministratorToolbar({ root, primaryActions: [{ label: "Novo item", onClick: () => {} }] });
  assert.equal(root.children.length, 1);

  toolbar.dispose();
  assert.equal(root.children.length, 0);

  console.log("administrator-toolbar.test.js: dispose() remove o elemento do toolbar ok.");
}

// --- validação de root inválido lança erro claro ----------------------------

{
  assert.throws(() => createAdministratorToolbar({ root: null }), TypeError);
  assert.throws(() => createAdministratorToolbar({ root: {} }), TypeError);

  console.log("administrator-toolbar.test.js: validação de root inválido ok.");
}

console.log("administrator-toolbar.test.js: verificações concluídas com sucesso.");
