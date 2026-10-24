import assert from "node:assert/strict";
import { renderConfigScreen } from "../config-screen.js";

// --- FakeElement/document mínimos (mesmo padrão de extensions-screen.test.js) --

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
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

const LIST_IDS = Object.freeze({ MSEConfiguracoes: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_config: título + editor CRUD montado (dados reais via reload) -----

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "global", Scope: "Global", Module: null, TipoInstancia: "Full", Layout: "Contained", Theme: "default", ConfigurationJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, VersaoModulo: null, State: "Published", Active: true, ExtensionElement: null },
    { Id: 2, Title: "sd-principal", Scope: "Instance", Module: "sd", TipoInstancia: "Full", Layout: "Herdar", Theme: null, ConfigurationJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, VersaoModulo: null, State: "Published", Active: true, ExtensionElement: null }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderConfigScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Configuração global");

  const headers = textOf(root.querySelectorAll("th"));
  assert.deepEqual(headers, ["Chave", "Escopo", "Módulo", "Tema", "Estado", "Ativo", "Ações"]);

  assert.equal(root.querySelectorAll("table")[0].className, "mse-administrator__table", "tabela deve ativar zebra/sticky-header/hover de administrator.css");

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "global");
  assert.equal(rows[1].querySelectorAll("td")[0].textContent, "sd-principal");

  view.dispose();
  assert.equal(root.children.length, 0);

  console.log("config-screen.test.js: com_config renderiza tabela real ok.");
}

// --- erro de carregamento: mensagem amigável, sem lançar --------------------

{
  const root = createRoot();
  const { client } = createFakeAdminClient({ shouldReject: true });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderConfigScreen({ root, services });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0);
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);
  assert.match(errorMessages[0].textContent, /falha simulada de rede|Client administrativo/);

  view.dispose();
  console.log("config-screen.test.js: erro de carregamento mostra mensagem amigável sem lançar ok.");
}

// --- services ausentes/incompletos: mensagem amigável, sem lançar ----------

{
  const root = createRoot();
  const view = renderConfigScreen({ root, services: {} });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0);
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);

  view.dispose();
  console.log("config-screen.test.js: services ausente mostra mensagem amigável sem lançar ok.");
}

// --- botão de alternância: ativa/desativa uma configuração ------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "global", Scope: "Global", Module: null, TipoInstancia: "Full", Layout: "Contained", Theme: "default", ConfigurationJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, VersaoModulo: null, State: "Published", Active: true, ExtensionElement: null }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderConfigScreen({ root, services });
  await flush();

  const row = root.querySelectorAll("tr")[1];
  const toggle = row.querySelectorAll("button").find((b) => b.textContent === "Desativar");
  assert.ok(toggle, "botão Desativar deve existir para configuração ativa");
  await toggle.click();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Active: false } }]);

  view.dispose();
  console.log("config-screen.test.js: botão de alternância desativa configuração ok.");
}

// --- route.task="config.deactivate"&id=N: dispara alternância automática ---

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "global", Scope: "Global", Module: null, TipoInstancia: "Full", Layout: "Contained", Theme: "default", ConfigurationJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, VersaoModulo: null, State: "Published", Active: true, ExtensionElement: null }
  ];
  const { client, updates } = createFakeAdminClient({ items });
  const route = { task: "config.deactivate", id: 1 };
  const view = renderConfigScreen({ root, route, services: { adminClient: client, listIds: LIST_IDS } });
  await flush();
  await flush();

  assert.deepEqual(updates, [{ id: 1, values: { Active: false } }]);

  view.dispose();
  console.log("config-screen.test.js: route.task=config.deactivate dispara alternância automaticamente ok.");
}

// --- route.task sem id válido ou já no estado-alvo: nenhuma escrita --------

{
  const items = [
    { Id: 1, Title: "global", Scope: "Global", Module: null, TipoInstancia: "Full", Layout: "Contained", Theme: "default", ConfigurationJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, VersaoModulo: null, State: "Published", Active: true, ExtensionElement: null }
  ];

  const rootNoTask = createRoot();
  const { client: clientNoTask, updates: updatesNoTask } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoTask = renderConfigScreen({ root: rootNoTask, services: { adminClient: clientNoTask, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoTask.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoTask.dispose();

  const rootBadId = createRoot();
  const { client: clientBadId, updates: updatesBadId } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewBadId = renderConfigScreen({
    root: rootBadId,
    route: { task: "config.deactivate", id: 999 },
    services: { adminClient: clientBadId, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesBadId.length, 0, "id inexistente não deve causar nenhuma escrita");
  viewBadId.dispose();

  const rootAlready = createRoot();
  const { client: clientAlready, updates: updatesAlready } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewAlready = renderConfigScreen({
    root: rootAlready,
    route: { task: "config.activate", id: 1 },
    services: { adminClient: clientAlready, listIds: LIST_IDS }
  });
  await flush(); await flush();
  assert.equal(updatesAlready.length, 0, "já ativo: activate não deve gravar de novo");
  viewAlready.dispose();

  console.log("config-screen.test.js: route.task sem id válido/já-no-estado não dispara escrita ok.");
}

console.log("config-screen.test.js: verificações concluídas com sucesso.");
