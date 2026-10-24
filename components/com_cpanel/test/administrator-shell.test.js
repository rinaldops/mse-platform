import assert from "node:assert/strict";
import { createAdministratorShell, ADMINISTRATOR_NAV_LINKS, ADMINISTRATOR_NAV_GROUPS } from "../administrator-shell.js";

// --- FakeElement/document mínimos (mesmo padrão de com_extensions/test/extensions-screen.test.js) --
// 24/10/2026 (agrupamento hierárquico da sidebar): ganhou `addEventListener`/
// `dispatch` (mesmo padrão de `kernel/test/application.test.js#FakeElement`)
// e a propriedade `hidden`, necessários para exercitar o toggle
// expandir/recolher de cada grupo (`administrator-shell.js#createAdministratorShell`).

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.className = "";
    this.href = "";
    this.hidden = false;
    this.parentNode = null;
    this.listeners = new Map();
    this.classList = {
      names: new Set(),
      add(...values) { values.forEach((value) => this.names.add(value)); },
      remove(...values) { values.forEach((value) => this.names.delete(value)); },
      toggle(value, force) {
        const shouldAdd = force === undefined ? !this.names.has(value) : Boolean(force);
        if (shouldAdd) this.names.add(value); else this.names.delete(value);
      },
      has(value) { return this.names.has(value); }
    };
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get("click")?.({}); }

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

// --- monta cabeçalho + nav com todos os links (soltos + agrupados) + slot
// de conteúdo vazio ----------------------------------------------------------

{
  const root = createRoot();
  const shell = createAdministratorShell({ root, activeOption: "com_modules" });

  assert.equal(root.classList.names.has("mse-administrator-shell"), true);
  const links = root.querySelectorAll("a");
  assert.equal(links.length, ADMINISTRATOR_NAV_LINKS.length, "todos os links (soltos + dentro de grupos) continuam presentes, só reorganizados");
  assert.deepEqual(
    new Set(links.map((a) => a.href)),
    new Set(ADMINISTRATOR_NAV_LINKS.map(([option]) => `#/administrator?option=${option}`)),
    "mesmo conjunto de destinos de antes, independente da ordem/agrupamento"
  );

  // Só o link ativo tem aria-current="page".
  const activeLinks = links.filter((a) => a.getAttribute("aria-current") === "page");
  assert.equal(activeLinks.length, 1);
  assert.equal(activeLinks[0].href, "#/administrator?option=com_modules");

  assert.ok(shell.contentElement);
  assert.equal(shell.contentElement.children.length, 0);

  console.log("administrator-shell.test.js: monta cabeçalho+nav com link ativo marcado ok.");
}

// --- header magro (estilo breadcrumb): ícone + rótulo da tela ativa, nunca
// o nome do produto — a marca migra para dentro de <nav> --------------------

{
  for (const activeOption of ["com_cpanel", "com_modules", "com_menus"]) {
    const root = createRoot();
    createAdministratorShell({ root, activeOption });

    const header = root.querySelectorAll("header")[0];
    assert.ok(header, `header ausente para activeOption="${activeOption}"`);
    const headerTitle = header.children.find((child) => child.className === "mse-administrator-shell__header-title");
    assert.ok(headerTitle, `header-title ausente para activeOption="${activeOption}"`);
    assert.equal(headerTitle.textContent, new Map(ADMINISTRATOR_NAV_LINKS).get(activeOption), `header deve mostrar o rótulo de "${activeOption}"`);

    const nav = root.querySelectorAll("nav")[0];
    const brand = nav.children.find((child) => child.className === "mse-administrator-shell__brand");
    assert.ok(brand, "marca do produto deve estar dentro de <nav>, não mais em <header>");
    assert.equal(header.children.some((child) => child.className === "mse-administrator-shell__brand"), false, "header não deve mais conter a marca do produto");
  }

  console.log("administrator-shell.test.js: header magro mostra ícone+rótulo da tela ativa, marca migrou para nav ok.");
}

// --- agrupamento hierárquico (24/10/2026): com_cpanel fica solto no topo;
// todas as demais opções pertencem a exatamente 1 grupo; os cabeçalhos de
// grupo são <button>, nunca <a> (não contam para a asserção acima) --------

{
  const root = createRoot();
  createAdministratorShell({ root, activeOption: "com_cpanel" });

  const groups = root.querySelectorAll("div").filter((node) => node.className === "mse-administrator-shell__group");
  assert.equal(groups.length, ADMINISTRATOR_NAV_GROUPS.length, "um <div> de grupo por entrada de ADMINISTRATOR_NAV_GROUPS");

  const toggles = root.querySelectorAll("button").filter((button) => button.className === "mse-administrator-shell__group-toggle");
  assert.equal(toggles.length, ADMINISTRATOR_NAV_GROUPS.length, "um botão de toggle por grupo, nenhum <a> adicional (filtra o botão 'Recolher Menu', que não é um toggle de grupo)");

  const groupedOptionCount = ADMINISTRATOR_NAV_GROUPS.reduce((total, group) => total + group.options.length, 0);
  assert.equal(groupedOptionCount + 1, ADMINISTRATOR_NAV_LINKS.length, "com_cpanel (solto) + todas as opções agrupadas = total de links");

  console.log("administrator-shell.test.js: com_cpanel solto no topo, demais opções em grupos, cabeçalhos são <button> ok.");
}

