import assert from "node:assert/strict";
import { createSiteLayout, disposeSiteLayout } from "../layout.js";

// --- FakeElement/document mínimos, mesmo padrão de core/test/navigation.test.js ---

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.parentNode = null;
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  dispatch(type, event = {}) { this.listeners.get(type)?.(event); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...children);
  }
  get firstChild() { return this.children[0] ?? null; }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
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

// --- posições válidas criam contêineres corretos e na ordem esperada ------

{
  const root = createRoot();
  const positions = ["topo", "hero", "home-a", "rodape"];
  const layout = createSiteLayout({ root, positions });

  assert.equal(root.children.length, positions.length + 1);
  assert.equal(root.children[0], layout.componentElement);
  assert.equal(layout.componentElement.attributes.get("data-mse-component"), "");
  assert.equal(layout.componentElement.attributes.get("data-mse-component-position"), "conteudo-principal");

  positions.forEach((name, index) => {
    const element = root.children[index + 1];
    assert.equal(element, layout.positionElements.get(name));
    assert.equal(element.attributes.get("data-mse-position"), name);
  });

  assert.deepEqual([...layout.positionElements.keys()], positions);

  console.log("layout.test.js: posições válidas criam contêineres na ordem esperada ok.");
}

// --- componentPosition customizado é apenas rótulo informativo ------------

{
  const root = createRoot();
  const layout = createSiteLayout({ root, positions: ["hero"], componentPosition: "artigo" });
  assert.equal(layout.componentElement.attributes.get("data-mse-component-position"), "artigo");
  assert.equal(layout.positionElements.has("artigo"), false);

  console.log("layout.test.js: componentPosition customizado ok.");
}

// --- dispose() remove tudo e permite remontar ------------------------------

{
  const root = createRoot();
  const layout = createSiteLayout({ root, positions: ["topo", "rodape"] });
  assert.equal(root.children.length, 3);

  layout.dispose();
  assert.equal(root.children.length, 0);

  // dispose() é idempotente.
  assert.doesNotThrow(() => layout.dispose());

  // remontar sobre o mesmo root, já desmontado, funciona normalmente.
  const layoutAgain = createSiteLayout({ root, positions: ["topo", "rodape"] });
  assert.equal(root.children.length, 3);
  assert.notEqual(layoutAgain.componentElement, layout.componentElement);

  console.log("layout.test.js: dispose remove tudo e permite remontar ok.");
}

// --- disposeSiteLayout(root): conveniência externa -------------------------

{
  const root = createRoot();
  createSiteLayout({ root, positions: ["topo"] });
  assert.equal(root.children.length, 2);

  disposeSiteLayout(root);
  assert.equal(root.children.length, 0);

  // no-op silencioso quando não há layout montado.
  assert.doesNotThrow(() => disposeSiteLayout(root));
  assert.doesNotThrow(() => disposeSiteLayout(createRoot()));

  console.log("layout.test.js: disposeSiteLayout ok.");
}

// --- remontagem sobre root já montado faz dispose automático ---------------

{
  const root = createRoot();
  const first = createSiteLayout({ root, positions: ["topo", "hero"] });
  const firstComponentElement = first.componentElement;
  const firstPositionElement = first.positionElements.get("topo");

  const second = createSiteLayout({ root, positions: ["rodape"] });

  // o layout anterior foi desmontado: root só tem os contêineres novos.
  assert.equal(root.children.length, 2);
  assert.equal(root.children.includes(firstComponentElement), false);
  assert.equal(root.children.includes(firstPositionElement), false);
  assert.equal(second.positionElements.has("topo"), false);
  assert.equal(second.positionElements.has("rodape"), true);

  // dispose do layout antigo (já implícito) continua seguro de chamar.
  assert.doesNotThrow(() => first.dispose());

  console.log("layout.test.js: remontagem sobre root já montado faz dispose automático ok.");
}

// --- validação de root inválido lança erro claro ---------------------------

{
  assert.throws(() => createSiteLayout({ root: null, positions: [] }), TypeError);
  assert.throws(() => createSiteLayout({ root: {}, positions: [] }), TypeError);
  assert.throws(() => createSiteLayout({ root: { ownerDocument: {} }, positions: [] }), TypeError);

  console.log("layout.test.js: validação de root inválido ok.");
}

// --- validação de positions inválidas lança erro claro ----------------------

{
  const root = createRoot();
  assert.throws(() => createSiteLayout({ root, positions: null }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: "hero" }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: [""] }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: ["   "] }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: [123] }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: ["Home-A"] }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: ["home_a"] }), TypeError);
  assert.throws(() => createSiteLayout({ root, positions: ["home a"] }), TypeError);

  console.log("layout.test.js: validação de positions inválidas ok.");
}

// --- posições duplicadas lançam erro (não deduplica silenciosamente) -------

{
  const root = createRoot();
  assert.throws(
    () => createSiteLayout({ root, positions: ["hero", "topo", "hero"] }),
    /duplicad/i
  );

  console.log("layout.test.js: posições duplicadas lançam erro ok.");
}

// --- componentPosition colidindo com um nome em positions lança erro -------

{
  const root = createRoot();
  assert.throws(
    () => createSiteLayout({ root, positions: ["hero", "rodape"], componentPosition: "hero" }),
    TypeError
  );

  console.log("layout.test.js: colisão de componentPosition com positions lança erro ok.");
}

// --- array de positions vazio é válido (site sem módulos em posição) -------

{
  const root = createRoot();
  const layout = createSiteLayout({ root, positions: [] });
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0], layout.componentElement);
  assert.equal(layout.positionElements.size, 0);

  console.log("layout.test.js: positions vazio ok.");
}

console.log("layout.test.js: verificações concluídas com sucesso.");
