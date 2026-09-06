import assert from "node:assert/strict";
import { mountCarousel } from "../carousel.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.ownerDocument = null;
    this.style = { transform: "" };
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

const document = {
  createElement(tag) { const node = new FakeElement(tag); node.ownerDocument = document; return node; }
};
const timers = new Map();
let timerId = 0;
const window = {
  matchMedia: () => ({ matches: false }),
  setInterval(callback) { const id = ++timerId; timers.set(id, callback); return id; },
  clearInterval(id) { timers.delete(id); }
};
const root = new FakeElement("div");
root.ownerDocument = document;
const carousel = mountCarousel({
  root,
  items: ["A", "B"],
  autoAdvance: 1000,
  window,
  renderItem(item, index, ownerDocument) {
    const node = ownerDocument.createElement("span");
    node.textContent = `${index}:${item}`;
    return node;
  }
});
assert.equal(root.attributes.get("aria-label"), "Carrossel");
assert.equal(root.attributes.get("aria-roledescription"), "carrossel");
assert.equal(root.children[0].children[0].attributes.get("aria-hidden"), "false");
assert.equal(root.children[0].children[1].attributes.get("aria-hidden"), "true");
assert.equal(timers.size, 1);
carousel.next();
assert.equal(root.children[0].children[0].attributes.get("aria-hidden"), "true");
assert.equal(root.children[0].children[1].attributes.get("aria-hidden"), "false");
root.listeners.get("keydown")({ key: "ArrowLeft", preventDefault() {} });
assert.equal(root.children[0].children[0].attributes.get("aria-hidden"), "false");
carousel.destroy();
assert.equal(timers.size, 0);
assert.equal(root.children.length, 0);

console.log("carousel.test.js: verificações concluídas com sucesso.");
