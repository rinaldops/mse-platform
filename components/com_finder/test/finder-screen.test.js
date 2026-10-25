import assert from "node:assert/strict";
import { renderFinderScreen } from "../finder-screen.js";

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

const LIST = Object.freeze({ listId: "20000000-0000-4000-8000-000000000009" });

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

const LIST_IDS = Object.freeze({ MSESearchFilters: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_finder: título + editor CRUD montado, schema de MSESearchFilters -

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Notícias recentes", Alias: "noticias-recentes", CreatedByAlias: "", State: "Published" },
    { Id: 2, Title: "Esportes", Alias: "esportes", CreatedByAlias: "", State: "Published" },
    { Id: 3, Title: "Arquivo antigo", Alias: "arquivo-antigo", CreatedByAlias: "", State: "Unpublished" }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderFinderScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Buscas Salvas");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Alias", "Estado", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  assert.equal(root.querySelectorAll("table")[0].className, "mse-administrator__table", "tabela deve ativar zebra/sticky-header/hover de administrator.css");

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 3);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["Notícias recentes", "Esportes", "Arquivo antigo"]);

  view.dispose();
  console.log("finder-screen.test.js: com_finder renderiza tabela real ok.");
}

// --- botão de alternância: publica/despublica um filtro --------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Notícias recentes", Alias: "noticias-recentes", CreatedByAlias: "", State: "Published" }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderFinderScreen({ root, services });
  await flush();

  const row = root.querySelectorAll("tr")[1];
  const toggle = row.querySelectorAll("button").find((b) => b.textContent === "Despublicar");
  assert.ok(toggle, "botão Despublicar deve existir para filtro publicado");
  await toggle.click();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { State: "Unpublished" } }]);

  view.dispose();
  console.log("finder-screen.test.js: botão de alternância despublica filtro ok.");
}

// --- route.task="finder.unpublish"&id=N: dispara alternância automática ----

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Notícias recentes", Alias: "noticias-recentes", CreatedByAlias: "", State: "Published" }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const route = { task: "finder.unpublish", id: 1 };
  const view = renderFinderScreen({ root, route, services: { adminClient: client, listIds: LIST_IDS } });
  await flush();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { State: "Unpublished" } }]);

  view.dispose();
  console.log("finder-screen.test.js: route.task=finder.unpublish dispara alternância automaticamente ok.");
}

// --- route.task sem id válido ou já no estado-alvo: nenhuma escrita --------

{
  const items = [
    { Id: 1, Title: "Notícias recentes", Alias: "noticias-recentes", CreatedByAlias: "", State: "Published" }
  ];

  const rootNoTask = createRoot();
  const { client: clientNoTask, updates: updatesNoTask } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoTask = renderFinderScreen({ root: rootNoTask, services: { adminClient: clientNoTask, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoTask.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoTask.dispose();

  const rootBadId = createRoot();
  const { client: clientBadId, updates: updatesBadId } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewBadId = renderFinderScreen({
    root: rootBadId,
    route: { task: "finder.unpublish", id: 999 },
    services: { adminClient: clientBadId, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesBadId.length, 0, "id inexistente não deve causar nenhuma escrita");
  viewBadId.dispose();

  const rootAlready = createRoot();
  const { client: clientAlready, updates: updatesAlready } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewAlready = renderFinderScreen({
    root: rootAlready,
    route: { task: "finder.publish", id: 1 },
    services: { adminClient: clientAlready, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesAlready.length, 0, "já publicado: publish não deve gravar de novo");
  viewAlready.dispose();

  console.log("finder-screen.test.js: route.task sem id válido/já-no-estado não dispara escrita ok.");
}

console.log("finder-screen.test.js: verificações concluídas com sucesso.");
