import assert from "node:assert/strict";
import { createRecursosView } from "../recursos-view.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
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
}

const document = {
  createElement(tag) { return new FakeElement(tag, document); }
};
const root = new FakeElement("div", document);
const service = {
  async listGroupedLinks() {
    return [{
      category: "Documentação",
      links: [{ Title: "Guia", URL: "https://example.test/guia", Descricao: "Leia o guia" }]
    }];
  }
};

const cleanup = createRecursosView({ root, service });
await new Promise((resolve) => setImmediate(resolve));

const container = root.children[0];
assert.equal(container.className, "mse-recursos__accordion");
const group = container.children[0];
const button = group.children[0];
assert.equal(button.tagName, "BUTTON");
assert.equal(button.attributes.get("aria-expanded"), "true");
assert.equal(button.children[0].textContent, "Documentação");
const links = group.children[1].children[0];
const anchor = links.children[0].children[0];
assert.equal(anchor.children[0].textContent, "Guia");
assert.equal(anchor.href, "https://example.test/guia");

cleanup();
assert.equal(root.children.length, 0);

console.log("recursos-view.test.js: verificações concluídas com sucesso.");
