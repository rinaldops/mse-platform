import assert from "node:assert/strict";
import { renderPublisherScreen } from "../screens/publisher.js";

// --- FakeElement/document mínimos (mesmo padrão de administrator/test/collections.test.js) --

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
    this.name = "";
    this.checked = false;
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

  click() {
    if (typeof this.onclick === "function") this.onclick({ target: this });
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

function findErrorParagraph(root) {
  return root.querySelectorAll("p").find((p) => String(p.className || "").includes("mse-administrator__error"));
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const LIST = Object.freeze({ listId: "20000000-0000-4000-8000-0000000000AA" });
const LIST_IDS = Object.freeze({ CAMAPPublicacoes: LIST });

const DEFAULT_SANITIZE = (html) => String(html ?? "");

function createFakeAdminClient({ items, failUpdateStatus, failCreateStatus } = {}) {
  const db = new Map((items || []).map((it) => [it.Id, { ...it }]));
  let nextId = Math.max(0, ...db.keys()) + 1;
  const calls = [];

  return {
    calls,
    async getListItems(_list, options) {
      calls.push({ op: "getListItems", options });
      const all = [...db.values()];
      // ordenação simples Id desc quando solicitada
      if (options?.orderBy && /Id\s+desc/i.test(options.orderBy)) all.sort((a, b) => b.Id - a.Id);
      return all;
    },
    async createListItem(_list, values) {
      calls.push({ op: "createListItem", values });
      if (failCreateStatus) {
        const err = new Error(`HTTP ${failCreateStatus}`);
        err.status = failCreateStatus;
        throw err;
      }
      const item = { Id: nextId++, ...values };
      db.set(item.Id, item);
      return { item, etag: '"1"', status: 201 };
    },
    async getListItem(_list, id) {
      calls.push({ op: "getListItem", id });
      if (!db.has(id)) throw new Error("not found");
      return { item: db.get(id), etag: '"etag-current"', status: 200 };
    },
    async updateListItem(_list, id, values, options) {
      calls.push({ op: "updateListItem", id, values, options });
      assert.equal(options?.etag, '"etag-current"', "updateListItem deve receber ETag buscada via getListItem");
      if (failUpdateStatus) {
        const err = new Error(`HTTP ${failUpdateStatus}`);
        err.status = failUpdateStatus;
        throw err;
      }
      if (!db.has(id)) throw new Error("not found");
      const updated = { ...db.get(id), ...values };
      db.set(id, updated);
      return { item: updated, etag: '"2"', status: 204 };
    }
  };
}

// --- Render inicial: tabela com itens + formulário em modo novo ------------
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({
    items: [
      { Id: 1, Title: "A", Slug: "a", EstadoEditorial: "Publicado", Destaque: true, CategoriaTexto: "X" },
      { Id: 2, Title: "B", Slug: "b", EstadoEditorial: "Despublicado", Destaque: false, CategoriaTexto: "Y" }
    ]
  });

  const view = renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Publicador");

  const rows = root.querySelectorAll("tr").slice(1); // pula cabeçalho
  assert.equal(rows.length, 2);
  assert.equal(rows[0].querySelectorAll("td")[1].textContent, "B", "ordenado por Id desc");

  view.dispose();
  assert.equal(root.children.length, 0);

  console.log("publisher.test.js: render inicial/tabela ok.");
}

// --- Criar novo artigo: click Novo -> preencher Title -> Salvar chama createListItem
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({ items: [] });
  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  const buttons = root.querySelectorAll("button");
  const btnNovo = buttons.find((b) => b.textContent === "Novo artigo");
  const btnSalvar = buttons.find((b) => b.textContent === "Salvar");
  assert.ok(btnNovo && btnSalvar);

  btnNovo.click();

  const inputs = root.querySelectorAll("input");
  const titleInput = inputs.find((i) => i.name === "Title");
  titleInput.value = "Novo";

  const btnSalvarNovo = root.querySelectorAll("button").find((b) => b.textContent === "Salvar");
  btnSalvarNovo.click();
  await flush();

  assert.ok(adminClient.calls.some((c) => c.op === "createListItem" && c.values.Title === "Novo"));
  console.log("publisher.test.js: criar artigo chama createListItem ok.");
}

// --- Datas: preencher DataPublicacao em datetime-local deve persistir em ISO (toISOString)
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({ items: [] });
  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  const btnSalvar = root.querySelectorAll("button").find((b) => b.textContent === "Salvar");
  const titleInput = root.querySelectorAll("input").find((i) => i.name === "Title");
  const dataPub = root.querySelectorAll("input").find((i) => i.name === "DataPublicacao");

  titleInput.value = "Com data";
  dataPub.value = "2026-10-18T09:00";

  btnSalvar.click();
  await flush();

  const call = adminClient.calls.find((c) => c.op === "createListItem");
  assert.ok(call);
  assert.equal(call.values.Title, "Com data");
  assert.ok(typeof call.values.DataPublicacao === "string" && /Z$/.test(call.values.DataPublicacao), "DataPublicacao deve ser ISO (UTC) ao salvar");
  assert.ok(!Number.isNaN(new Date(call.values.DataPublicacao).getTime()), "DataPublicacao persistida deve ser parseável");

  console.log("publisher.test.js: datas (datetime-local -> ISO) ok.");
}

