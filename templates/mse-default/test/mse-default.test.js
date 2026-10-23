// mse-platform/templates/mse-default/test/mse-default.test.js
//
// Teste de contrato de `templates/mse-default` (2º nível do fallback de 3
// níveis — ver `host-adapters/modern-script-editor/site-boot.js#
// createTemplateLayoutResolver`): confirma que `createTemplate()` monta as
// posições "de chrome" (topo/menu-principal/breadcrumbs/lateral/rodape) nos
// slots corretos do shell, qualquer outra posição cai na grade de conteúdo
// genérica, `componentPosition` nunca aparece duplicado em `positions`, e
// `dispose()` limpa o `root` por completo — mesmo princípio de
// `CAMAP-AGP/tests/templates/camap-tema-01.test.mjs` (fake de DOM mínimo, sem
// jsdom, import ESM direto, assert + console.log final).

import assert from "node:assert/strict";
import { createTemplate } from "../index.js";

// --- FakeElement/document mínimos (mesmo padrão de kernel/test/layout.test.js) ---

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
  hasAttribute(name) { return this.attributesMap.has(name); }

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

  assert.equal(root.dataset.template, "mse-default");
  assert.equal(root.classList.names.has("mse-default-template"), true);

  for (const position of positions) {
    const region = template.position(position);
    assert.ok(region, `posição "${position}" deveria ter um contêiner`);
    assert.equal(region.getAttribute("data-mse-position"), position);
    assert.equal(template.regions.get(position), region);
  }

  assert.equal(template.component.getAttribute("data-mse-component"), "");
  assert.equal(template.component.getAttribute("data-mse-component-position"), "conteudo-principal");
  assert.equal(template.regions.get("conteudo-principal"), template.component);

  console.log("mse-default.test.js: posições de chrome reconhecidas vão para os slots corretos ok.");
}

// --- posição não reconhecida cai na grade de conteúdo genérica -------------

{
  const root = createRoot();
  const template = createTemplate({ root, positions: ["hero", "home-a"] });

  assert.equal(template.position("hero")?.getAttribute("data-mse-position"), "hero");
  assert.equal(template.position("home-a")?.getAttribute("data-mse-position"), "home-a");
  assert.equal(template.shell.children.includes(template.position("hero")), true);

  console.log("mse-default.test.js: posição não reconhecida cai na grade de conteúdo genérica ok.");
}

// --- componentPosition customizado nunca aparece duplicado em positions ---

{
  const root = createRoot();
  const template = createTemplate({ root, positions: ["topo"], componentPosition: "artigo" });
  assert.equal(template.component.getAttribute("data-mse-component-position"), "artigo");
  assert.equal(template.regions.has("artigo"), true);
  assert.equal(template.position("conteudo-principal"), null);

  console.log("mse-default.test.js: componentPosition customizado ok.");
}

// --- componentPosition colidindo com uma posição declarada lança erro -----

{
  const root = createRoot();
  assert.throws(
    () => createTemplate({ root, positions: ["hero", "rodape"], componentPosition: "hero" }),
    TypeError
  );
  console.log("mse-default.test.js: colisão de componentPosition com positions lança erro ok.");
}

// --- validação de root/positions inválidos lança erro claro ----------------

{
  assert.throws(() => createTemplate({ root: null, positions: [] }), TypeError);
  assert.throws(() => createTemplate({ root: {}, positions: [] }), TypeError);
  assert.throws(() => createTemplate({ root: createRoot(), positions: "hero" }), TypeError);

  console.log("mse-default.test.js: validação de root/positions inválidos ok.");
}

// --- dispose() limpa o root por completo e permite remontar ---------------

{
  const root = createRoot();
  const template = createTemplate({ root, positions: ["topo", "rodape"] });
  assert.ok(root.children.length > 0);

  template.dispose();
  assert.equal(root.children.length, 0);
  assert.equal(root.classList.names.has("mse-default-template"), false);
  assert.equal(root.dataset.template, undefined);

  // remontar sobre o mesmo root, já desmontado, funciona normalmente.
  const again = createTemplate({ root, positions: ["topo", "rodape"] });
  assert.ok(root.children.length > 0);
  assert.notEqual(again.component, template.component);

  console.log("mse-default.test.js: dispose() limpa o root e permite remontar ok.");
}

// --- array de positions vazio é válido (site sem módulos em posição) ------

{
  const root = createRoot();
  const template = createTemplate({ root, positions: [] });
  assert.equal(template.regions.size, 1); // só conteudo-principal
  assert.ok(template.component);

  console.log("mse-default.test.js: positions vazio ok.");
}

console.log("mse-default.test.js: verificações concluídas com sucesso.");
