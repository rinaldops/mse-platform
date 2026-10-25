import assert from "node:assert/strict";
import { createRelatedArticlesView } from "../related-view.js";

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.className = "";
    this.textContent = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

function findAll(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

const document = { createElement(tag) { return new FakeElement(tag, document); } };
const root = new FakeElement("div", document);

const articles = [
  { id: 2, titulo: "Artigo relacionado", slug: "artigo-relacionado", criadoEm: "2026-01-15T00:00:00Z" },
  { id: 3, titulo: "Outro relacionado", slug: null }
];
const cleanup = createRelatedArticlesView({ root, articles });

const wrapper = root.children[0];
assert.equal(wrapper.className, "mse-module-related-items");

const links = findAll(wrapper, (node) => node.className === "mse-module-related-items__link");
assert.equal(links.length, 2);
// serializeRoute({ alias: "", id, slug }) produz "#//<id>-<slug>" (alias
// vazio preservado literalmente antes da barra do segmento id/slug — ver
// kernel/router.js#serializeRoute).
const primeiroLink = links.find((link) => link.textContent === "Artigo relacionado");
assert.equal(primeiroLink.href, "#//2-artigo-relacionado");
const segundoLink = links.find((link) => link.textContent === "Outro relacionado");
assert.equal(segundoLink.href, "#//3");

// showDate desabilitado (padrão): nenhum nó de data.
assert.equal(findAll(wrapper, (node) => node.className === "mse-module-related-items__date").length, 0);

cleanup();
assert.equal(root.children.length, 0);

// showDate habilitado: exibe data formatada ao lado do título.
{
  const dateRoot = new FakeElement("div", document);
  createRelatedArticlesView({ root: dateRoot, articles, showDate: true });
  const dates = findAll(dateRoot, (node) => node.className === "mse-module-related-items__date");
  assert.equal(dates.length, 1); // só o artigo com criadoEm válido gera nó de data
}

// sem artigos: mensagem de "sem relacionados"
{
  const emptyRoot = new FakeElement("div", document);
  createRelatedArticlesView({ root: emptyRoot, articles: [], noResultsText: "Nada por aqui." });
  const empty = findAll(emptyRoot, (node) => node.className === "mse-module-related-items__empty")[0];
  assert.equal(empty.textContent, "Nada por aqui.");
}

assert.throws(() => createRelatedArticlesView({ root: {} }), /root/);
assert.throws(() => createRelatedArticlesView({ root, articles: null }), /articles/);

console.log("related-view.test.js: verificações concluídas com sucesso.");
