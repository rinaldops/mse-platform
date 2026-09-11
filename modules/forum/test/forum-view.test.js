import assert from "node:assert/strict";
import { forumRouteUrl, readForumRoute, createForumSummaryView } from "../forum-view.js";

assert.deepEqual(
  readForumRoute("https://example.test/pagina.aspx"),
  { view: "recent", sort: "recentes", categoryId: null, tagId: null, topicId: null, answerId: null, compose: false, edit: false, mine: false, search: "" }
);

assert.deepEqual(
  readForumRoute(
    "https://example.test/pagina.aspx?forumView=resolved&forumSort=respostas&forumCategory=12&forumTag=7&forumTopic=42&forumAnswer=55&forumCompose=1&forumEdit=1&forumMine=1&forumSearch=SharePoint"
  ),
  { view: "resolved", sort: "respostas", categoryId: 12, tagId: 7, topicId: 42, answerId: 55, compose: true, edit: true, mine: true, search: "SharePoint" }
);

assert.deepEqual(
  readForumRoute("https://example.test/pagina.aspx?forumView=invalida&forumSort=invalido&forumCategory=-1&forumTopic=abc"),
  { view: "recent", sort: "recentes", categoryId: null, tagId: null, topicId: null, answerId: null, compose: false, edit: false, mine: false, search: "" }
);

assert.equal(
  forumRouteUrl(
    "https://example.test/pagina.aspx?origem=menu&forumTopic=4",
    { topicId: null, tagId: 7, answerId: 9, compose: true, edit: true, view: "unanswered", sort: "visualizacoes", mine: true, search: "ETag" }
  ),
  "/pagina.aspx?origem=menu&forumView=unanswered&forumSort=visualizacoes&forumTag=7&forumAnswer=9&forumCompose=1&forumEdit=1&forumMine=1&forumSearch=ETag"
);

// createForumSummaryView: lean Home-page panel — smoke-test rendering, the
// Forum.aspx deep link and the empty/error states with a minimal fake DOM.
class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.children = [];
    this.classList = new FakeClassList();
    this.className = "";
    this.textContent = "";
    this.style = { setProperty() {} };
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
  const topics = [
    { Id: 10, Title: "Como configurar SSO", Conteudo: "Passo a passo do SSO no ambiente.", FormatoConteudo: "TextoSimples", category: { Id: 1, Nome: "SAP", Cor: "#006298" }, QuantidadeRespostas: 3 },
    { Id: 11, Title: "Dúvida sobre Power Automate", Conteudo: "<p>Fluxo <b>não</b> dispara.</p>", FormatoConteudo: "HtmlSeguroV1", category: { Id: 2, Nome: "Power Platform", Cor: "#008542" }, QuantidadeRespostas: 0 },
    { Id: 12, Title: "Índice em lista grande", Conteudo: "", FormatoConteudo: "TextoSimples", category: { Id: 1, Nome: "SAP", Cor: "#006298" }, QuantidadeRespostas: 1 }
  ];
  const cleanup = createForumSummaryView({
    root,
    service: { async listTopics() { return { topics, next: null }; } },
    pageHref: "/sites/tecnologiasdigitais/SitePages/Forum.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));

  const cards = findAll(root, (node) => node.className === "mse-forum__summary-card");
  assert.equal(cards.length, 3);
  assert.equal(cards[0].href, "/sites/tecnologiasdigitais/SitePages/Forum.aspx?forumTopic=10");
  const cta = findAll(root, (node) => node.className === "mse-forum__summary-cta")[0];
  assert.equal(cta.href, "/sites/tecnologiasdigitais/SitePages/Forum.aspx");
  const excerpts = findAll(root, (node) => node.className === "mse-forum__summary-card-excerpt");
  assert.equal(excerpts[1].textContent, "Fluxo não dispara.", "excerpt deve remover as tags de HtmlSeguroV1");
  assert.equal(excerpts.length, 2, "tópico sem conteúdo não gera excerpt");

  const chips = findAll(root, (node) => node.className?.startsWith?.("mse-forum__summary-chip-btn"));
  const labels = chips.map((c) => c.textContent);
  assert.deepEqual(labels, ["Todas", "SAP", "Power Platform"]);
  chips.find((c) => c.textContent === "SAP").listeners.get("click")();
  await new Promise((resolve) => setImmediate(resolve));
  const filtered = findAll(root, (node) => node.className === "mse-forum__summary-card");
  assert.equal(filtered.length, 2, "filtro por categoria SAP deixa 2 tópicos");
  cleanup();
}

{
  const root = new FakeElement("div", fakeDocument);
  createForumSummaryView({
    root,
    service: { async listTopics() { return { topics: [], next: null }; } },
    pageHref: "/sites/tecnologiasdigitais/SitePages/Forum.aspx"
  });
  await new Promise((resolve) => setImmediate(resolve));
  const empty = findAll(root, (node) => node.className === "mse-forum__summary-empty")[0];
  assert.ok(empty, "deve mostrar estado vazio sem tópicos");
}

console.log("forum-view.test.js: verificações concluídas com sucesso.");
