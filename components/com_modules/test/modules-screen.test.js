import assert from "node:assert/strict";
import { renderModulesScreen } from "../modules-screen.js";

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

const LIST_IDS = Object.freeze({ MSEModules: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_modules: título + editor CRUD montado, schema de MSEModulos -------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "sd-principal", Module: "sd", Position: "home-a", Ordering: 1, Published: "Published", PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: null },
    { Id: 2, Title: "footer-principal", Module: "footer", Position: "rodape", Ordering: 1, Published: "Published", PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: null },
    { Id: 3, Title: "mc-principal", Module: "mc", Position: "home-c", Ordering: 1, Published: "Published", PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: null }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderModulesScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Módulos");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Tipo", "Posição", "Ordem", "Estado", "Atribuição", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  assert.equal(root.querySelectorAll("table")[0].className, "mse-administrator__table", "tabela deve ativar zebra/sticky-header/hover de administrator.css");

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 3);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["sd-principal", "footer-principal", "mc-principal"]);

  view.dispose();
  console.log("modules-screen.test.js: com_modules renderiza tabela real ok.");
}

// --- botão de alternância: publica/despublica uma instância de módulo ------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "sd-principal", Module: "sd", Position: "home-a", Ordering: 1, Published: "Published", PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: null }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderModulesScreen({ root, services });
  await flush();

  const row = root.querySelectorAll("tr")[1];
  const toggle = row.querySelectorAll("button").find((b) => b.textContent === "Despublicar");
  assert.ok(toggle, "botão Despublicar deve existir para módulo publicado");
  await toggle.click();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Published: "Unpublished" } }]);

  view.dispose();
  console.log("modules-screen.test.js: botão de alternância despublica módulo ok.");
}

// --- route.task="modules.unpublish"&id=N: dispara alternância automática ---

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "sd-principal", Module: "sd", Position: "home-a", Ordering: 1, Published: "Published", PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: null }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const route = { task: "modules.unpublish", id: 1 };
  const view = renderModulesScreen({ root, route, services: { adminClient: client, listIds: LIST_IDS } });
  await flush();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Published: "Unpublished" } }]);

  view.dispose();
  console.log("modules-screen.test.js: route.task=modules.unpublish dispara alternância automaticamente ok.");
}

// --- route.task sem id válido ou já no estado-alvo: nenhuma escrita --------

{
  const items = [
    { Id: 1, Title: "sd-principal", Module: "sd", Position: "home-a", Ordering: 1, Published: "Published", PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: null }
  ];

  const rootNoTask = createRoot();
  const { client: clientNoTask, updates: updatesNoTask } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoTask = renderModulesScreen({ root: rootNoTask, services: { adminClient: clientNoTask, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoTask.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoTask.dispose();

  const rootBadId = createRoot();
  const { client: clientBadId, updates: updatesBadId } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewBadId = renderModulesScreen({
    root: rootBadId,
    route: { task: "modules.unpublish", id: 999 },
    services: { adminClient: clientBadId, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesBadId.length, 0, "id inexistente não deve causar nenhuma escrita");
  viewBadId.dispose();

  const rootAlready = createRoot();
  const { client: clientAlready, updates: updatesAlready } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewAlready = renderModulesScreen({
    root: rootAlready,
    route: { task: "modules.publish", id: 1 },
    services: { adminClient: clientAlready, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesAlready.length, 0, "já publicado: publish não deve gravar de novo");
  viewAlready.dispose();

  console.log("modules-screen.test.js: route.task sem id válido/já-no-estado não dispara escrita ok.");
}

console.log("modules-screen.test.js: verificações concluídas com sucesso.");
