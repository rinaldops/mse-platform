// mse-platform/templates/minijoomla-classic/test/minijoomla-classic.test.js
//
// Teste de contrato de `templates/minijoomla-classic` — mesmo roteiro de
// `templates/mse-default/test/mse-default.test.js` (de onde este arquivo
// foi copiado), já que a lógica de slots/regiões é idêntica por design
// (ver cabeçalho de `../index.js`): confirma que `createTemplate()` monta
// as posições de chrome nos slots certos, posição desconhecida cai na
// grade genérica, componentPosition nunca duplica, e dispose() limpa o
// root por completo.

import assert from "node:assert/strict";
import { createTemplate } from "../index.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase();
    this.attributesMap = new Map();
    this.children = [];
    this.parentNode = null;
    this.ownerDocument = null;
    this.classList = {
      names: new Set(),
      add(...values) { values.forEach((value) => this.names.add(value)); },
      remove(...values) { values.forEach((value) => this.names.delete(value)); }
    };
    this.dataset = {};
  }

  setAttribute(name, value) { this.attributesMap.set(name, String(value)); }
  getAttribute(name) { return this.attributesMap.has(name) ? this.attributesMap.get(name) : null; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    nodes.forEach((node) => this.appendChild(node));
  }

  querySelector() { return null; }
}

const fakeDocument = {
  head: { querySelector() { return null; }, appendChild() {} },
  createElement(tag) {
    const element = new FakeElement(tag);
    element.ownerDocument = fakeDocument;
    return element;
  }
};

function createRoot() {
  const root = new FakeElement("div");
  root.ownerDocument = fakeDocument;
  return root;
}

// --- posições de chrome reconhecidas vão para os slots corretos do shell ---

{
  const root = createRoot();
  const positions = ["topo", "menu-principal", "breadcrumbs", "lateral", "rodape"];
  const template = createTemplate({ root, positions });

  assert.equal(root.dataset.template, "minijoomla-classic");
  assert.equal(root.classList.names.has("minijoomla-classic-template"), true);

  for (const position of positions) {
    const region = template.position(position);
    assert.ok(region, `posição "${position}" deveria ter um contêiner`);
    assert.equal(region.getAttribute("data-mse-position"), position);
  }

  assert.equal(template.component.getAttribute("data-mse-component"), "");
  assert.equal(template.component.getAttribute("data-mse-component-position"), "conteudo-principal");

  console.log("minijoomla-classic.test.js: posições de chrome reconhecidas vão para os slots corretos ok.");
}

// --- posição não reconhecida cai na grade de conteúdo genérica -------------

{
  const root = createRoot();
  const template = createTemplate({ root, positions: ["hero"] });
  assert.equal(template.position("hero")?.getAttribute("data-mse-position"), "hero");
  assert.equal(template.shell.children.includes(template.position("hero")), true);
  console.log("minijoomla-classic.test.js: posição não reconhecida cai na grade de conteúdo genérica ok.");
}

// --- componentPosition colidindo com positions lança erro -----------------

{
  const root = createRoot();
  assert.throws(
    () => createTemplate({ root, positions: ["hero"], componentPosition: "hero" }),
    TypeError
  );
  console.log("minijoomla-classic.test.js: colisão de componentPosition com positions lança erro ok.");
}

// --- dispose() limpa o root por completo e permite remontar ---------------

{
  const root = createRoot();
  const template = createTemplate({ root, positions: ["topo", "rodape"] });
  assert.ok(root.children.length > 0);

  template.dispose();
  assert.equal(root.children.length, 0);
  assert.equal(root.classList.names.has("minijoomla-classic-template"), false);

  const again = createTemplate({ root, positions: ["topo", "rodape"] });
  assert.ok(root.children.length > 0);
  assert.notEqual(again.component, template.component);

  console.log("minijoomla-classic.test.js: dispose() limpa o root e permite remontar ok.");
}

console.log("minijoomla-classic.test.js: verificações concluídas com sucesso.");
