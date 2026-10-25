import assert from "node:assert/strict";
import { createArticlesLatestView } from "../articles-latest-view.js";

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
  { id: 1, titulo: "Primeiro artigo", slug: "primeiro-artigo" },
  { id: 2, titulo: "Segundo artigo", slug: "segundo-artigo" }
];

const cleanup = createArticlesLatestView({ root, articles, routeAlias: "destaques" });
const section = root.children[0];
assert.equal(section.className, "mse-module-articles-latest");

const links = findAll(section, (node) => node.className === "mse-module-articles-latest__link");
assert.equal(links.length, 2);
assert.equal(links[0].textContent, "Primeiro artigo");
assert.equal(links[0].href, "#/destaques/1-primeiro-artigo");

cleanup();
assert.equal(root.children.length, 0);

// lista vazia
{
  const emptyRoot = new FakeElement("div", document);
  createArticlesLatestView({ root: emptyRoot, articles: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-articles-latest__empty").length, 1);
}

assert.throws(() => createArticlesLatestView({ root: {} }), /root/);
assert.throws(() => createArticlesLatestView({ root, articles: null }), /articles/);

console.log("articles-latest-view.test.js: verificações concluídas com sucesso.");
