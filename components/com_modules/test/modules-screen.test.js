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

function createFakeAdminClient({ items, shouldReject } = {}) {
  return {
    async getListItems() {
      if (shouldReject) throw new Error("falha simulada de rede");
      return items;
    }
  };
}

const LIST_IDS = Object.freeze({ MSEModulos: LIST });

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_modules: título + editor CRUD montado, schema de MSEModulos -------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "sd-principal", ModuloTipo: "sd", Posicao: "home-a", Ordem: 1, Estado: "Publicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null, AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null },
    { Id: 2, Title: "footer-principal", ModuloTipo: "footer", Posicao: "rodape", Ordem: 1, Estado: "Publicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null, AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null },
    { Id: 3, Title: "mc-principal", ModuloTipo: "mc", Posicao: "home-c", Ordem: 1, Estado: "Publicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null, AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null }
  ];
  const services = { adminClient: createFakeAdminClient({ items }), listIds: LIST_IDS };
  const view = renderModulesScreen({ root, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Módulos");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Tipo", "Posição", "Ordem", "Estado", "Atribuição", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 3);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["sd-principal", "footer-principal", "mc-principal"]);

  view.dispose();
  console.log("modules-screen.test.js: com_modules renderiza tabela real ok.");
}

console.log("modules-screen.test.js: verificações concluídas com sucesso.");
