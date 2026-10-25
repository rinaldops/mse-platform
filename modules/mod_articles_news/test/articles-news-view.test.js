import assert from "node:assert/strict";
import { createArticlesNewsView } from "../articles-news-view.js";

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
  { id: 1, titulo: "Primeiro destaque", slug: "primeiro-destaque", resumo: "Um resumo curto" }
];

const cleanup = createArticlesNewsView({ root, articles, routeAlias: "destaques", showIntrotext: true });
const section = root.children[0];
assert.equal(section.className, "mse-module-articles-news");

const links = findAll(section, (node) => node.className === "mse-module-articles-news__link");
assert.equal(links.length, 1);
assert.equal(links[0].href, "#/destaques/1-primeiro-destaque");

const intros = findAll(section, (node) => node.className === "mse-module-articles-news__intro");
assert.equal(intros.length, 1);
assert.equal(intros[0].textContent, "Um resumo curto");

cleanup();
assert.equal(root.children.length, 0);

// showIntrotext false: sem resumo
{
  const noIntroRoot = new FakeElement("div", document);
  createArticlesNewsView({ root: noIntroRoot, articles, showIntrotext: false });
  assert.equal(findAll(noIntroRoot, (node) => node.className === "mse-module-articles-news__intro").length, 0);
}

// lista vazia
{
  const emptyRoot = new FakeElement("div", document);
  createArticlesNewsView({ root: emptyRoot, articles: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-articles-news__empty").length, 1);
}

assert.throws(() => createArticlesNewsView({ root: {} }), /root/);
assert.throws(() => createArticlesNewsView({ root, articles: null }), /articles/);

console.log("articles-news-view.test.js: verificações concluídas com sucesso.");
