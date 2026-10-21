import assert from "node:assert/strict";
import { renderInstallerScreen } from "../installer-screen.js";

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

// --- com_installer: não-regressão do placeholder ----------------------------

{
  const root = createRoot();
  const view = renderInstallerScreen({ root });

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Instalador");
  const p = root.querySelectorAll("p")[0];
  assert.equal(p.textContent, "A tela está preparada para receber a fonte SharePoint correspondente.");

  view.dispose();
  console.log("installer-screen.test.js: com_installer permanece placeholder (não-regressão) ok.");
}

console.log("installer-screen.test.js: verificações concluídas com sucesso.");
