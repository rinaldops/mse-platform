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

function createFakeAdminClient({ items = [], shouldReject } = {}) {
  const store = new Map(items.map((item) => [item.Id, { ...item }]));
  const updates = [];
  return {
    client: {
      async getListItems() {
        if (shouldReject) throw new Error("falha simulada de rede");
        return [...store.values()];
      },
      async getListItem(_list, id) {
        const item = store.get(Number(id));
        if (!item) throw new Error(`getListItem: item ${id} não encontrado.`);
        return { item: { ...item }, etag: `"item-${id}"`, status: 200 };
      },
      async updateListItem(_list, id, values) {
        const item = store.get(Number(id));
        Object.assign(item, values);
        updates.push({ id: Number(id), values });
        return { item: { ...item }, etag: `"item-${id}-updated"`, status: 204 };
      }
    },
    updates,
    store
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
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
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

// --- botão de alternância: publica/despublica um item de menu não-padrão --

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Início", Alias: "inicio", MenuType: "principal", ParentId: 0, Path: "inicio", Level: 1, Ordering: 0, Component: "", View: "", ParamsJson: "{}", Default: true, Target: "SameTab", Published: "Published" },
    { Id: 2, Title: "Notícias", Alias: "noticias", MenuType: "principal", ParentId: 0, Path: "noticias", Level: 1, Ordering: 1, Component: "", View: "", ParamsJson: "{}", Default: false, Target: "SameTab", Published: "Published" }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderMenusScreen({ root, services });
  await flush();

  const rows = root.querySelectorAll("tr").slice(1);
  const toggle = rows[1].querySelectorAll("button").find((b) => b.textContent === "Despublicar");
  assert.ok(toggle, "botão Despublicar deve existir para item não-padrão publicado");
  await toggle.click();
  await flush();

  assert.deepEqual(updates, [{ id: 2, values: { Published: "Unpublished" } }]);

  view.dispose();
  console.log("menus-screen.test.js: botão de alternância despublica item de menu ok.");
}

// --- route.task="menus.unpublish"&id=N: dispara alternância automática -----

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Início", Alias: "inicio", MenuType: "principal", ParentId: 0, Path: "inicio", Level: 1, Ordering: 0, Component: "", View: "", ParamsJson: "{}", Default: true, Target: "SameTab", Published: "Published" },
    { Id: 2, Title: "Notícias", Alias: "noticias", MenuType: "principal", ParentId: 0, Path: "noticias", Level: 1, Ordering: 1, Component: "", View: "", ParamsJson: "{}", Default: false, Target: "SameTab", Published: "Published" }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const route = { task: "menus.unpublish", id: 2 };
  const view = renderMenusScreen({ root, route, services: { adminClient: client, listIds: LIST_IDS } });
  await flush();
  await flush();

  assert.deepEqual(updates, [{ id: 2, values: { Published: "Unpublished" } }]);

  view.dispose();
  console.log("menus-screen.test.js: route.task=menus.unpublish dispara alternância automaticamente ok.");
}

// --- route.task sem id válido ou item Default: nenhuma escrita automática --

{
  const items = [
    { Id: 1, Title: "Início", Alias: "inicio", MenuType: "principal", ParentId: 0, Path: "inicio", Level: 1, Ordering: 0, Component: "", View: "", ParamsJson: "{}", Default: true, Target: "SameTab", Published: "Published" }
  ];

  const rootNoTask = createRoot();
  const { client: clientNoTask, updates: updatesNoTask } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoTask = renderMenusScreen({ root: rootNoTask, services: { adminClient: clientNoTask, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoTask.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoTask.dispose();

  const rootDefault = createRoot();
  const { client: clientDefault, updates: updatesDefault } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewDefault = renderMenusScreen({
    root: rootDefault,
    route: { task: "menus.unpublish", id: 1 },
    services: { adminClient: clientDefault, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesDefault.length, 0, "item Default não deve ser despublicado via task");
  viewDefault.dispose();

  console.log("menus-screen.test.js: route.task sem id válido/item Default não dispara escrita ok.");
}

console.log("menus-screen.test.js: verificações concluídas com sucesso.");
