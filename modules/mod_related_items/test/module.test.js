import assert from "node:assert/strict";
import { mount } from "../module.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.className = "";
    this.textContent = "";
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

const document = { createElement(tag) { return new FakeElement(tag, document); } };

await assert.rejects(() => mount({ root: {} }), /root/);

const root = new FakeElement("div", document);
await assert.rejects(
  () => mount({ root, services: {} }),
  /adminClient/
);

const artigos = [
  { Id: 1, titulo: "Artigo principal", slug: "artigo-principal", estadoEditorial: "Publicado", tags: JSON.stringify(["noticias"]) },
  { Id: 2, titulo: "Artigo relacionado", slug: "artigo-relacionado", estadoEditorial: "Publicado", tags: JSON.stringify(["noticias", "extra"]) },
  { Id: 3, titulo: "Sem relação", slug: "sem-relacao", estadoEditorial: "Publicado", tags: JSON.stringify(["outratag"]) }
];
const services = {
  adminClient: { async getListItems() { return artigos; } },
  listIds: { MSEPublicacoes: { listId: "guid-fake" } }
};

const handle = await mount({ root, services, context: { route: { alias: "", id: 1, slug: "artigo-principal" } } });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
handle.dispose();
assert.equal(root.children.length, 0);

// sem rota de artigo (ex.: página inicial): estado vazio, sem erro.
{
  const homeRoot = new FakeElement("div", document);
  const homeHandle = await mount({ root: homeRoot, services, context: { route: { alias: "" } } });
  assert.ok(homeRoot.children[0].textContent === undefined || homeRoot.children.length > 0);
  homeHandle.dispose();
}

// erro de rede no service não quebra o módulo: mostra status.
{
  const errorRoot = new FakeElement("div", document);
  const errorServices = {
    adminClient: { async getListItems() { throw new Error("falhou"); } },
    listIds: { MSEPublicacoes: { listId: "guid-fake" } }
  };
  const errorHandle = await mount({ root: errorRoot, services: errorServices, context: { route: { id: 1 } } });
  assert.ok(errorRoot.children[0].textContent.includes("Não foi possível"));
  errorHandle.dispose();
}

console.log("related-items module.test.js: verificações concluídas com sucesso.");
