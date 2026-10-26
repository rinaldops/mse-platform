import assert from "node:assert/strict";
import { mount } from "../component.js";

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.innerHTML = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

const document = { createElement(tag) { return new FakeElement(tag, document); } };

await assert.rejects(() => mount({ root: {} }), /root/);
await assert.rejects(() => mount({ root: new FakeElement("div", document), services: {} }), /adminClient/);

const raw = [
  { Id: 1, Title: "Artigo publicado", Alias: "artigo-publicado", Introtext: "Resumo", Fulltext: "<p>Corpo</p>", State: "Published", CatId: 10, Featured: true, Ordering: 1, Created: "2026-01-02T00:00:00Z" },
  { Id: 2, Title: "Outro artigo", Alias: "outro-artigo", Introtext: "", Fulltext: "", State: "Published", CatId: 20, Featured: false, Ordering: 2, Created: "2026-01-01T00:00:00Z" }
];
const categories = [{ Id: 10, Title: "Notícias", Alias: "noticias", Published: "Published" }];

function fakeServices() {
  return {
    adminClient: {
      async getListItems(list, options) {
        if (list.listId === "cat-list") return categories;
        return raw;
      }
    },
    listIds: { MSEContent: { listId: "guid-fake" }, MSECategories: { listId: "cat-list" } }
  };
}

// --- view "list": todos os artigos publicados --------------------------

{
  const root = new FakeElement("div", document);
  const handle = await mount({ root, services: fakeServices(), context: { view: "list", route: { alias: "blog" } } });
  assert.equal(typeof handle.dispose, "function");
  assert.ok(root.children.length > 0);
  handle.dispose();
  assert.equal(root.children.length, 0);
  console.log("component.test.js: view \"list\" monta e dispose() limpa o root ok.");
}

// --- view "featured": só artigos em destaque ----------------------------

{
  const root = new FakeElement("div", document);
  await mount({ root, services: fakeServices(), context: { view: "featured", route: { alias: "blog" } } });
  console.log("component.test.js: view \"featured\" monta sem lançar ok.");
}

// --- view "category": filtra por CatId via context.params.catid --------

{
  const root = new FakeElement("div", document);
  await mount({ root, services: fakeServices(), context: { view: "category", params: { catid: 10 }, route: { alias: "blog" } } });
  console.log("component.test.js: view \"category\" monta sem lançar ok.");
}

// --- view "article": resolve por context.params.id ----------------------

{
  const root = new FakeElement("div", document);
  await mount({ root, services: fakeServices(), context: { view: "article", params: { id: 1 }, route: { alias: "blog" } } });
  console.log("component.test.js: view \"article\" monta sem lançar ok.");
}

// --- falha do client degrada para mensagem de status, sem lançar --------

{
  const root = new FakeElement("div", document);
  const services = {
    adminClient: { async getListItems() { throw new Error("falha de rede simulada"); } },
    listIds: { MSEContent: { listId: "guid-fake" } }
  };
  const handle = await mount({ root, services, context: { view: "list" } });
  assert.equal(typeof handle.dispose, "function");
  assert.ok(root.children.length > 0, "deveria renderizar uma mensagem de status");
  console.log("component.test.js: falha do client degrada para status, sem lançar ok.");
}

console.log("component.test.js (com_content): verificações concluídas com sucesso.");
