import assert from "node:assert/strict";
import { accentFor, createVideotecaSummaryView } from "../videoteca-view.js";

assert.equal(accentFor("SAP"), accentFor("SAP"));
assert.equal(accentFor("Qualquer Categoria Nova"), accentFor("Qualquer Categoria Nova"));
assert.notEqual(accentFor("SAP"), accentFor("Outra Categoria Bem Diferente"));
assert.match(accentFor("Categoria de outro site, sem relacao com TD"), /^#[0-9A-F]{6}$/);
assert.match(accentFor(""), /^#[0-9A-F]{6}$/);
assert.match(accentFor(undefined), /^#[0-9A-F]{6}$/);

// createVideotecaSummaryView: lean Home-page panel — items link at
// Videoteca.aspx (not the recording URL itself), unlike the full page's cards.
class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((n) => this.values.add(n)); }
  contains(n) { return this.values.has(n); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.style = { setProperty() {} };
    this.classList = new FakeClassList();
    this.listeners = new Map();
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  addEventListener(type, fn) { this.listeners.set(type, fn); }
}

function findAll(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

const fakeDocument = { createElement(tag) { return new FakeElement(tag, fakeDocument); } };

{
  const root = new FakeElement("div", fakeDocument);
  const featured = [{ Id: 1, Title: "Workshop Power Apps", Categoria: "Power Platform", Duracao: "45 min" }];
  const cleanup = createVideotecaSummaryView({
    root,
    service: { async listCatalog() { return { featured, groups: [{ category: "Power Platform", videos: featured }] }; } },
    pageHref: "/sites/tecnologiasdigitais/SitePages/Videoteca.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));

  const items = findAll(root, (node) => node.className === "mse-videoteca__summary-item");
  assert.equal(items.length, 1);
  assert.equal(items[0].href, "/sites/tecnologiasdigitais/SitePages/Videoteca.aspx");
  const title = findAll(items[0], (node) => node.className === "mse-videoteca__summary-item-title")[0];
  assert.equal(title.textContent, "Workshop Power Apps");
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-cta")[0].href, "/sites/tecnologiasdigitais/SitePages/Videoteca.aspx");
  cleanup();
}

{
  const root = new FakeElement("div", fakeDocument);
  const catalog = {
    featured: [{ Id: 1, Title: "Destaque A", Categoria: "SAP", Duracao: "10 min", Apresentador: "Ana" }],
    groups: [
      { category: "SAP", videos: [
        { Id: 1, Title: "Destaque A", Categoria: "SAP" },
        { Id: 2, Title: "SAP 2", Categoria: "SAP" }
      ] },
      { category: "Azure", videos: [{ Id: 3, Title: "Azure 1", Categoria: "Azure" }] }
    ]
  };
  const cleanup = createVideotecaSummaryView({
    root,
    service: { async listCatalog() { return catalog; } },
    pageHref: "/sites/tecnologiasdigitais/SitePages/Videoteca.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));

  const chips = findAll(root, (n) => n.className?.startsWith?.("mse-videoteca__summary-chip-btn"));
  assert.deepEqual(chips.map((c) => c.textContent), ["Destaques", "SAP", "Azure"]);
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-item").length, 1, "Destaques mostra os featured");
  chips.find((c) => c.textContent === "SAP").listeners.get("click")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-item").length, 2, "categoria SAP tem 2 vídeos");
  cleanup();
}

{
  const root = new FakeElement("div", fakeDocument);
  createVideotecaSummaryView({
    root,
    service: { async listCatalog() { return { featured: [], groups: [] }; } },
    pageHref: "/sites/tecnologiasdigitais/SitePages/Videoteca.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));
  const empty = findAll(root, (node) => node.className === "mse-videoteca__summary-empty")[0];
  assert.ok(empty, "deve mostrar estado vazio sem vídeos");
}

console.log("videoteca-view.test.js: verificações concluídas com sucesso.");
