import assert from "node:assert/strict";
import { renderTagsScreen } from "../tags-screen.js";

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

const LIST = Object.freeze({ listId: "20000000-0000-4000-8000-000000000002" });

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

const LIST_IDS = Object.freeze({ MSETags: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_tags: título + editor CRUD montado, schema de MSETags -------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Destaque", Alias: "destaque", Description: "", Ordering: 1, Published: "Published", ParamsJson: "{}" },
    { Id: 2, Title: "Promoção", Alias: "promocao", Description: "", Ordering: 2, Published: "Published", ParamsJson: "{}" },
    { Id: 3, Title: "Arquivado", Alias: "arquivado", Description: "", Ordering: 3, Published: "Published", ParamsJson: "{}" }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderTagsScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Tags");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Alias", "Ordem", "Estado", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  assert.equal(root.querySelectorAll("table")[0].className, "mse-administrator__table", "tabela deve ativar zebra/sticky-header/hover de administrator.css");

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 3);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["Destaque", "Promoção", "Arquivado"]);

  view.dispose();
  console.log("tags-screen.test.js: com_tags renderiza tabela real ok.");
}

// --- botão de alternância: publica/despublica uma tag -----------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Destaque", Alias: "destaque", Description: "", Ordering: 1, Published: "Published", ParamsJson: "{}" }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderTagsScreen({ root, services });
  await flush();

  const row = root.querySelectorAll("tr")[1];
  const toggle = row.querySelectorAll("button").find((b) => b.textContent === "Despublicar");
  assert.ok(toggle, "botão Despublicar deve existir para tag publicada");
  await toggle.click();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Published: "Unpublished" } }]);

  view.dispose();
  console.log("tags-screen.test.js: botão de alternância despublica tag ok.");
}

// --- route.task="tags.unpublish"&id=N: dispara alternância automática ------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Destaque", Alias: "destaque", Description: "", Ordering: 1, Published: "Published", ParamsJson: "{}" }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const route = { task: "tags.unpublish", id: 1 };
  const view = renderTagsScreen({ root, route, services: { adminClient: client, listIds: LIST_IDS } });
  await flush();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Published: "Unpublished" } }]);

  view.dispose();
  console.log("tags-screen.test.js: route.task=tags.unpublish dispara alternância automaticamente ok.");
}

// --- route.task sem id válido ou já no estado-alvo: nenhuma escrita --------

{
  const items = [
    { Id: 1, Title: "Destaque", Alias: "destaque", Description: "", Ordering: 1, Published: "Published", ParamsJson: "{}" }
  ];

  const rootNoTask = createRoot();
  const { client: clientNoTask, updates: updatesNoTask } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoTask = renderTagsScreen({ root: rootNoTask, services: { adminClient: clientNoTask, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoTask.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoTask.dispose();

  const rootBadId = createRoot();
  const { client: clientBadId, updates: updatesBadId } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewBadId = renderTagsScreen({
    root: rootBadId,
    route: { task: "tags.unpublish", id: 999 },
    services: { adminClient: clientBadId, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesBadId.length, 0, "id inexistente não deve causar nenhuma escrita");
  viewBadId.dispose();

  const rootAlready = createRoot();
  const { client: clientAlready, updates: updatesAlready } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewAlready = renderTagsScreen({
    root: rootAlready,
    route: { task: "tags.publish", id: 1 },
    services: { adminClient: clientAlready, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesAlready.length, 0, "já publicado: publish não deve gravar de novo");
  viewAlready.dispose();

  console.log("tags-screen.test.js: route.task sem id válido/já-no-estado não dispara escrita ok.");
}

console.log("tags-screen.test.js: verificações concluídas com sucesso.");
