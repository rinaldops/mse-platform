import assert from "node:assert/strict";
import { mount } from "../module.js";

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.className = "";
    this.textContent = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

const document = { createElement(tag) { return new FakeElement(tag, document); } };

assert.throws(() => mount({ root: {} }), /root/);

const root = new FakeElement("div", document);
const handle = mount({ root });
assert.equal(typeof handle.dispose, "function");
assert.ok(root.children.length > 0);
assert.equal(root.children[0].children[0].textContent.includes("Todos os direitos reservados."), true);
handle.dispose();

// config sobrepõe os padrões do esquema
const configuredRoot = new FakeElement("div", document);
mount({ root: configuredRoot, config: { copyrightText: "Minha empresa.", showYear: false } });
assert.equal(configuredRoot.children[0].children[0].textContent, "Minha empresa.");

console.log("footer module.test.js: verificações concluídas com sucesso.");
