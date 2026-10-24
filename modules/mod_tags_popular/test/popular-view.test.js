import assert from "node:assert/strict";
import { createPopularTagsView } from "../popular-view.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.classList = new FakeClassList();
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

const tags = [{ tag: "noticias", count: 5 }, { tag: "eventos", count: 1 }];
const cleanup = createPopularTagsView({ root, tags, displayCount: true });

const wrapper = root.children[0];
assert.equal(wrapper.className, "mse-module-tags-popular");

const links = findAll(wrapper, (node) => node.className?.includes?.("mse-module-tags-popular__tag"));
assert.equal(links.length, 2);
const noticiasLink = links.find((link) => link.textContent === "noticias");
assert.equal(noticiasLink.href, "#/?tag=noticias");
assert.ok(noticiasLink.className.includes("--size-5"));
const eventosLink = links.find((link) => link.textContent === "eventos");
assert.ok(eventosLink.className.includes("--size-1"));

const counts = findAll(wrapper, (node) => node.className === "mse-module-tags-popular__count");
assert.equal(counts.length, 2);
assert.equal(counts.find((count) => count.textContent === "5") !== undefined, true);

cleanup();
assert.equal(root.children.length, 0);

// sem tags: mensagem de "sem resultados"
{
  const emptyRoot = new FakeElement("div", document);
  createPopularTagsView({ root: emptyRoot, tags: [], noResultsText: "Nada por aqui." });
  const empty = findAll(emptyRoot, (node) => node.className === "mse-module-tags-popular__empty")[0];
  assert.equal(empty.textContent, "Nada por aqui.");
}

// contagem igual entre todas as tags: nível médio (3)
{
  const flatRoot = new FakeElement("div", document);
  createPopularTagsView({ root: flatRoot, tags: [{ tag: "a", count: 2 }, { tag: "b", count: 2 }] });
  const flatLinks = findAll(flatRoot, (node) => node.className?.includes?.("mse-module-tags-popular__tag"));
  assert.ok(flatLinks.every((link) => link.className.includes("--size-3")));
}

assert.throws(() => createPopularTagsView({ root: {} }), /root/);
assert.throws(() => createPopularTagsView({ root, tags: null }), /tags/);

console.log("popular-view.test.js: verificações concluídas com sucesso.");
