import assert from "node:assert/strict";
import { resolveDispatch } from "../dispatcher.js";

// --- fixtures --------------------------------------------------------------
//
// Itens de menu (shape cru de MSEMenu, ver kernel/menu.js):
//   Id 1 - "Início" (raiz, Default, SEM Component -> "somente módulos")
//   Id 2 - "Blog" (Component "blog", habilitado, View "lista", sem ParamsJson)
//   Id 3 - "Destaques" (Component "blog", View "destaques",
//          ParamsJson válido: {"categoria":"principal"})
//   Id 4 - "Legado" (Component "legado", View "lista",
//          ParamsJson malformado -> tratado como {})
//   Id 5 - "Forum" (Component "forum", DESABILITADO em MSEExtensions)
//   Id 6 - "Oculto" (Component "inexistente-no-registro", não cadastrado
//          em MSEExtensions -> isEnabled trata como desabilitado)

function fixtureMenuItems() {
  return [
    { Id: 1, Title: "Início", Alias: "", ParentId: 0, Component: null, View: null, ParamsJson: null, Default: true, Published: "Published" },
    { Id: 2, Title: "Blog", Alias: "blog", ParentId: 0, Component: "blog", View: "lista", ParamsJson: null, Default: false, Published: "Published" },
    { Id: 3, Title: "Destaques", Alias: "destaques", ParentId: 0, Component: "blog", View: "destaques", ParamsJson: '{"categoria":"principal"}', Default: false, Published: "Published" },
    { Id: 4, Title: "Legado", Alias: "legado", ParentId: 0, Component: "legado", View: "lista", ParamsJson: "{isso nao e json}", Default: false, Published: "Published" },
    { Id: 5, Title: "Forum", Alias: "forum", ParentId: 0, Component: "forum", View: null, ParamsJson: null, Default: false, Published: "Published" },
    { Id: 6, Title: "Oculto", Alias: "oculto", ParentId: 0, Component: "inexistente-no-registro", View: null, ParamsJson: null, Default: false, Published: "Published" }
  ];
}

function fixtureExtensions() {
  return [
    { Title: "Blog", Type: "Component", Element: "blog", Version: "1.0.0", Enabled: true, Protected: false },
    { Title: "Legado", Type: "Component", Element: "legado", Version: "0.1.0", Enabled: true, Protected: false },
    { Title: "Fórum", Type: "Component", Element: "forum", Version: "1.0.0", Enabled: false, Protected: false }
  ];
}

function emptyQueryRoute(overrides = {}) {
  return { alias: "", id: null, slug: null, query: {}, ...overrides };
}

// --- rota raiz sem Component (Home "somente módulos") ---------------------

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

  console.log("dispatcher.test.js: rota raiz sem Component (modules-only) ok.");
}

// --- rota com Component habilitado -----------------------------------------

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

  console.log("dispatcher.test.js: Component habilitado ok.");
}

// --- rota com Component desabilitado ---------------------------------------

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "forum" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "disabled");
  assert.equal(result.menuItem.Id, 5);

  console.log("dispatcher.test.js: Component desabilitado ok.");
}

// --- Component ausente do registro de extensões (tratado como desabilitado) -

{
  const result = resolveDispatch({
    route: emptyQueryRoute({ alias: "oculto" }),
    menuItems: fixtureMenuItems(),
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "disabled");

  console.log("dispatcher.test.js: Component não cadastrado em MSEExtensions ok.");
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

// --- resolução de view: query.view tem prioridade sobre View do menu -------

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

  console.log("dispatcher.test.js: query.view prevalece sobre View do item de menu ok.");
}

// --- resolução de view: default quando nem query nem menu especificam ------

{
  const items = fixtureMenuItems();
  items[1] = { ...items[1], View: null };
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

// --- rota raiz sem nenhum item Default publicado também é not-found --------

{
  const items = fixtureMenuItems().map((item) => (item.Id === 1 ? { ...item, Default: false } : item));
  const result = resolveDispatch({
    route: emptyQueryRoute(),
    menuItems: items,
    extensions: fixtureExtensions()
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, "not-found");

  console.log("dispatcher.test.js: raiz sem item Default publicado (not-found) ok.");
}

console.log("dispatcher.test.js: verificações concluídas com sucesso.");
