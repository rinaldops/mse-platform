import assert from "node:assert/strict";
import { mountAccordion } from "../accordion.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  toggle(name, enabled) { if (enabled) this.values.add(name); else this.values.delete(name); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.ownerDocument = null;
    this.textContent = "";
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  click() { this.listeners.get("click")?.(); }
}

const document = {
  createElement(tag) { const node = new FakeElement(tag); node.ownerDocument = document; return node; }
};
const root = new FakeElement("div");
root.ownerDocument = document;
const accordion = mountAccordion({
  root,
  items: [
    { title: "Primeiro", content: "Conteúdo 1" },
    { title: "Segundo", content: "Conteúdo 2" }
  ]
});
const first = root.children[0];
const second = root.children[1];
assert.equal(first.children[0].attributes.get("aria-expanded"), "true");
assert.equal(second.children[0].attributes.get("aria-expanded"), "false");
second.children[0].click();
assert.equal(first.children[0].attributes.get("aria-expanded"), "false");
assert.equal(second.children[0].attributes.get("aria-expanded"), "true");
assert.equal(accordion.close(1), true);
assert.equal(second.children[0].attributes.get("aria-expanded"), "false");
accordion.destroy();
assert.equal(root.children.length, 0);

console.log("accordion.test.js: verificações concluídas com sucesso.");