// --- Sanitização: deve usar services.sanitizeHtml quando fornecido
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({ items: [] });
  const sanitizeHtml = (html) => `<p>SAFE:${String(html).replace(/</g, "[")}</p>`;

  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml } });
  await flush();

  const btnSalvar = root.querySelectorAll("button").find((b) => b.textContent === "Salvar");
  const titleInput = root.querySelectorAll("input").find((i) => i.name === "Title");
  const body = root.querySelectorAll("textarea").find((t) => t.name === "CorpoHtmlSeguroV1");

  titleInput.value = "Com HTML";
  body.value = "<script>alert(1)</script><p>ok</p>";

  btnSalvar.click();
  await flush();

  const call = adminClient.calls.find((c) => c.op === "createListItem");
  assert.ok(call);
  assert.equal(call.values.CorpoHtmlSeguroV1, "<p>SAFE:[script>alert(1)[/script>[p>ok[/p></p>");

  console.log("publisher.test.js: sanitização (services.sanitizeHtml) ok.");
}

// --- Estado editorial inválido deve bloquear persistência
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({ items: [] });
  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  const titleInput = root.querySelectorAll("input").find((i) => i.name === "Title");
  titleInput.value = "Invalido";

  const estado = root.querySelectorAll("select").find((s) => s.name === "EstadoEditorial");
  estado.value = "Invalido";

  const btnSalvar = root.querySelectorAll("button").find((b) => b.textContent === "Salvar");
  btnSalvar.click();
  await flush();

  assert.ok(!adminClient.calls.some((c) => c.op === "createListItem"), "não deve criar quando estado é inválido");
  const err = findErrorParagraph(root);
  assert.ok(err && /Estado editorial inválido/i.test(err.textContent));

  console.log("publisher.test.js: validação de estado editorial ok.");
}

// --- Editar artigo existente: click Editar -> altera Title -> Salvar chama getListItem + updateListItem com ETag
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({ items: [{ Id: 10, Title: "Antigo", Slug: "antigo", EstadoEditorial: "Publicado" }] });
  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  const editButtons = root.querySelectorAll("button").filter((b) => b.textContent === "Editar");
  assert.equal(editButtons.length, 1);
  editButtons[0].click();

  const titleInput = root.querySelectorAll("input").find((i) => i.name === "Title");
  titleInput.value = "Atualizado";

  const btnSalvar = root.querySelectorAll("button").find((b) => b.textContent === "Salvar");
  btnSalvar.click();
  await flush();

  assert.ok(adminClient.calls.some((c) => c.op === "getListItem" && c.id === 10), "deve buscar ETag antes");
  assert.ok(adminClient.calls.some((c) => c.op === "updateListItem" && c.id === 10 && c.values.Title === "Atualizado"));
  console.log("publisher.test.js: editar artigo usa ETag via getListItem ok.");
}

// --- HTTP 403 ao salvar deve virar mensagem amigável
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({
    items: [{ Id: 11, Title: "Sem perm", Slug: "x", EstadoEditorial: "Publicado" }],
    failUpdateStatus: 403
  });

  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  root.querySelectorAll("button").find((b) => b.textContent === "Editar").click();
  root.querySelectorAll("input").find((i) => i.name === "Title").value = "Tenta";

  root.querySelectorAll("button").find((b) => b.textContent === "Salvar").click();
  await flush();

  const err = findErrorParagraph(root);
  assert.ok(err);
  assert.ok(/403/.test(err.textContent) && /sem permissão/i.test(err.textContent));

  console.log("publisher.test.js: tratamento HTTP 403 ok.");
}

// --- HTTP 412 ao salvar deve virar mensagem amigável (conflito/ETag)
{
  const root = createRoot();
  const adminClient = createFakeAdminClient({
    items: [{ Id: 12, Title: "Conflito", Slug: "y", EstadoEditorial: "Publicado" }],
    failUpdateStatus: 412
  });

  renderPublisherScreen({ root, services: { adminClient, listIds: LIST_IDS, sanitizeHtml: (html) => html } });
  await flush();

  root.querySelectorAll("button").find((b) => b.textContent === "Editar").click();
  root.querySelectorAll("input").find((i) => i.name === "Title").value = "Tenta";

  root.querySelectorAll("button").find((b) => b.textContent === "Salvar").click();
  await flush();

  const err = findErrorParagraph(root);
  assert.ok(err);
  assert.ok(/412/.test(err.textContent) && /conflito/i.test(err.textContent));

  console.log("publisher.test.js: tratamento HTTP 412 ok.");
}

console.log("publisher.test.js: verificações concluídas com sucesso.");