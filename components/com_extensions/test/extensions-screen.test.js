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

function createFakeAdminClient({ items, shouldReject } = {}) {
  return {
    async getListItems() {
      if (shouldReject) throw new Error("falha simulada de rede");
      return items;
    }
  };
}

const LIST_IDS = Object.freeze({
  MSEExtensoes: LIST,
  MSEMenu: LIST,
  MSEModulos: LIST
});

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_extensions: título + editor CRUD montado (dados reais via reload) --

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Blog", Tipo: "Componente", Elemento: "blog", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: null, ParamsJson: null },
    { Id: 2, Title: "SD", Tipo: "Modulo", Elemento: "sd", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: 1, ParamsJson: "{}" }
  ];
  const services = { adminClient: createFakeAdminClient({ items }), listIds: LIST_IDS };
  const view = renderExtensionsScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Extensões");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Tipo", "Elemento", "Versão", "Habilitada", "Protegida", "Ações"];
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
  const services = { adminClient: createFakeAdminClient({ shouldReject: true }), listIds: LIST_IDS };
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

console.log("extensions-screen.test.js: verificações concluídas com sucesso.");
