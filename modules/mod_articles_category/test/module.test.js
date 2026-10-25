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
  /adminClient/
);

const articles = [
  {
    Id: 1, Title: "Artigo categoria", Slug: "artigo-categoria", Resumo: "Resumo", CorpoHtmlSeguroV1: "",
    EstadoEditorial: "Publicado", CategoriaTexto: "noticias", TagsTexto: "[]", Destaque: false,
    DataPublicacao: null, DataExpiracao: null, ImagemUrl: null, Created: "2026-01-02T00:00:00Z"
  }
];
const categories = [{ Id: 10, Title: "Notícias", Alias: "noticias", Published: "Published" }];
const services = {
  adminClient: {
    async getListItems(list) {
      if (list.listId === "cat-guid") return categories;
      return articles;
    }
  },
  listIds: { CAMAPPublicacoes: { listId: "guid-fake" }, MSECategories: { listId: "cat-guid" } }
};

const handle = await mount({ root, services, context: { route: { alias: "destaques" } }, config: { categoriaId: "noticias" } });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
handle.dispose();
assert.equal(root.children.length, 0);

console.log("articles-category module.test.js: verificações concluídas com sucesso.");
