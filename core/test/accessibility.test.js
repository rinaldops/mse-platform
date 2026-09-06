import assert from "node:assert/strict";
import {
  announce,
  createFocusTrap,
  handleEscape,
  prefersReducedMotion,
  setDisclosure
} from "../accessibility.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.ownerDocument = null;
    this.offsetParent = {};
    this.id = "";
    this.textContent = "";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  dispatch(type, event) {
    this.listeners.get(type)?.(event);
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  append(...children) { this.children.push(...children); }
  remove() { this.removed = true; }
  focus() { this.ownerDocument.activeElement = this; this.focused = true; }
  querySelectorAll() { return this.children; }
}

const document = {
  activeElement: null,
  body: new FakeElement("body"),
  documentElement: new FakeElement("html"),
  createElement(tag) {
    const node = new FakeElement(tag);
    node.ownerDocument = document;
    return node;
  }
};

document.body.ownerDocument = document;
const window = { matchMedia: () => ({ matches: true }) };
assert.equal(prefersReducedMotion({ window }), true);

const target = new FakeElement("div");
let escaped = 0;
const cleanupEscape = handleEscape(target, () => escaped += 1);
target.dispatch("keydown", { key: "Escape" });
target.dispatch("keydown", { key: "Enter" });
assert.equal(escaped, 1);
cleanupEscape();
target.dispatch("keydown", { key: "Escape" });
assert.equal(escaped, 1);

const button = new FakeElement("button");
const panel = new FakeElement("div");
setDisclosure(button, panel, true);
assert.equal(button.attributes.get("aria-expanded"), "true");
assert.equal(panel.attributes.has("hidden"), false);
setDisclosure(button, panel, false);
assert.equal(button.attributes.get("aria-expanded"), "false");
assert.equal(panel.attributes.has("hidden"), true);

const announcementCleanup = announce("Conteúdo carregado", { document });
assert.equal(document.body.children.at(-1).textContent, "Conteúdo carregado");
announcementCleanup();
assert.equal(document.body.children.at(-1).removed, true);

const container = new FakeElement("div");
container.ownerDocument = document;
const first = new FakeElement("button");
const second = new FakeElement("button");
first.ownerDocument = document;
second.ownerDocument = document;
container.children = [first, second];
document.activeElement = first;
const releaseTrap = createFocusTrap(container);
assert.equal(first.focused, true);
container.dispatch("keydown", { key: "Tab", shiftKey: false, preventDefault() {} });
releaseTrap();
assert.equal(first.focused, true);

console.log("accessibility.test.js: verificações concluídas com sucesso.");
