import assert from "node:assert/strict";
import { renderConfigScreen } from "../config-screen.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.parentNode = null;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  remove() {
    if (this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      if (index !== -1) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    }
  }

  querySelectorAll(tag) {
    const upper = tag.toUpperCase();
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.tagName === upper) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

const document = {
  createElement(tag) {
    const node = new FakeElement(tag);
    node.ownerDocument = document;
    return node;
  }
};

function createRoot() {
  const root = new FakeElement("div");
  root.ownerDocument = document;
  return root;
}

// --- com_config: não-regressão do placeholder -------------------------------

{
  const root = createRoot();
  const view = renderConfigScreen({ root, services: {} });

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Configuração global");
  const p = root.querySelectorAll("p")[0];
  assert.equal(p.textContent, "A tela está preparada para receber a fonte SharePoint correspondente.");
  assert.equal(root.querySelectorAll("table").length, 0);

  view.dispose();
  console.log("config-screen.test.js: com_config permanece placeholder (não-regressão) ok.");
}

console.log("config-screen.test.js: verificações concluídas com sucesso.");
