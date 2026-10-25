import assert from "node:assert/strict";
import { createArticlesPopularView } from "../articles-popular-view.js";

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

const articles = [{ id: 1, titulo: "Artigo mais acessado", slug: "artigo-mais-acessado" }];

const cleanup = createArticlesPopularView({ root, articles, routeAlias: "destaques" });
const section = root.children[0];
assert.equal(section.className, "mse-module-articles-popular");

const links = findAll(section, (node) => node.className === "mse-module-articles-popular__link");
assert.equal(links.length, 1);
assert.equal(links[0].href, "#/destaques/1-artigo-mais-acessado");

cleanup();
assert.equal(root.children.length, 0);

// lista vazia
{
  const emptyRoot = new FakeElement("div", document);
  createArticlesPopularView({ root: emptyRoot, articles: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-articles-popular__empty").length, 1);
}

assert.throws(() => createArticlesPopularView({ root: {} }), /root/);
assert.throws(() => createArticlesPopularView({ root, articles: null }), /articles/);

console.log("articles-popular-view.test.js: verificações concluídas com sucesso.");
