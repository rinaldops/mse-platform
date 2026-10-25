import assert from "node:assert/strict";
import { createSimilarArticlesView } from "../similar-view.js";

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
  { id: 2, titulo: "Artigo similar", slug: "artigo-similar" },
  { id: 3, titulo: "Outro similar", slug: null }
];
const cleanup = createSimilarArticlesView({ root, articles });

const wrapper = root.children[0];
assert.equal(wrapper.className, "mse-module-tags-similar");

const links = findAll(wrapper, (node) => node.className === "mse-module-tags-similar__link");
assert.equal(links.length, 2);
// serializeRoute({ alias: "", id, slug }) produz "#//<id>-<slug>" (alias
// vazio preservado literalmente antes da barra do segmento id/slug — ver
// kernel/router.js#serializeRoute).
const primeiroLink = links.find((link) => link.textContent === "Artigo similar");
assert.equal(primeiroLink.href, "#//2-artigo-similar");
const segundoLink = links.find((link) => link.textContent === "Outro similar");
assert.equal(segundoLink.href, "#//3");

cleanup();
assert.equal(root.children.length, 0);

// sem artigos: mensagem de "sem sugestões"
{
  const emptyRoot = new FakeElement("div", document);
  createSimilarArticlesView({ root: emptyRoot, articles: [], noResultsText: "Sem sugestões por aqui." });
  const empty = findAll(emptyRoot, (node) => node.className === "mse-module-tags-similar__empty")[0];
  assert.equal(empty.textContent, "Sem sugestões por aqui.");
}

assert.throws(() => createSimilarArticlesView({ root: {} }), /root/);
assert.throws(() => createSimilarArticlesView({ root, articles: null }), /articles/);

console.log("similar-view.test.js: verificações concluídas com sucesso.");
