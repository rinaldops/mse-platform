import assert from "node:assert/strict";
import { renderMediaScreen } from "../media-screen.js";

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
    this.placeholder = "";
    this.files = null;
    this.onclick = null;
    this.onchange = null;
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

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  addEventListener(type, handler) {
    if (type === "click") this.onclick = handler;
    else if (type === "change") this.onchange = handler;
    else if (type === "input") this.oninput = handler;
  }

  click() {
    return this.onclick?.({ currentTarget: this });
  }

  dispatchInput() {
    return this.oninput?.({ currentTarget: this });
  }

  dispatchChange() {
    return this.onchange?.({ currentTarget: this });
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

const LIST = Object.freeze({ listId: "30000000-0000-4000-8000-000000000001" });
const LIST_IDS = Object.freeze({ MSEMedia: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

/** Fake de `File` — sem `File` real do DOM nos testes do kernel, bastando
 * expor `.name`/`.type`/`.arrayBuffer()` (ver resumo de decisões da sessão).
 */
function createFakeFile({ name, type = "application/octet-stream", bytes = [1, 2, 3] } = {}) {
  return {
    name,
    type,
    async arrayBuffer() {
      return Uint8Array.from(bytes);
    }
  };
}

function createFakeAdminClient({ items = [], shouldReject } = {}) {
  const store = new Map(items.map((item) => [item.Id, { ...item }]));
  const deletes = [];
  const uploads = [];
  let nextId = items.length + 1;
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
      async deleteListItem(_list, id) {
        store.delete(Number(id));
        deletes.push(Number(id));
        return { etag: null, status: 204 };
      },
      async uploadFile(_list, options) {
        uploads.push(options);
        const id = nextId++;
        const item = {
          Id: id,
          FileLeafRef: options.fileName,
          FileRef: `/sites/x/MSEMedia/${options.fileName}`,
          AltText: null,
          Description: null
        };
        store.set(id, item);
        return { file: { Name: options.fileName }, serverRelativeUrl: item.FileRef, etag: `"item-${id}"`, status: 201 };
      }
    },
    deletes,
    uploads,
    store
  };
}

// --- com_media: título + editor montado, tabela com colunas de arquivo ----

{
  const root = createRoot();
  const items = [
    { Id: 1, FileLeafRef: "logo.png", FileRef: "/sites/x/MSEMedia/logo.png", AltText: "Logo", Description: "Logo da marca" },
    { Id: 2, FileLeafRef: "banner.jpg", FileRef: "/sites/x/MSEMedia/banner.jpg", AltText: null, Description: null }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderMediaScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Mídia");

  const headers = textOf(root.querySelectorAll("th"));
  assert.deepEqual(headers, ["Nome", "URL", "Alt", "Descrição", "Ações"]);

  assert.equal(root.querySelectorAll("table")[0].className, "mse-administrator__table");

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 2);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["logo.png", "banner.jpg"]);

  view.dispose();
  console.log("media-screen.test.js: com_media renderiza tabela real ok.");
}

// --- upload: input[type=file] cria item via uploadAdminFile/uploadFile ----

{
  const root = createRoot();
  const { client, uploads } = createFakeAdminClient({ items: [] });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderMediaScreen({ root, services });
  await flush();

  const uploadInput = root.querySelectorAll("input").find((input) => input.type === "file");
  assert.ok(uploadInput, "input[type=file] de envio deve existir no toolbar");

  const fakeFile = createFakeFile({ name: "arquivo.pdf", type: "application/pdf" });
  uploadInput.files = [fakeFile];
  await uploadInput.dispatchChange();
  await flush();

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].fileName, "arquivo.pdf");
  assert.equal(uploads[0].contentType, "application/pdf");
  assert.deepEqual([...uploads[0].content], [1, 2, 3]);

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "arquivo.pdf");

  const success = root.querySelectorAll("p").find((p) => p.className === "mse-administrator__success");
  assert.equal(success.textContent, 'Arquivo "arquivo.pdf" enviado.');

  view.dispose();
  console.log("media-screen.test.js: upload de arquivo cria item via uploadAdminFile ok.");
}

