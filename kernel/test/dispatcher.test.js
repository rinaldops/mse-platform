import assert from "node:assert/strict";
import { resolveDispatch } from "../dispatcher.js";

// --- fixtures --------------------------------------------------------------
//
// Itens de menu (shape cru de MSEMenu, ver kernel/menu.js):
//   Id 1 - "Início" (raiz, Padrao, SEM Componente -> "somente módulos")
//   Id 2 - "Blog" (Componente "blog", habilitado, Visao "lista", sem ParamsJson)
//   Id 3 - "Destaques" (Componente "blog", Visao "destaques",
//          ParamsJson válido: {"categoria":"principal"})
//   Id 4 - "Legado" (Componente "legado", Visao "lista",
//          ParamsJson malformado -> tratado como {})
//   Id 5 - "Forum" (Componente "forum", DESABILITADO em MSEExtensoes)
//   Id 6 - "Oculto" (Componente "inexistente-no-registro", não cadastrado
//          em MSEExtensoes -> isEnabled trata como desabilitado)

function fixtureMenuItems() {
  return [
    { Id: 1, Title: "Início", Alias: "", ParentId: 0, Componente: null, Visao: null, ParamsJson: null, Padrao: true, Estado: "Publicado" },
    { Id: 2, Title: "Blog", Alias: "blog", ParentId: 0, Componente: "blog", Visao: "lista", ParamsJson: null, Padrao: false, Estado: "Publicado" },
    { Id: 3, Title: "Destaques", Alias: "destaques", ParentId: 0, Componente: "blog", Visao: "destaques", ParamsJson: '{"categoria":"principal"}', Padrao: false, Estado: "Publicado" },
    { Id: 4, Title: "Legado", Alias: "legado", ParentId: 0, Componente: "legado", Visao: "lista", ParamsJson: "{isso nao e json}", Padrao: false, Estado: "Publicado" },
    { Id: 5, Title: "Forum", Alias: "forum", ParentId: 0, Componente: "forum", Visao: null, ParamsJson: null, Padrao: false, Estado: "Publicado" },
    { Id: 6, Title: "Oculto", Alias: "oculto", ParentId: 0, Componente: "inexistente-no-registro", Visao: null, ParamsJson: null, Padrao: false, Estado: "Publicado" }
  ];
}

function fixtureExtensions() {
  return [
    { Title: "Blog", Tipo: "Componente", Elemento: "blog", Versao: "1.0.0", Habilitado: true, Protegido: false },
    { Title: "Legado", Tipo: "Componente", Elemento: "legado", Versao: "0.1.0", Habilitado: true, Protegido: false },
    { Title: "Fórum", Tipo: "Componente", Elemento: "forum", Versao: "1.0.0", Habilitado: false, Protegido: false }
  ];
}

function emptyQueryRoute(overrides = {}) {
  return { alias: "", id: null, slug: null, query: {}, ...overrides };
}

// --- rota raiz sem Componente (Home "somente módulos") ---------------------

{
  const result = resolveDispatch({
    route: emptyQueryRoute(),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "modules-only");
  assert.ok(result.menuItem);
  assert.equal(result.menuItem.Id, 1);

  console.log("dispatcher.test.js: rota raiz sem Componente (modules-only) ok.");
}

// --- rota com Componente habilitado -----------------------------------------

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "blog" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, true);
  assert.equal(result.componente, "blog");
  assert.equal(result.view, "lista");
  assert.deepEqual(result.params, {});
  assert.equal(result.menuItem.Id, 2);
  assert.equal(result.routeId, null);
  assert.equal(result.routeSlug, null);

  console.log("dispatcher.test.js: Componente habilitado ok.");
}

// --- rota com Componente desabilitado ---------------------------------------

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "forum" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "disabled");
  assert.equal(result.menuItem.Id, 5);

  console.log("dispatcher.test.js: Componente desabilitado ok.");
}

// --- Componente ausente do registro de extensões (tratado como desabilitado) -

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "oculto" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "disabled");

  console.log("dispatcher.test.js: Componente não cadastrado em MSEExtensoes ok.");
}

