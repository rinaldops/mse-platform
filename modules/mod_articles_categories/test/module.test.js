import assert from "node:assert/strict";
import { mount } from "../module.js";

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
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
  /MSECategories/
);

const categories = [
  { Id: 10, Title: "Notícias", Alias: "noticias", ParentId: null, Ordering: 1, Published: "Published", Description: "Categoria de notícias" },
  { Id: 11, Title: "Eventos", Alias: "eventos", ParentId: null, Ordering: 2, Published: "Published" }
];
const articles = [
  { Id: 1, Title: "A", EstadoEditorial: "Publicado", CategoriaTexto: "noticias", Created: "2026-01-01T00:00:00Z" }
];
const services = {
  adminClient: {
    async getListItems(list) {
      if (list.listId === "cat-guid") return categories;
      return articles;
    }
  },
  listIds: { MSECategories: { listId: "cat-guid" } }
};

// sem numitems: não deve precisar ler articles
const handle = await mount({ root, services, config: { showDescription: true } });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
handle.dispose();
assert.equal(root.children.length, 0);

// com numitems: lê articles e conta por categoria
const handle2 = await mount({ root, services, config: { numitems: true } });
assert.ok(root.children.length > 0);
handle2.dispose();

console.log("articles-categories module.test.js: verificações concluídas com sucesso.");

const repositoryRoot = new FakeElement("div", document);
const repositoryServices = {
  repositories: {
    mseCategories: {
      async findMany() {
        return { items: [{ id: 10, title: "Notícias", alias: "noticias", parentId: 0, ordering: 1, published: "Published" }] };
      }
    }
  }
};
const repositoryHandle = await mount({ root: repositoryRoot, services: repositoryServices });
assert.ok(repositoryRoot.children.length > 0);
repositoryHandle.dispose();
