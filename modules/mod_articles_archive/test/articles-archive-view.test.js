import assert from "node:assert/strict";
import { createArticlesArchiveView } from "../articles-archive-view.js";

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

const articles = [{ id: 1, titulo: "Artigo arquivado", slug: "artigo-arquivado" }];

const cleanup = createArticlesArchiveView({ root, articles, routeAlias: "arquivo" });
const section = root.children[0];
assert.equal(section.className, "mse-module-articles-archive");

const links = findAll(section, (node) => node.className === "mse-module-articles-archive__link");
assert.equal(links.length, 1);
assert.equal(links[0].href, "#/arquivo/1-artigo-arquivado");

cleanup();
assert.equal(root.children.length, 0);

// lista vazia
{
  const emptyRoot = new FakeElement("div", document);
  createArticlesArchiveView({ root: emptyRoot, articles: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-articles-archive__empty").length, 1);
}

assert.throws(() => createArticlesArchiveView({ root: {} }), /root/);
assert.throws(() => createArticlesArchiveView({ root, articles: null }), /articles/);

console.log("articles-archive-view.test.js: verificações concluídas com sucesso.");