// --- grupos nascem colapsados por padrão, exceto o grupo do activeOption
// atual (fidelidade ao Joomla! real: só a categoria da tela corrente
// aparece expandida ao montar) ----------------------------------------------

{
  const root = createRoot();
  createAdministratorShell({ root, activeOption: "com_modules" }); // com_modules pertence ao grupo "system"

  const groupSections = root.querySelectorAll("div").filter((node) => node.className === "mse-administrator-shell__group");
  for (const section of groupSections) {
    const toggle = section.children.find((child) => child.tagName === "BUTTON");
    const sublist = section.children.find((child) => child !== toggle);
    const isActiveGroup = section.classList.has("mse-administrator-shell__group--active");
    assert.equal(toggle.getAttribute("aria-expanded"), String(isActiveGroup), `grupo ${isActiveGroup ? "ativo" : "inativo"} deve nascer ${isActiveGroup ? "expandido" : "colapsado"}`);
    assert.equal(sublist.hidden, !isActiveGroup);
  }
  // Confirma que exatamente 1 grupo ("system") está marcado ativo/expandido.
  assert.equal(groupSections.filter((section) => section.classList.has("mse-administrator-shell__group--active")).length, 1);

  console.log("administrator-shell.test.js: só o grupo do activeOption nasce expandido ok.");
}

// --- toggle de grupo: nasce colapsado (activeOption fora de qualquer grupo),
// 1º clique expande (hidden=false, aria-expanded="true") e um segundo
// clique recolhe de novo — fidelidade ao Joomla! real, que só expande o
// grupo da tela atual, nunca todos por padrão ------------------------------

{
  const root = createRoot();
  createAdministratorShell({ root, activeOption: "com_cpanel" });

  const toggle = root.querySelectorAll("button").filter((button) => button.className === "mse-administrator-shell__group-toggle")[0];
  const sublist = toggle.parentNode.children.find((child) => child !== toggle);

  assert.equal(toggle.getAttribute("aria-expanded"), "false", "com_cpanel não pertence a nenhum grupo: nasce colapsado");
  assert.equal(sublist.hidden, true);

  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "true", "1º clique expande o grupo");
  assert.equal(sublist.hidden, false);

  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "false", "2º clique recolhe de novo");
  assert.equal(sublist.hidden, true);

  console.log("administrator-shell.test.js: toggle de grupo recolhe/expande corretamente ok.");
}

// --- nenhum activeOption informado -> nenhum link marcado aria-current -----

{
  const root = createRoot();
  createAdministratorShell({ root });
  const links = root.querySelectorAll("a");
  assert.equal(links.filter((a) => a.getAttribute("aria-current") === "page").length, 0);

  console.log("administrator-shell.test.js: sem activeOption, nenhum link marcado ok.");
}

// --- toggle "Recolher Menu": alterna classe de colapso em <nav> e persiste
// via `storage` (sessionStorage real ou um fake injetado via opção aditiva
// `storage`) ------------------------------------------------------------

function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    calls: [],
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, value); this.calls.push([key, value]); }
  };
}

{
  const root = createRoot();
  const storage = createFakeStorage();
  createAdministratorShell({ root, activeOption: "com_cpanel", storage });

  const nav = root.querySelectorAll("nav")[0];
  const collapseToggle = nav.children.find((child) => child.className === "mse-administrator-shell__collapse-toggle");
  assert.ok(collapseToggle, "botão 'Recolher Menu' ausente");
  assert.equal(nav.classList.names.has("mse-administrator-shell__nav--collapsed"), false, "sem storage prévio, nav nasce expandida");
  assert.equal(collapseToggle.getAttribute("aria-pressed"), "false");

  collapseToggle.click();
  assert.equal(nav.classList.names.has("mse-administrator-shell__nav--collapsed"), true, "clique deve colapsar a nav");
  assert.equal(collapseToggle.getAttribute("aria-pressed"), "true");
  assert.deepEqual(storage.calls[storage.calls.length - 1], ["mse-administrator:sidebar-collapsed", "1"], "clique deve persistir o novo estado no storage");

  collapseToggle.click();
  assert.equal(nav.classList.names.has("mse-administrator-shell__nav--collapsed"), false, "2º clique deve expandir de novo");
  assert.deepEqual(storage.calls[storage.calls.length - 1], ["mse-administrator:sidebar-collapsed", "0"]);

  console.log("administrator-shell.test.js: toggle 'Recolher Menu' alterna e persiste no storage ok.");
}

