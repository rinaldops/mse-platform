import assert from "node:assert/strict";
import { buildPathway, findActiveMenuItem } from "../../../kernel/menu.js";
import { createBreadcrumbsView } from "../breadcrumbs-view.js";

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.className = "";
    this.textContent = "";
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
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

const items = [
  { Id: 1, Title: "Início", Alias: "", ParentId: 0, Ordering: 1, Published: "Published", Default: true },
  { Id: 2, Title: "Blog", Alias: "blog", ParentId: 0, Ordering: 2, Published: "Published", Default: false },
  { Id: 3, Title: "Destaques", Alias: "destaques", ParentId: 2, Ordering: 1, Published: "Published", Default: false }
];

const activeItem = findActiveMenuItem(items, { alias: "destaques" });
const pathway = buildPathway(items, activeItem);

const cleanup = createBreadcrumbsView({ root, pathway });

const nav = root.children[0];
assert.equal(nav.className, "mse-module-breadcrumbs");
assert.equal(nav.attributes.get("aria-label"), "Trilha de navegação");

const links = findAll(nav, (node) => node.className === "mse-module-breadcrumbs__link");
assert.equal(links.length, 1);
assert.equal(links[0].textContent, "Blog");
assert.equal(links[0].href, "#/blog");

const current = findAll(nav, (node) => node.className === "mse-module-breadcrumbs__current")[0];
assert.equal(current.textContent, "Destaques");
assert.equal(current.attributes.get("aria-current"), "page");

const separators = findAll(nav, (node) => node.className === "mse-module-breadcrumbs__separator");
assert.equal(separators.length, 1);

cleanup();
assert.equal(root.children.length, 0);

// pathway vazio: nav sem <ol>
{
  const emptyRoot = new FakeElement("div", document);
  createBreadcrumbsView({ root: emptyRoot, pathway: [] });
  assert.equal(findAll(emptyRoot, (node) => node.className === "mse-module-breadcrumbs__list").length, 0);
}

assert.throws(() => createBreadcrumbsView({ root: {} }), /root/);
assert.throws(() => createBreadcrumbsView({ root, pathway: null }), /pathway/);

console.log("breadcrumbs-view.test.js: verificações concluídas com sucesso.");
