import assert from "node:assert/strict";
import { createFooterView } from "../footer-view.js";

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

function findAll(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

const document = { createElement(tag) { return new FakeElement(tag, document); } };
const root = new FakeElement("div", document);

const cleanup = createFooterView({ root, copyrightText: "Todos os direitos reservados.", showYear: true, year: 2026 });
const footer = root.children[0];
assert.equal(footer.className, "mse-module-footer");
const text = findAll(footer, (node) => node.className === "mse-module-footer__text")[0];
assert.equal(text.textContent, "© 2026 Todos os direitos reservados.");

cleanup();
assert.equal(root.children.length, 0);

// showYear false: sem o ano
{
  const noYearRoot = new FakeElement("div", document);
  createFooterView({ root: noYearRoot, copyrightText: "Texto customizado.", showYear: false, year: 2026 });
  const noYearText = findAll(noYearRoot, (node) => node.className === "mse-module-footer__text")[0];
  assert.equal(noYearText.textContent, "Texto customizado.");
}

assert.throws(() => createFooterView({ root: {} }), /root/);

console.log("footer-view.test.js: verificações concluídas com sucesso.");
