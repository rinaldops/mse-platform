import assert from "node:assert/strict";
import { accentFor, catalogCategories, categoriesFor, createVideotecaSummaryView, presentersFor, summaryColumnCount, thumbnailFor, videoPlayerUrl } from "../videoteca-view.js";

assert.equal(accentFor("SAP"), accentFor("SAP"));
assert.equal(accentFor("SAP", "#ed8b00"), "#ED8B00");
assert.equal(accentFor("SAP", "inválida"), accentFor("SAP"));
assert.equal(accentFor("Qualquer Categoria Nova"), accentFor("Qualquer Categoria Nova"));
assert.notEqual(accentFor("SAP"), accentFor("Outra Categoria Bem Diferente"));
assert.match(accentFor("Categoria de outro site, sem relacao com TD"), /^#[0-9A-F]{6}$/);
assert.deepEqual(categoriesFor({ Categoria: "SAP", Tags: ["KNIME"] }), ["SAP"]);
assert.deepEqual(
  catalogCategories([{ Categoria: "SAP" }, { Categoria: "KNIME" }, { Categoria: "SAP" }]),
  ["SAP", "KNIME"]
);
assert.match(accentFor(""), /^#[0-9A-F]{6}$/);
assert.match(accentFor(undefined), /^#[0-9A-F]{6}$/);
assert.deepEqual(presentersFor({ Apresentadores: { results: [{ Title: "Ana" }, { Title: "Bruno" }, { Title: "Ana" }] } }), ["Ana", "Bruno"]);
assert.deepEqual(presentersFor({ Apresentadores: [{ title: "Carla" }] }), ["Carla"]);
assert.deepEqual(
  presentersFor(
    { Apresentadores: [{ Title: "Milena Guedes da Silva - Fornecedor" }, { Title: "João da Silva" }] },
    ["- Fornecedor"]
  ),
  ["Milena Guedes da Silva", "João da Silva"]
);
assert.equal(thumbnailFor({ Miniatura: "https://example.test/thumb.jpg" }), "https://example.test/thumb.jpg");
assert.equal(thumbnailFor({ FileRef: "/sites/demo/video.mp4" }), "");
assert.equal(videoPlayerUrl({ FileRef: "/sites/demo/video.mp4" }), "/sites/demo/_layouts/15/stream.aspx?id=%2Fsites%2Fdemo%2Fvideo.mp4");
assert.equal(videoPlayerUrl({ FileRef: "/teams/demo/videos/video.mp4" }), "/teams/demo/_layouts/15/stream.aspx?id=%2Fteams%2Fdemo%2Fvideos%2Fvideo.mp4");
assert.equal(summaryColumnCount(320), 1);
assert.equal(summaryColumnCount(768), 2);
assert.equal(summaryColumnCount(1366), 4);
assert.equal(summaryColumnCount(1920), 6);
assert.equal(summaryColumnCount(2560), 8);

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
    this.style = {
      values: new Map(),
      setProperty(name, value) { this.values.set(name, value); }
    };
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
  const featured = [{
    Id: 1,
    Title: "Workshop Power Apps",
    Categoria: "Power Platform",
    Duracao: "45 min",
    Apresentadores: [{ Title: "Ana" }, { Title: "Bruno" }]
  }];
  const cleanup = createVideotecaSummaryView({
    root,
    service: { async listCatalog() { return { featured, groups: [{ category: "Power Platform", videos: featured }] }; } },
    pageHref: "/sites/demo/SitePages/Videoteca.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));

  const items = findAll(root, (node) => node.className === "mse-videoteca__summary-item");
  assert.equal(items.length, 1);
  assert.equal(items[0].href, "/sites/demo/SitePages/Videoteca.aspx?video=1");
  const title = findAll(items[0], (node) => node.className === "mse-videoteca__summary-item-title")[0];
  assert.equal(title.textContent, "Workshop Power Apps");
  assert.deepEqual(
    findAll(root, (node) => node.className === "mse-videoteca__summary-sub").map((node) => node.textContent),
    ["Ana"]
  );
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-cta")[0].href, "/sites/demo/SitePages/Videoteca.aspx");
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-cta")[0].textContent, "Veja mais vídeos...");
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-cta")[0], root.children[0].children.at(-1));
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-title").length, 0);
  cleanup();
}

{
  const root = new FakeElement("div", fakeDocument);
  const catalog = {
    featured: [{ Id: 1, Title: "Destaque A", Categoria: "SAP", Duracao: "10 min", Apresentadores: [{ Title: "Ana" }] }],
    videos: [
      { Id: 1, Title: "Destaque A", Categoria: "SAP", Visualizacoes: 3 },
      { Id: 2, Title: "SAP 2", Categoria: "SAP", Visualizacoes: 12 },
      { Id: 3, Title: "Azure 1", Categoria: "Azure", Visualizacoes: 7 }
    ],
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
    pageHref: "/sites/demo/SitePages/Videoteca.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));

  const chips = findAll(root, (n) => n.className?.startsWith?.("mse-videoteca__summary-chip-btn"));
  assert.deepEqual(chips.map((c) => c.textContent), ["Destaques", "SAP", "Azure"]);
  assert.deepEqual(
    findAll(root, (n) => n.className === "mse-videoteca__summary-item-title").map((n) => n.textContent),
    ["SAP 2", "Azure 1", "Destaque A"],
    "Destaques ordena vídeos por quantidade de acessos"
  );
  chips.find((c) => c.textContent === "SAP").listeners.get("click")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(findAll(root, (n) => n.className === "mse-videoteca__summary-item").length, 2, "categoria SAP tem 2 vídeos");
  chips.find((c) => c.textContent === "Azure").listeners.get("click")();
  await new Promise((resolve) => setImmediate(resolve));
  const singleVideoList = findAll(root, (n) => n.className === "mse-videoteca__summary-list")[0];
  assert.equal(singleVideoList.style.values.get("--summary-columns"), "6", "categoria com um vídeo preserva a grade responsiva");
  cleanup();
}

{
  const root = new FakeElement("div", fakeDocument);
  createVideotecaSummaryView({
    root,
    service: { async listCatalog() { return { featured: [], groups: [] }; } },
    pageHref: "/sites/demo/SitePages/Videoteca.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));
  const empty = findAll(root, (node) => node.className === "mse-videoteca__summary-empty")[0];
  assert.ok(empty, "deve mostrar estado vazio sem vídeos");
}

console.log("videoteca-view.test.js: verificações concluídas com sucesso.");
