import assert from "node:assert/strict";
import { renderMenusScreen } from "../menus-screen.js";
import { MENU_FORM_FIELDS } from "../menus-editor.js";

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
    this.checked = false;
    this.name = "";
    this.type = "";
    this.disabled = false;
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

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
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
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const LIST = Object.freeze({ listId: "20000000-0000-4000-8000-000000000001" });

function createFakeAdminClient({ items, shouldReject } = {}) {
  return {
    async getListItems() {
      if (shouldReject) throw new Error("falha simulada de rede");
      return items;
    }
  };
}

const LIST_IDS = Object.freeze({ MSEMenu: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_menus: título + editor CRUD montado, schema de MSEMenu ------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Início", Alias: "", MenuType: "principal", ParentId: 0, Path: "", Level: 1, Ordering: 0, Component: "", View: "", ParamsJson: null, Default: true, Target: "SameTab", Published: "Published" }
  ];
  const services = { adminClient: createFakeAdminClient({ items }), listIds: LIST_IDS };
  const view = renderMenusScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Menus");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", ...MENU_FORM_FIELDS.map((d) => d.label), "Ações"];
  assert.deepEqual(headers, expectedLabels);

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "Início");

  view.dispose();
  console.log("menus-screen.test.js: com_menus renderiza tabela real ok.");
}

console.log("menus-screen.test.js: verificações concluídas com sucesso.");
