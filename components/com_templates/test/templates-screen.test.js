import assert from "node:assert/strict";
import { renderTemplatesScreen } from "../templates-screen.js";

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

const LIST = Object.freeze({ listId: "70000000-0000-4000-8000-000000000001" });

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

const LIST_IDS = Object.freeze({ MSETemplateStyles: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_templates: título + tabela com estilos do client "Site" -----------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-platform — Padrão (fallback)", Template: "mse-default", ClientId: "Site", Home: false },
    { Id: 3, Title: "Administrator — formal", Template: "atum-equivalente", ClientId: "Administrator", Home: true }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderTemplatesScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Templates");

  const headers = textOf(root.querySelectorAll("th"));
  assert.deepEqual(headers, ["Título", "Template", "Padrão", "Ações"]);

  // Só os 2 estilos ClientId="Site" aparecem — o de "Administrator" é
  // filtrado (ver kernel/template-registry.js#listTemplateStylesByClient).
  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 2);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["CAMAP-AGP — Tema 1", "mse-platform — Padrão (fallback)"]);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[2])), ["Sim", "Não"]);

  view.dispose();
  assert.equal(root.children.length, 0);

  console.log("templates-screen.test.js: com_templates renderiza tabela filtrada por ClientId=Site ok.");
}

// --- "Tornar padrão": grava Home=true na linha escolhida e Home=false nas
// demais linhas Home=true do mesmo ClientId -------------------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-platform — Padrão (fallback)", Template: "mse-default", ClientId: "Site", Home: false }
  ];
  const { client, updates, store } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderTemplatesScreen({ root, services });
  await flush();

  const rows = root.querySelectorAll("tr").slice(1);
  const makeDefaultButtons = rows.map((row) => row.querySelectorAll("button")[0]);
  // A linha já Home=true tem o botão desabilitado.
  assert.equal(makeDefaultButtons[0].disabled, true);
  assert.equal(makeDefaultButtons[1].disabled, false);

  await makeDefaultButtons[1].click();
  await flush();

  assert.deepEqual(updates, [
    { id: 2, values: { Home: true } },
    { id: 1, values: { Home: false } }
  ]);
  assert.equal(store.get(1).Home, false);
  assert.equal(store.get(2).Home, true);

  view.dispose();
  console.log("templates-screen.test.js: Tornar padrão grava Home=true/false corretamente ok.");
}

// --- erro de carregamento: mensagem amigável, sem lançar --------------------

{
  const root = createRoot();
  const { client } = createFakeAdminClient({ shouldReject: true });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderTemplatesScreen({ root, services });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0, "não deve renderizar tabela em caso de erro");
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);
  assert.match(errorMessages[0].textContent, /falha simulada de rede|Client administrativo/);

  view.dispose();
  console.log("templates-screen.test.js: erro de carregamento mostra mensagem amigável sem lançar ok.");
}

// --- services ausentes/incompletos: mensagem amigável, sem lançar ----------

{
  const root = createRoot();
  const view = renderTemplatesScreen({ root, services: {} });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0);
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);

  view.dispose();
  console.log("templates-screen.test.js: services ausente mostra mensagem amigável sem lançar ok.");
}

// --- route.task="templates.setdefault"&id=N: dispara "Tornar padrão" ------
// automaticamente, sem clique no botão (prova de conceito controller.task,
// ver docs/AUDITORIA-JOOMLA-PENTE-FINO.md §2.7/§3) ---------------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-platform — Padrão (fallback)", Template: "mse-default", ClientId: "Site", Home: false }
  ];
  const { client, updates, store } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const route = { task: "templates.setdefault", id: 2 };
  const view = renderTemplatesScreen({ root, route, services });
  await flush();
  await flush();

  assert.deepEqual(updates, [
    { id: 2, values: { Home: true } },
    { id: 1, values: { Home: false } }
  ]);
  assert.equal(store.get(1).Home, false);
  assert.equal(store.get(2).Home, true);

  view.dispose();
  console.log("templates-screen.test.js: route.task=templates.setdefault dispara Tornar padrão automaticamente ok.");
}

// --- route.task/id ausente ou id inexistente: nenhuma escrita automática --

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-platform — Padrão (fallback)", Template: "mse-default", ClientId: "Site", Home: false }
  ];

  const { client: clientNoRoute, updates: updatesNoRoute } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewNoRoute = renderTemplatesScreen({ root, services: { adminClient: clientNoRoute, listIds: LIST_IDS } });
  await flush();
  assert.equal(updatesNoRoute.length, 0, "sem route.task, nenhuma escrita automática");
  viewNoRoute.dispose();

  const root2 = createRoot();
  const { client: clientBadId, updates: updatesBadId } = createFakeAdminClient({ items: items.map((i) => ({ ...i })) });
  const viewBadId = renderTemplatesScreen({
    root: root2,
    route: { task: "templates.setdefault", id: 999 },
    services: { adminClient: clientBadId, listIds: LIST_IDS }
  });
  await flush();
  await flush();
  assert.equal(updatesBadId.length, 0, "id inexistente não deve causar nenhuma escrita");
  viewBadId.dispose();

  console.log("templates-screen.test.js: route.task sem id válido não dispara escrita ok.");
}

console.log("templates-screen.test.js: verificações concluídas com sucesso.");
