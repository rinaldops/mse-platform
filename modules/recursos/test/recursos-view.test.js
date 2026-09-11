import assert from "node:assert/strict";
import { createRecursosView, createRecursosSummaryView } from "../recursos-view.js";

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, enabled) { if (enabled) this.values.add(name); else this.values.delete(name); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.className = "";
    this.textContent = "";
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get lastChild() { return this.children[this.children.length - 1]; }
}

function findAll(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

const document = {
  createElement(tag) { return new FakeElement(tag, document); },
  createTextNode(text) { return { nodeType: 3, textContent: text }; }
};
const root = new FakeElement("div", document);
const service = {
  async listGroupedLinks() {
    return [{
      category: "Power Platform",
      links: [
        { Id: 1, Title: "Guia do Power Apps", URL: "https://example.test/guia", Descricao: "Leia o guia", Categoria: "Power Platform", AbrirNovaJanela: true, Ordem: 0 },
        { Id: 2, Title: "Referência de fórmulas", URL: "https://example.test/formulas", Categoria: "Power Platform", AbrirNovaJanela: false, Ordem: 1 }
      ]
    }];
  }
};

const cleanup = createRecursosView({ root, service });
await new Promise((resolve) => setImmediate(resolve));

const shell = root.children[0];
assert.equal(shell.className, "mse-recursos mse-recursos--list");
const [pagebar, page] = shell.children;
assert.equal(pagebar.className, "mse-recursos__pagebar");
const title = findAll(pagebar, (node) => node.className === "mse-recursos__pagebar-title")[0];
assert.equal(title.textContent, "Recursos");

assert.equal(page.className, "mse-recursos__page");
const chips = findAll(page, (node) => node.className?.startsWith?.("mse-recursos__chip") && node.tagName === "BUTTON");
const powerPlatformChip = chips.find((chip) => chip.children.some((child) => child.textContent === "Power Platform"));
assert.ok(powerPlatformChip, "deve haver um chip para Power Platform");
const chipCount = powerPlatformChip.children.find((child) => child.className === "mse-recursos__chip-count");
assert.equal(chipCount.textContent, "2");

const shortcutTitle = findAll(page, (node) => node.className === "mse-recursos__shortcuts-title")[0];
assert.ok(shortcutTitle, "atalhos mais usados deve aparecer sem filtro ativo");

const cards = findAll(page, (node) => node.className === "mse-recursos__card");
assert.equal(cards.length, 2);
const cardTitle = findAll(cards[0], (node) => node.className === "mse-recursos__card-title")[0];
assert.equal(cardTitle.textContent, "Guia do Power Apps");
assert.equal(cards[0].href, "https://example.test/guia");
assert.equal(cards[0].target, "_blank");
assert.equal(cards[1].target, undefined);

cleanup();
assert.equal(root.children.length, 0);

// createRecursosSummaryView: Home-page panel — items link at Recursos.aspx
// (not the resource URL itself), category chips filter, one CTA button.
{
  const summaryRoot = new FakeElement("div", document);
  const summaryService = {
    async listGroupedLinks() {
      return [
        { category: "Power Platform", links: [
          { Id: 1, Title: "Guia do Power Apps", URL: "https://make.powerapps.com/guia", Categoria: "Power Platform" },
          { Id: 2, Title: "Fórmulas", URL: "https://learn.microsoft.com/x", Categoria: "Power Platform" }
        ] },
        { category: "Microsoft 365", links: [
          { Id: 3, Title: "Central do Teams", URL: "https://support.microsoft.com/teams", Categoria: "Microsoft 365" }
        ] }
      ];
    }
  };
  const summaryCleanup = createRecursosSummaryView({
    root: summaryRoot,
    service: summaryService,
    pageHref: "/sites/tecnologiasdigitais/SitePages/Recursos.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));

  const summaryItems = findAll(summaryRoot, (node) => node.className === "mse-recursos__summary-item");
  assert.equal(summaryItems.length, 2, "Mais usados = primeiro link de cada categoria");
  assert.equal(summaryItems[0].href, "/sites/tecnologiasdigitais/SitePages/Recursos.aspx");
  assert.equal(findAll(summaryItems[0], (n) => n.className === "mse-recursos__summary-name")[0].textContent, "Guia do Power Apps");
  assert.equal(findAll(summaryItems[0], (n) => n.className === "mse-recursos__summary-host")[0].textContent, "make.powerapps.com");
  assert.equal(findAll(summaryRoot, (n) => n.className === "mse-recursos__summary-cta")[0].href, "/sites/tecnologiasdigitais/SitePages/Recursos.aspx");

  const chips = findAll(summaryRoot, (n) => n.className?.startsWith?.("mse-recursos__summary-chip-btn"));
  assert.deepEqual(chips.map((c) => c.textContent), ["Mais usados", "Power Platform", "Microsoft 365"]);
  chips.find((c) => c.textContent === "Power Platform").listeners.get("click")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(findAll(summaryRoot, (n) => n.className === "mse-recursos__summary-item").length, 2, "categoria Power Platform tem 2 links");
  summaryCleanup();
}

console.log("recursos-view.test.js: verificações concluídas com sucesso.");
