import assert from "node:assert/strict";
import { renderCollectionScreen } from "../screens/collections.js";
import { MSE_EXTENSOES_SCHEMA } from "../../kernel/schemas/mse-extensoes.js";
import { MSE_MENU_SCHEMA } from "../../kernel/schemas/mse-menu.js";
import { MSE_MODULOS_SCHEMA } from "../../kernel/schemas/mse-modulos.js";
import { buildFormFields } from "../../kernel/admin-form.js";

// --- FakeElement/document mínimos (mesmo padrão de kernel/test/application.test.js) --

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
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

/** Espera o microtask queue drenar o `listAdminItems` assíncrono interno. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const LIST = Object.freeze({ listId: "20000000-0000-4000-8000-000000000001" });

function createFakeAdminClient({ items, shouldReject } = {}) {
  return {
    async getListItems() {
      if (shouldReject) throw new Error("falha simulada de rede");
      return items;
    }
  };
}

const LIST_IDS = Object.freeze({
  MSEExtensoes: LIST,
  MSEMenu: LIST,
  MSEModulos: LIST
});

function textOf(elements) {
  return elements.map((el) => el.textContent);
}

// --- com_extensions: tabela com colunas do schema real + linhas reais ------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Blog", Tipo: "Componente", Elemento: "blog", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: null, ParamsJson: null },
    { Id: 2, Title: "SD", Tipo: "Modulo", Elemento: "sd", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: 1, ParamsJson: "{}" }
  ];
  const services = { adminClient: createFakeAdminClient({ items }), listIds: LIST_IDS };
  const view = renderCollectionScreen({ root, route: { option: "com_extensions" }, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Extensões");

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Tipo", "Elemento", "Versão", "Habilitada", "Protegida", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  const rows = root.querySelectorAll("tr").slice(1); // pula o cabeçalho
  assert.equal(rows.length, 2);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "Blog");
  assert.equal(rows[1].querySelectorAll("td")[0].textContent, "SD");

  view.dispose();
  assert.equal(root.children.length, 0);

  console.log("collections.test.js: com_extensions renderiza tabela real ok.");
}

// --- com_menus: mesmo contrato, schema de MSEMenu ---------------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "Início", Alias: "", TipoMenu: "principal", ParentId: 0, Caminho: "", Nivel: 1, Ordem: 0, Componente: "", Visao: "", ParamsJson: null, Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado" }
  ];
  const services = { adminClient: createFakeAdminClient({ items }), listIds: LIST_IDS };
  const view = renderCollectionScreen({ root, route: { option: "com_menus" }, services });
  await flush();

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", ...buildFormFields(MSE_MENU_SCHEMA).map((d) => d.label), "Ações"];
  assert.deepEqual(headers, expectedLabels);

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelectorAll("td")[0].textContent, "Início");

  view.dispose();
  console.log("collections.test.js: com_menus renderiza tabela real ok.");
}

// --- com_modules: mesmo contrato, schema de MSEModulos ----------------------

{
  const root = createRoot();
  const items = [
    { Id: 1, Title: "sd-principal", ModuloTipo: "sd", Posicao: "home-a", Ordem: 1, Estado: "Publicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null, AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null },
    { Id: 2, Title: "footer-principal", ModuloTipo: "footer", Posicao: "rodape", Ordem: 1, Estado: "Publicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null, AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null },
    { Id: 3, Title: "mc-principal", ModuloTipo: "mc", Posicao: "home-c", Ordem: 1, Estado: "Publicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null, AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null }
  ];
  const services = { adminClient: createFakeAdminClient({ items }), listIds: LIST_IDS };
  const view = renderCollectionScreen({ root, route: { option: "com_modules" }, services });
  await flush();

  const headers = textOf(root.querySelectorAll("th"));
  const expectedLabels = ["Título", "Tipo", "Posição", "Ordem", "Estado", "Atribuição", "Ações"];
  assert.deepEqual(headers, expectedLabels);

  const rows = root.querySelectorAll("tr").slice(1);
  assert.equal(rows.length, 3);
  assert.deepEqual(textOf(rows.map((row) => row.querySelectorAll("td")[0])), ["sd-principal", "footer-principal", "mc-principal"]);

  view.dispose();
  console.log("collections.test.js: com_modules renderiza tabela real ok.");
}

// --- erro de carregamento: mensagem amigável, sem lançar --------------------

{
  const root = createRoot();
  const services = { adminClient: createFakeAdminClient({ shouldReject: true }), listIds: LIST_IDS };
  const view = renderCollectionScreen({ root, route: { option: "com_extensions" }, services });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0, "não deve renderizar tabela em caso de erro");
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);
  assert.match(errorMessages[0].textContent, /falha simulada de rede/);

  view.dispose();
  console.log("collections.test.js: erro de carregamento mostra mensagem amigável sem lançar ok.");
}

// --- services ausentes/incompletos: mensagem amigável, sem lançar ----------

{
  const root = createRoot();
  const view = renderCollectionScreen({ root, route: { option: "com_modules" }, services: {} });
  await flush();

  assert.equal(root.querySelectorAll("table").length, 0);
  const errorMessages = root.querySelectorAll("p").filter((p) => p.className === "mse-administrator__error");
  assert.equal(errorMessages.length, 1);

  view.dispose();
  console.log("collections.test.js: services ausente mostra mensagem amigável sem lançar ok.");
}

// --- com_config/com_installer: não-regressão do placeholder -----------------

{
  const root = createRoot();
  const services = { adminClient: createFakeAdminClient({ items: [] }), listIds: LIST_IDS };
  const view = renderCollectionScreen({ root, route: { option: "com_config" }, services });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Configuração global");
  const p = root.querySelectorAll("p")[0];
  assert.match(p.textContent, /lista MSEConfiguracoes|fonte SharePoint/);
  assert.equal(root.querySelectorAll("table").length, 0);

  view.dispose();
  console.log("collections.test.js: com_config permanece placeholder (não-regressão) ok.");
}

{
  const root = createRoot();
  const view = renderCollectionScreen({ root, route: { option: "com_installer" } });
  await flush();

  const h1 = root.querySelectorAll("h1")[0];
  assert.equal(h1.textContent, "Instalador");
  const p = root.querySelectorAll("p")[0];
  assert.match(p.textContent, /lista MSEConfiguracoes|fonte SharePoint/);

  view.dispose();
  console.log("collections.test.js: com_installer permanece placeholder (não-regressão) ok.");
}

console.log("collections.test.js: verificações concluídas com sucesso.");
