import assert from "node:assert/strict";
import { createBreadcrumb, createHashRouter, getHashRoute, navigateTo } from "../navigation.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.ownerDocument = null;
    this.textContent = "";
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  dispatch(type, event = {}) { this.listeners.get(type)?.(event); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  scrollIntoView(options) { this.scrollOptions = options; }
}

const document = {
  createElement(tag) { const node = new FakeElement(tag); node.ownerDocument = document; return node; },
  getElementById() { return null; }
};
const window = {
  location: { hash: "#inicio" },
  document,
  listeners: new Map(),
  addEventListener(type, listener) { this.listeners.set(type, listener); },
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); },
  matchMedia: () => ({ matches: false })
};

document.location = window.location;
assert.equal(getHashRoute(window.location), "inicio");
assert.equal(navigateTo("forum", { window, scroll: false }), "#forum");
assert.equal(window.location.hash, "#forum");

const routes = [];
const disposeRouter = createHashRouter({ window, onRoute: (route) => routes.push(route), scroll: false });
assert.deepEqual(routes, ["forum"]);
window.location.hash = "#recursos";
window.listeners.get("hashchange")();
assert.deepEqual(routes, ["forum", "recursos"]);
disposeRouter();

const root = new FakeElement("nav");
root.ownerDocument = document;
createBreadcrumb({
  root,
  items: [
    { label: "Início", href: "#inicio" },
    { label: "Recursos" }
  ],
  document
});
assert.equal(root.attributes.get("aria-label"), "Breadcrumb");
assert.equal(root.children[0].children.length, 2);
assert.equal(root.children[0].children[1].children[0].attributes.get("aria-current"), "page");

console.log("navigation.test.js: verificações concluídas com sucesso.");
