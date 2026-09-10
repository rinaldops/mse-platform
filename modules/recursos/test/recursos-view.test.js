import assert from "node:assert/strict";
import { createRecursosView } from "../recursos-view.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, enabled) { if (enabled) this.values.add(name); else this.values.delete(name); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.className = "";
    this.textContent = "";
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get lastChild() { return this.children[this.children.length - 1]; }
}

function findAll(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

const document = {
  createElement(tag) { return new FakeElement(tag, document); },
  createTextNode(text) { return { nodeType: 3, textContent: text }; }
};
const root = new FakeElement("div", document);
const service = {
  async listGroupedLinks() {
    return [{
      category: "Power Platform",
      links: [
        { Id: 1, Title: "Guia do Power Apps", URL: "https://example.test/guia", Descricao: "Leia o guia", Categoria: "Power Platform", AbrirNovaJanela: true, Ordem: 0 },
        { Id: 2, Title: "Referência de fórmulas", URL: "https://example.test/formulas", Categoria: "Power Platform", AbrirNovaJanela: false, Ordem: 1 }
      ]
    }];
  }
};

const cleanup = createRecursosView({ root, service });
await new Promise((resolve) => setImmediate(resolve));

const shell = root.children[0];
assert.equal(shell.className, "mse-recursos mse-recursos--list");
const [pagebar, page] = shell.children;
assert.equal(pagebar.className, "mse-recursos__pagebar");
const title = findAll(pagebar, (node) => node.className === "mse-recursos__pagebar-title")[0];
assert.equal(title.textContent, "Recursos");

assert.equal(page.className, "mse-recursos__page");
const chips = findAll(page, (node) => node.className?.startsWith?.("mse-recursos__chip") && node.tagName === "BUTTON");
const powerPlatformChip = chips.find((chip) => chip.children.some((child) => child.textContent === "Power Platform"));
assert.ok(powerPlatformChip, "deve haver um chip para Power Platform");
const chipCount = powerPlatformChip.children.find((child) => child.className === "mse-recursos__chip-count");
assert.equal(chipCount.textContent, "2");

const shortcutTitle = findAll(page, (node) => node.className === "mse-recursos__shortcuts-title")[0];
assert.ok(shortcutTitle, "atalhos mais usados deve aparecer sem filtro ativo");

const cards = findAll(page, (node) => node.className === "mse-recursos__card");
assert.equal(cards.length, 2);
const cardTitle = findAll(cards[0], (node) => node.className === "mse-recursos__card-title")[0];
assert.equal(cardTitle.textContent, "Guia do Power Apps");
assert.equal(cards[0].href, "https://example.test/guia");
assert.equal(cards[0].target, "_blank");
assert.equal(cards[1].target, undefined);

cleanup();
assert.equal(root.children.length, 0);

console.log("recursos-view.test.js: verificações concluídas com sucesso.");
