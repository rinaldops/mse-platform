import assert from "node:assert/strict";
import { buildMenuTree, findActiveMenuItem } from "../../../kernel/menu.js";
import { createMenuView } from "../menu-view.js";

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
    this.attributes = new Map();
    this.classList = new FakeClassList();
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
  { Id: 1, Title: "Início", Alias: "", ParentId: 0, Ordering: 1, Target: "SameTab", Published: "Published", Default: true },
  { Id: 2, Title: "Blog", Alias: "blog", ParentId: 0, Ordering: 2, Target: "SameTab", Published: "Published", Default: false },
  { Id: 3, Title: "Destaques", Alias: "destaques", ParentId: 2, Ordering: 1, Target: "NewTab", Published: "Published", Default: false }
];

const tree = buildMenuTree(items);
const activeItem = findActiveMenuItem(items, { alias: "destaques" });

const cleanup = createMenuView({ root, tree, activeItem });

const nav = root.children[0];
assert.equal(nav.className, "mse-module-menu");
assert.equal(nav.attributes.get("aria-label"), "Menu principal");

const links = findAll(nav, (node) => node.className === "mse-module-menu__link");
assert.equal(links.length, 3);
const destaquesLink = links.find((link) => link.textContent === "Destaques");
assert.equal(destaquesLink.attributes.get("aria-current"), "page");
assert.equal(destaquesLink.target, "_blank");
assert.equal(destaquesLink.rel, "noopener noreferrer");

const inicioLink = links.find((link) => link.textContent === "Início");
assert.equal(inicioLink.href, "#/");
assert.equal(inicioLink.attributes.get("aria-current"), undefined);

const activeItems = findAll(nav, (node) => node.classList.contains("mse-module-menu__item--active"));
assert.equal(activeItems.length, 1);

cleanup();
assert.equal(root.children.length, 0);

// sem itens: mensagem de vazio
{
  const emptyRoot = new FakeElement("div", document);
  createMenuView({ root: emptyRoot, tree: [], activeItem: null });
  const empty = findAll(emptyRoot, (node) => node.className === "mse-module-menu__empty")[0];
  assert.ok(empty, "deve mostrar mensagem quando não há itens");
}

assert.throws(() => createMenuView({ root: {} }), /root/);
assert.throws(() => createMenuView({ root, tree: null }), /tree/);

console.log("menu-view.test.js: verificações concluídas com sucesso.");
