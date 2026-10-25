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
    Id: 1, Title: "Destaque A", Slug: "destaque-a", Resumo: "Resumo A", CorpoHtmlSeguroV1: "",
    EstadoEditorial: "Publicado", CategoriaTexto: null, TagsTexto: "[]", Destaque: true, OrdemDestaque: 1,
    DataPublicacao: "2026-01-01T00:00:00Z", DataExpiracao: null, ImagemUrl: null, Created: "2026-01-02T00:00:00Z"
  }
];
const services = {
  adminClient: { async getListItems() { return articles; } },
  listIds: { CAMAPPublicacoes: { listId: "guid-fake" } }
};

const handle = await mount({ root, services, context: { route: { alias: "destaques" } } });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
handle.dispose();
assert.equal(root.children.length, 0);

console.log("articles-news module.test.js: verificações concluídas com sucesso.");
