import assert from "node:assert/strict";
import { createArticlesCategoriesView } from "../articles-categories-view.js";

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

const tree = [
  {
    Id: 10, Title: "Notícias", Alias: "noticias", Description: "Categoria de notícias",
    children: [{ Id: 20, Title: "Sub", Alias: "sub", Description: null, children: [] }]
  }
];
const counts = new Map([[10, 3]]);

const cleanup = createArticlesCategoriesView({ root, tree, counts, showDescription: true });
const section = root.children[0];
assert.equal(section.className, "mse-module-articles-categories");

const links = findAll(section, (node) => node.className === "mse-module-articles-categories__link");
assert.equal(links.length, 2);
assert.equal(links[0].href, "#/noticias");

const countNodes = findAll(section, (node) => node.className === "mse-module-articles-categories__count");
assert.equal(countNodes.length, 1);
assert.equal(countNodes[0].textContent, " (3)");

const descriptions = findAll(section, (node) => node.className === "mse-module-articles-categories__description");
assert.equal(descriptions.length, 1);

cleanup();
assert.equal(root.children.length, 0);

// sem contagem/descrição
{
  const plainRoot = new FakeElement("div", document);
  createArticlesCategoriesView({ root: plainRoot, tree });
  assert.equal(findAll(plainRoot, (node) => node.className === "mse-module-articles-categories__count").length, 0);
}

// árvore vazia
{
  const emptyRoot = new FakeElement("div", document);
  createArticlesCategoriesView({ root: emptyRoot, tree: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-articles-categories__empty").length, 1);
}

assert.throws(() => createArticlesCategoriesView({ root: {} }), /root/);
assert.throws(() => createArticlesCategoriesView({ root, tree: null }), /tree/);

console.log("articles-categories-view.test.js: verificações concluídas com sucesso.");
