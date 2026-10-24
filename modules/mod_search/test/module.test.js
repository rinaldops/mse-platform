import assert from "node:assert/strict";
import { mount } from "../module.js";

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

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

await assert.rejects(mount({ root: {} }), /root/);

const ARTICLES_LIST = Object.freeze({ listId: "30000000-0000-4000-8000-000000000001" });
const RAW_ARTICLES = [
  { Id: 1, Title: "Notícias de hoje", Slug: "noticias-hoje", Resumo: "Resumo sobre esportes", TagsTexto: JSON.stringify(["esportes"]) },
  { Id: 2, Title: "Guia de busca", Slug: "guia-busca", Resumo: "Como usar o módulo", TagsTexto: JSON.stringify(["ajuda"]) }
];

function createFakeAdminClient() {
  return { async getListItems() { return RAW_ARTICLES; } };
}

// --- sem services.listIds reconhecido: degrada sem lançar -------------------

{
  const root = createRoot();
  const handle = await mount({ root, services: {} });
  await flush();
  assert.equal(typeof handle.dispose, "function");
  const status = root.querySelectorAll("p")[0];
  assert.ok(status?.textContent?.includes("indisponível"));
  handle.dispose();
  console.log("mod_search module.test.js: sem lista de artigos configurada degrada sem lançar ok.");
}

// --- com services válidos: carrega artigos uma vez e filtra ao digitar ------

{
  const root = createRoot();
  const client = createFakeAdminClient();
  const services = { adminClient: client, listIds: { CAMAPPublicacoes: ARTICLES_LIST } };
  const handle = await mount({ root, services });
  await flush();

  const input = root.querySelectorAll("input")[0];
  assert.equal(input.placeholder, "Buscar...");

  input.value = "esportes";
  input.dispatch("input");
  const links = root.querySelectorAll("a");
  assert.equal(links.length, 1);
  assert.equal(links[0].textContent, "Notícias de hoje");

  input.value = "nenhum-termo-combina";
  input.dispatch("input");
  assert.equal(root.querySelectorAll("a").length, 0);

  handle.dispose();
  assert.equal(root.children.length, 0);
  console.log("mod_search module.test.js: carrega artigos uma vez e filtra ao digitar ok.");
}

console.log("mod_search module.test.js: verificações concluídas com sucesso.");