// --- busca: filtra por nome/alt/descrição (client-side) --------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, FileLeafRef: "logo.png", FileRef: "/sites/x/MSEMedia/logo.png", AltText: "Logo", Description: "Logo da marca" },
    { Id: 2, FileLeafRef: "banner.jpg", FileRef: "/sites/x/MSEMedia/banner.jpg", AltText: null, Description: null }
  ];
  const { client } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderMediaScreen({ root, services });
  await flush();

  const search = root.querySelectorAll("input").find((input) => input.type === "search");
  assert.ok(search, "busca do toolbar deve existir");
  search.value = "banner";
  await search.dispatchInput();

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "banner.jpg");

  view.dispose();
  console.log("media-screen.test.js: busca filtra itens por nome/alt/descrição ok.");
}

// --- excluir: botão "Excluir" remove item via deleteAdminItem --------------

{
  const root = createRoot();
  const items = [
    { Id: 1, FileLeafRef: "logo.png", FileRef: "/sites/x/MSEMedia/logo.png", AltText: "Logo", Description: "Logo da marca" }
  ];
  const { client, deletes } = createFakeAdminClient({ items });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderMediaScreen({ root, services });
  await flush();

  const row = root.querySelectorAll("tr")[1];
  const remove = row.querySelectorAll("button").find((b) => b.textContent === "Excluir");
  assert.ok(remove, "botão Excluir deve existir");
  await remove.click();
  await flush();

  assert.deepEqual(deletes, [1]);
  assert.equal(root.querySelectorAll("tr").length, 1, "só o cabeçalho deve restar após excluir o único item");

  view.dispose();
  console.log("media-screen.test.js: botão Excluir remove item via deleteAdminItem ok.");
}

// --- copiar URL: usa navigator.clipboard.writeText quando disponível ------

{
  const originalNavigator = globalThis.navigator;
  const writes = [];
  globalThis.navigator = { clipboard: { async writeText(text) { writes.push(text); } } };
  try {
    const root = createRoot();
    const items = [
      { Id: 1, FileLeafRef: "logo.png", FileRef: "/sites/x/MSEMedia/logo.png", AltText: "Logo", Description: "Logo da marca" }
    ];
    const { client } = createFakeAdminClient({ items });
    const services = { adminClient: client, listIds: LIST_IDS };
    const view = renderMediaScreen({ root, services });
    await flush();

    const row = root.querySelectorAll("tr")[1];
    const copy = row.querySelectorAll("button").find((b) => b.textContent === "Copiar URL");
    assert.ok(copy, "botão Copiar URL deve existir");
    await copy.click();
    await flush();

    assert.deepEqual(writes, ["/sites/x/MSEMedia/logo.png"]);
    const success = root.querySelectorAll("p").find((p) => p.className === "mse-administrator__success");
    assert.equal(success.textContent, "URL copiada para a área de transferência.");

    view.dispose();
  } finally {
    globalThis.navigator = originalNavigator;
  }
  console.log("media-screen.test.js: Copiar URL usa navigator.clipboard.writeText ok.");
}

// --- falha ao carregar: erro 403/412 exibido em mse-administrator__error --

{
  const root = createRoot();
  const { client } = createFakeAdminClient({ items: [], shouldReject: true });
  const services = { adminClient: client, listIds: LIST_IDS };
  const view = renderMediaScreen({ root, services });
  await flush();

  const error = root.querySelectorAll("p").find((p) => p.className === "mse-administrator__error");
  assert.ok(error.textContent.startsWith("Falha ao carregar mídia"));

  view.dispose();
  console.log("media-screen.test.js: falha ao carregar exibe mensagem de erro ok.");
}

console.log("media-screen.test.js: verificações concluídas com sucesso.");