// --- rota sem item de menu correspondente (404) -----------------------------

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "pagina-inexistente" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "not-found");
  assert.equal(result.menuItem, null);

  console.log("dispatcher.test.js: rota sem item de menu (not-found) ok.");
}

// --- ParamsJson válido é mesclado nos params --------------------------------

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "destaques" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, true);
  assert.equal(result.view, "destaques");
  assert.deepEqual(result.params, { categoria: "principal" });

  console.log("dispatcher.test.js: ParamsJson válido ok.");
}

// --- ParamsJson malformado degrada para "sem parâmetros adicionais" --------

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "legado" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, true);
  assert.deepEqual(result.params, {});

  console.log("dispatcher.test.js: ParamsJson malformado ok (não lança, params vazio).");
}

// --- ParamsJson ausente (null) já cobertos pelo caso "blog" acima; aqui
// reforça explicitamente com string vazia e undefined. -----------------------

{
  const items = fixtureMenuItems();
  items[1] = { ...items[1], ParamsJson: "" };
  const resultEmptyString = resolveDispatch({
    route: emptyQueryRoute({ alias: "blog" }),
    menuItems: items,
    extensions: fixtureExtensions()
  });
  assert.deepEqual(resultEmptyString.params, {});

  const items2 = fixtureMenuItems();
  delete items2[1].ParamsJson;
  const resultUndefined = resolveDispatch({
    route: emptyQueryRoute({ alias: "blog" }),
    menuItems: items2,
    extensions: fixtureExtensions()
  });
  assert.deepEqual(resultUndefined.params, {});

  console.log("dispatcher.test.js: ParamsJson ausente (string vazia / undefined) ok.");
}

// --- mesclagem de query string: query da rota + ParamsJson do menu ----------
// Em caso de chave repetida, ParamsJson (fixo pelo gestor) prevalece sobre a
// query string (ajustável por quem navega), e id/slug da rota são expostos
// brutos (routeId/routeSlug), sem entrar no merge nomeado de params.

{
  const result = resolveDispatch({
    route: { alias: "destaques", id: 42, slug: "titulo-do-artigo", query: { page: "2", categoria: "secundaria" } },
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, true);
  // "categoria" vem de ParamsJson ("principal"), não da query ("secundaria").
  assert.deepEqual(result.params, { page: "2", categoria: "principal" });
  assert.equal(result.routeId, 42);
  assert.equal(result.routeSlug, "titulo-do-artigo");

  console.log("dispatcher.test.js: mesclagem de query string + ParamsJson ok.");
}

// --- resolução de view: query.view tem prioridade sobre Visao do menu ------

{
  const result = resolveDispatch({
    route: { alias: "blog", id: null, slug: null, query: { view: "card" } },
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, true);
  assert.equal(result.view, "card");
  // "view" na query também aparece em params (não é removida do merge).
  assert.equal(result.params.view, "card");

  console.log("dispatcher.test.js: query.view prevalece sobre Visao do item de menu ok.");
}

// --- resolução de view: default quando nem query nem menu especificam ------

{
  const items = fixtureMenuItems();
  items[1] = { ...items[1], Visao: null };
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "blog" }),
    menuItems: items,
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, true);
  assert.equal(result.view, "full");

  const resultCustomDefault = resolveDispatch({
    route: emptyQueryRoute({ alias: "blog" }),
    menuItems: items,
    extensions: fixtureExtensions(),
    defaultView: "resumo"
  });
  assert.equal(resultCustomDefault.view, "resumo");

  console.log("dispatcher.test.js: visão padrão (defaultView) ok.");
}

// --- rota raiz sem nenhum item Padrao publicado também é not-found ---------

{
  const items = fixtureMenuItems().map((item) => (item.Id === 1 ? { ...item, Padrao: false } : item));
  const result = resolveDispatch({
    route: emptyQueryRoute(),
    menuItems: items,
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "not-found");

  console.log("dispatcher.test.js: raiz sem item Padrao publicado (not-found) ok.");
}

console.log("dispatcher.test.js: verificações concluídas com sucesso.");
