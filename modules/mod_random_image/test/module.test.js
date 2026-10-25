import assert from "node:assert/strict";
import { mount } from "../module.js";

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, value); }
}

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
    this.style = new FakeStyle();
    this.src = "";
    this.alt = "";
    this.href = "";
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

const itens = [
  { Id: 1, FileLeafRef: "foto1.png", FileRef: "/sites/x/MSEMedia/foto1.png" },
  { Id: 2, FileLeafRef: "foto2.jpg", FileRef: "/sites/x/MSEMedia/foto2.jpg" },
  { Id: 3, FileLeafRef: "documento.pdf", FileRef: "/sites/x/MSEMedia/documento.pdf" }
];
const services = {
  adminClient: { async getListItems() { return itens; } },
  listIds: { MSEMedia: { listId: "guid-fake" } }
};

const handle = await mount({ root, services });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
handle.dispose();
assert.equal(root.children.length, 0);

// biblioteca sem nenhuma imagem (só pdf, extensões padrão não casam): estado vazio.
{
  const emptyRoot = new FakeElement("div", document);
  const onlyDocsServices = {
    adminClient: { async getListItems() { return [{ Id: 3, FileLeafRef: "documento.pdf" }]; } },
    listIds: { MSEMedia: { listId: "guid-fake" } }
  };
  const emptyHandle = await mount({ root: emptyRoot, services: onlyDocsServices });
  assert.ok(emptyRoot.children.length > 0);
  emptyHandle.dispose();
}

// erro de rede no service não quebra o módulo: mostra status.
{
  const errorRoot = new FakeElement("div", document);
  const errorServices = {
    adminClient: { async getListItems() { throw new Error("falhou"); } },
    listIds: { MSEMedia: { listId: "guid-fake" } }
  };
  const errorHandle = await mount({ root: errorRoot, services: errorServices });
  assert.ok(errorRoot.children[0].textContent.includes("Não foi possível"));
  errorHandle.dispose();
}

console.log("random-image module.test.js: verificações concluídas com sucesso.");