{
  const root = createRoot();
  const storage = createFakeStorage({ "mse-administrator:sidebar-collapsed": "1" });
  createAdministratorShell({ root, activeOption: "com_cpanel", storage });

  const nav = root.querySelectorAll("nav")[0];
  assert.equal(nav.classList.names.has("mse-administrator-shell__nav--collapsed"), true, "com storage indicando colapsado, nav deve nascer já colapsada");

  console.log("administrator-shell.test.js: com storage prévio colapsado, shell nasce colapsado ok.");
}

// --- setActiveOption (25/10/2026 — corrige o bug real por trás de "vários
// links não estão funcionando": a navegação interna do Administrator
// passou a usar este método para atualizar header/link ativo/grupo
// expandido SEM reconstruir o shell — ver `components/com_cpanel/
// component.js#update()` e `kernel/application.js`) ------------------------

{
  const root = createRoot();
  const shell = createAdministratorShell({ root, activeOption: "com_menus" }); // grupo "menus"

  const linkFor = (option) => root.querySelectorAll("a").find((a) => a.href === `#/administrator?option=${option}`);
  assert.equal(linkFor("com_menus").getAttribute("aria-current"), "page");
  assert.equal(linkFor("com_extensions").getAttribute("aria-current"), null);

  const groupSections = root.querySelectorAll("div").filter((node) => node.className === "mse-administrator-shell__group");
  const groupFor = (option) => groupSections.find((section) => section.children.some((child) => child.tagName === "DIV" && child.children.some((a) => a.href === `#/administrator?option=${option}`)));
  const menusGroup = groupFor("com_menus");
  const systemGroup = groupFor("com_extensions"); // com_extensions pertence ao grupo "system"
  assert.equal(menusGroup.classList.has("mse-administrator-shell__group--active"), true, "grupo 'menus' nasce ativo (contém a option inicial)");
  assert.equal(systemGroup.classList.has("mse-administrator-shell__group--active"), false);

  const header = root.querySelectorAll("header")[0];
  const headerTitle = header.children.find((child) => child.className === "mse-administrator-shell__header-title");
  assert.equal(headerTitle.textContent, "Menus");

  shell.setActiveOption("com_extensions"); // troca para uma option do grupo "system"

  assert.equal(linkFor("com_menus").getAttribute("aria-current"), null, "link 'Menus' perde aria-current");
  assert.equal(linkFor("com_extensions").getAttribute("aria-current"), "page", "link 'Extensões' ganha aria-current");
  assert.equal(headerTitle.textContent, "Extensões", "header-title passa a refletir a nova option");

  const menusToggle = menusGroup.children.find((child) => child.tagName === "BUTTON");
  const menusSublist = menusGroup.children.find((child) => child !== menusToggle);
  assert.equal(menusToggle.getAttribute("aria-expanded"), "false", "grupo 'menus' recolhe ao sair da option ativa");
  assert.equal(menusSublist.hidden, true);
  assert.equal(menusGroup.classList.has("mse-administrator-shell__group--active"), false);

  const systemToggle = systemGroup.children.find((child) => child.tagName === "BUTTON");
  const systemSublist = systemGroup.children.find((child) => child !== systemToggle);
  assert.equal(systemToggle.getAttribute("aria-expanded"), "true", "grupo 'system' expande ao entrar na option ativa");
  assert.equal(systemSublist.hidden, false);
  assert.equal(systemGroup.classList.has("mse-administrator-shell__group--active"), true);

  // Chamar com a MESMA option já ativa não deve lançar nem alterar nada (no-op).
  shell.setActiveOption("com_extensions");
  assert.equal(linkFor("com_extensions").getAttribute("aria-current"), "page");

  // Nenhuma reconstrução do shell: root continua com o mesmo filho <header>
  // e <body>/<nav> (setActiveOption nunca chama root.replaceChildren()).
  assert.equal(root.children.length, 2, "setActiveOption não reconstrói o shell (header+body continuam os únicos filhos de root)");

  console.log("administrator-shell.test.js: setActiveOption atualiza header/link ativo/grupo expandido sem reconstruir o shell ok.");
}

// --- dispose() limpa o root por completo ------------------------------------

{
  const root = createRoot();
  const shell = createAdministratorShell({ root, activeOption: "com_cpanel" });
  assert.ok(root.children.length > 0);

  shell.dispose();
  assert.equal(root.children.length, 0);
  assert.equal(root.classList.names.has("mse-administrator-shell"), false);

  console.log("administrator-shell.test.js: dispose() limpa o root por completo ok.");
}

// --- validação de root inválido lança erro claro ----------------------------

{
  assert.throws(() => createAdministratorShell({ root: null }), TypeError);
  assert.throws(() => createAdministratorShell({ root: {} }), TypeError);

  console.log("administrator-shell.test.js: validação de root inválido ok.");
}

console.log("administrator-shell.test.js: verificações concluídas com sucesso.");
