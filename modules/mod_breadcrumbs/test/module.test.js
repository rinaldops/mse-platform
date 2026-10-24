import assert from "node:assert/strict";
import { mount } from "../module.js";

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

const document = { createElement(tag) { return new FakeElement(tag, document); } };

await assert.rejects(() => mount({ root: {} }), /root/);

const root = new FakeElement("div", document);
await assert.rejects(
  () => mount({ root, services: {} }),
  /adminClient/
);

const items = [
  { Id: 1, Title: "Início", Alias: "", ParentId: 0, Ordering: 1, Published: "Published", Default: true }
];
const services = {
  adminClient: { async getListItems() { return items; } },
  listIds: { MSEMenu: { listId: "guid-fake" } }
};

const handle = await mount({ root, services, context: { route: { alias: "" } } });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
handle.dispose();
assert.equal(root.children.length, 0);

console.log("breadcrumbs module.test.js: verificações concluídas com sucesso.");
