import assert from "node:assert/strict";
import { createArticlesCategoryView } from "../articles-category-view.js";

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

const articles = [{ id: 1, titulo: "Artigo da categoria", slug: "artigo-da-categoria", resumo: "Resumo" }];

const cleanup = createArticlesCategoryView({ root, articles, routeAlias: "noticias", showIntrotext: true });
const section = root.children[0];
assert.equal(section.className, "mse-module-articles-category");

const links = findAll(section, (node) => node.className === "mse-module-articles-category__link");
assert.equal(links.length, 1);
assert.equal(links[0].href, "#/noticias/1-artigo-da-categoria");

const intros = findAll(section, (node) => node.className === "mse-module-articles-category__intro");
assert.equal(intros.length, 1);

cleanup();
assert.equal(root.children.length, 0);

// lista vazia
{
  const emptyRoot = new FakeElement("div", document);
  createArticlesCategoryView({ root: emptyRoot, articles: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-articles-category__empty").length, 1);
}

assert.throws(() => createArticlesCategoryView({ root: {} }), /root/);
assert.throws(() => createArticlesCategoryView({ root, articles: null }), /articles/);

console.log("articles-category-view.test.js: verificações concluídas com sucesso.");
