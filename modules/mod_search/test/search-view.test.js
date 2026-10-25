import assert from "node:assert/strict";
import { createSearchView } from "../search-view.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.parentNode = null;
    this.value = "";
    this.placeholder = "";
    this.hidden = false;
    this.type = "";
    this.listeners = {};
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  dispatch(type, event) {
    return this.listeners[type]?.(event);
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

const ARTICLES = [
  { id: 1, titulo: "Notícias de hoje", slug: "noticias-hoje", resumo: "Resumo sobre esportes", tags: ["esportes"] },
  { id: 2, titulo: "Guia de busca", slug: "guia-busca", resumo: "Como usar o módulo", tags: ["ajuda"] }
];

assert.throws(() => createSearchView({ root: {} }), /root/);

// --- monta form + input + resultados vazios inicialmente --------------------

{
  const root = createRoot();
  const cleanup = createSearchView({ root, articles: ARTICLES, placeholder: "Buscar artigos..." });
  const forms = root.querySelectorAll("form");
  assert.equal(forms.length, 1);
  const input = root.querySelectorAll("input")[0];
  assert.equal(input.type, "search");
  assert.equal(input.placeholder, "Buscar artigos...");
  assert.equal(root.querySelectorAll("a").length, 0);
  cleanup();
  assert.equal(root.children.length, 0);
  console.log("mod_search search-view.test.js: monta form+input sem resultados iniciais ok.");
}

// --- digitar filtra por título/resumo/tag, case-insensitive ------------------

{
  const root = createRoot();
  createSearchView({ root, articles: ARTICLES });
  const input = root.querySelectorAll("input")[0];

  input.value = "ESPORTES";
  input.dispatch("input");
  let links = root.querySelectorAll("a");
  assert.equal(links.length, 1);
  assert.equal(links[0].textContent, "Notícias de hoje");

  input.value = "módulo";
  input.dispatch("input");
  links = root.querySelectorAll("a");
  assert.equal(links.length, 1);
  assert.equal(links[0].textContent, "Guia de busca");

  input.value = "ajuda";
  input.dispatch("input");
  links = root.querySelectorAll("a");
  assert.equal(links.length, 1);
  assert.equal(links[0].textContent, "Guia de busca");

  console.log("mod_search search-view.test.js: filtra por título/resumo/tag case-insensitive ok.");
}

// --- termo sem correspondência mostra estado vazio ---------------------------

{
  const root = createRoot();
  createSearchView({ root, articles: ARTICLES });
  const input = root.querySelectorAll("input")[0];
  input.value = "nenhum-termo-combina";
  input.dispatch("input");
  assert.equal(root.querySelectorAll("a").length, 0);
  const empty = root.querySelectorAll("p").find((p) => p.className === "mse-module-search__empty");
  assert.equal(empty.hidden, false);
  console.log("mod_search search-view.test.js: termo sem correspondência mostra estado vazio ok.");
}

// --- maxResults limita a quantidade de resultados exibidos ------------------

{
  const root = createRoot();
  const manyArticles = Array.from({ length: 5 }, (_, index) => ({ id: index, titulo: `Artigo busca ${index}`, resumo: "", tags: [] }));
  createSearchView({ root, articles: manyArticles, maxResults: 2 });
  const input = root.querySelectorAll("input")[0];
  input.value = "busca";
  input.dispatch("input");
  assert.equal(root.querySelectorAll("a").length, 2);
  console.log("mod_search search-view.test.js: maxResults limita resultados exibidos ok.");
}

// --- submit do form também dispara a busca (sem reload de página) ----------

{
  const root = createRoot();
  createSearchView({ root, articles: ARTICLES });
  const input = root.querySelectorAll("input")[0];
  const form = root.querySelectorAll("form")[0];
  input.value = "esportes";
  let prevented = false;
  form.dispatch("submit", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(root.querySelectorAll("a").length, 1);
  console.log("mod_search search-view.test.js: submit do form dispara busca sem reload ok.");
}

console.log("mod_search search-view.test.js: verificações concluídas com sucesso.");
