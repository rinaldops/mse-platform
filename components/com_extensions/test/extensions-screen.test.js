import assert from "node:assert/strict";
import { renderExtensionsScreen } from "../extensions-screen.js";

// --- FakeElement/document mínimos (mesmo padrão de kernel/test/application.test.js) --

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

/** Espera o microtask queue drenar o `listAdminItems` assíncrono interno. */
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

const LIST_IDS = Object.freeze({
  MSEExtensions: LIST,
  MSEMenu: LIST,
  MSEModules: LIST
});

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_extensions: título + editor CRUD montado (dados reais via reload) --

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Blog", Type: "Component", Element: "blog", ClientId: "Site", Version: "1.0.0", Enabled: true, Protected: false, Ordering: null, ParamsJson: null },
    { Id: 2, Title: "SD", Type: "Module", Element: "sd", ClientId: "Site", Version: "1.0.0", Enabled: true, Protected: false, Ordering: 1, ParamsJson: "{}" }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderExtensionsScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Extensões");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Tipo", "Elemento", "Client", "Versão", "Habilitada", "Protegida", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  const rows = root.querySelectorAll("tr").slice(1); // pula o cabeçalho
  assert.equal(rows.length, 2);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "Blog");
  assert.equal(rows[1].querySelectorAll("td")[0].textContent, "SD");

  view.dispose();
  assert.equal(root.children.length, 0);

  console.log("extensions-screen.test.js: com_extensions renderiza tabela real ok.");
}

// --- erro de carregamento: mensagem amigável, sem lançar --------------------

{
  const root = createRoot();
  const { client } = createFakeAdminClient({ shouldReject: true });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderExtensionsScreen({ root, services });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0, "não deve renderizar tabela em caso de erro");
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);
  assert.match(errorMessages[0].textContent, /falha simulada de rede|Client administrativo/);

  view.dispose();
  console.log("extensions-screen.test.js: erro de carregamento mostra mensagem amigável sem lançar ok.");
}

// --- services ausentes/incompletos: mensagem amigável, sem lançar ----------

{
  const root = createRoot();
  const view = renderExtensionsScreen({ root, services: {} });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0);
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);

  view.dispose();
  console.log("extensions-screen.test.js: services ausente mostra mensagem amigável sem lançar ok.");
}

// --- botão de alternância: habilita/desabilita uma extensão não-protegida --

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Blog", Type: "Component", Element: "blog", ClientId: "Site", Version: "1.0.0", Enabled: true, Protected: false, Ordering: null, ParamsJson: null }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderExtensionsScreen({ root, services });
  await flush();

  const row = root.querySelectorAll("tr")[1];
  const toggle = row.querySelectorAll("button").find((b) => b.textContent === "Desabilitar");
  assert.ok(toggle, "botão Desabilitar deve existir para extensão habilitada");
  await toggle.click();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Enabled: false } }]);

  view.dispose();
  console.log("extensions-screen.test.js: botão de alternância desabilita extensão ok.");
}

// --- route.task="extensions.disable"&id=N: dispara alternância automática --

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Blog", Type: "Component", Element: "blog", ClientId: "Site", Version: "1.0.0", Enabled: true, Protected: false, Ordering: null, ParamsJson: null }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const route = { task: "extensions.disable", id: 1 };
  const view = renderExtensionsScreen({ root, route, services });
  await flush();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Enabled: false } }]);

  view.dispose();
  console.log("extensions-screen.test.js: route.task=extensions.disable dispara alternância automaticamente ok.");
}

// --- route.task sem id válido, item Protected, ou já no estado-alvo: nenhuma
// escrita automática ----------------------------------------------------

{
  const items = [
    { Id: 1, Title: "Blog", Type: "Component", Element: "blog", ClientId: "Site", Version: "1.0.0", Enabled: true, Protected: false, Ordering: null, ParamsJson: null },
    { Id: 2, Title: "Core", Type: "Component", Element: "core", ClientId: "Site", Version: "1.0.0", Enabled: true, Protected: true, Ordering: null, ParamsJson: null }
  ];

  const rootNoTask = createRoot();
  const { client: clientNoTask, updates: updatesNoTask } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoTask = renderExtensionsScreen({ root: rootNoTask, services: { adminClient: clientNoTask, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoTask.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoTask.dispose();

  const rootBadId = createRoot();
  const { client: clientBadId, updates: updatesBadId } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewBadId = renderExtensionsScreen({
    root: rootBadId,
    route: { task: "extensions.disable", id: 999 },
    services: { adminClient: clientBadId, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesBadId.length, 0, "id inexistente não deve causar nenhuma escrita");
  viewBadId.dispose();

  const rootProtected = createRoot();
  const { client: clientProtected, updates: updatesProtected } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewProtected = renderExtensionsScreen({
    root: rootProtected,
    route: { task: "extensions.disable", id: 2 },
    services: { adminClient: clientProtected, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesProtected.length, 0, "extensão Protected não deve ser desabilitada via task");
  viewProtected.dispose();

  const rootAlready = createRoot();
  const { client: clientAlready, updates: updatesAlready } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewAlready = renderExtensionsScreen({
    root: rootAlready,
    route: { task: "extensions.enable", id: 1 },
    services: { adminClient: clientAlready, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesAlready.length, 0, "já habilitada: enable não deve gravar de novo");
  viewAlready.dispose();

  console.log("extensions-screen.test.js: route.task sem id válido/Protected/já-no-estado não dispara escrita ok.");
}

console.log("extensions-screen.test.js: verificações concluídas com sucesso.");
