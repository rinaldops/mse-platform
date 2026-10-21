import assert from "node:assert/strict";
import { parseRoute, serializeRoute, createSiteRouter } from "../router.js";

// --- parseRoute: hash vazio / raiz -----------------------------------------

{
  assert.deepEqual(parseRoute(""), { alias: "", id: null, slug: null, query: {} });
  assert.deepEqual(parseRoute(), { alias: "", id: null, slug: null, query: {} });
  assert.deepEqual(parseRoute("#/"), { alias: "", id: null, slug: null, query: {} });
  assert.deepEqual(parseRoute("#"), { alias: "", id: null, slug: null, query: {} });
  assert.deepEqual(parseRoute(null), { alias: "", id: null, slug: null, query: {} });

  console.log("router.test.js: parseRoute hash vazio/raiz ok.");
}

// --- parseRoute: só alias ---------------------------------------------------

{
  assert.deepEqual(parseRoute("#/destaques"), { alias: "destaques", id: null, slug: null, query: {} });
  assert.deepEqual(parseRoute("/destaques"), { alias: "destaques", id: null, slug: null, query: {} });

  console.log("router.test.js: parseRoute só alias ok.");
}

// --- parseRoute: alias + id + slug -----------------------------------------

{
  const route = parseRoute("#/destaques/42-titulo-do-artigo");
  assert.deepEqual(route, { alias: "destaques", id: 42, slug: "titulo-do-artigo", query: {} });

  // id sem slug
  const routeNoSlug = parseRoute("#/destaques/42");
  assert.deepEqual(routeNoSlug, { alias: "destaques", id: 42, slug: null, query: {} });

  console.log("router.test.js: parseRoute alias+id+slug ok.");
}

// --- parseRoute: alias + id + slug + query com múltiplas chaves -------------

{
  const route = parseRoute("#/destaques/42-titulo-do-artigo?page=2&ordem=desc");
  assert.deepEqual(route, {
    alias: "destaques",
    id: 42,
    slug: "titulo-do-artigo",
    query: { page: "2", ordem: "desc" }
  });

  // query sem segmento id/slug
  const routeOnlyAliasQuery = parseRoute("#/blog?categoria=noticias");
  assert.deepEqual(routeOnlyAliasQuery, {
    alias: "blog",
    id: null,
    slug: null,
    query: { categoria: "noticias" }
  });

  console.log("router.test.js: parseRoute alias+id+slug+query ok.");
}

// --- parseRoute: hash malformado degrada graciosamente ----------------------

{
  // segmento <id>-<slug> não numérico: mantém alias, descarta id/slug
  assert.deepEqual(parseRoute("#/destaques/nao-numerico"), {
    alias: "destaques",
    id: null,
    slug: null,
    query: {}
  });

  // percent-encoding inválido: degrada para rota vazia, nunca lança
  assert.doesNotThrow(() => parseRoute("#/%E0%A4%A"));
  assert.deepEqual(parseRoute("#/%E0%A4%A"), { alias: "", id: null, slug: null, query: {} });

  // valores não-string
  assert.doesNotThrow(() => parseRoute(undefined));
  assert.doesNotThrow(() => parseRoute(123));
  assert.doesNotThrow(() => parseRoute({}));

  console.log("router.test.js: parseRoute hash malformado ok.");
}

// --- serializeRoute: omissão correta de partes ausentes ---------------------

{
  assert.equal(serializeRoute({ alias: "" }), "#/");
  assert.equal(serializeRoute({}), "#/");
  assert.equal(serializeRoute(), "#/");
  assert.equal(serializeRoute({ alias: "destaques" }), "#/destaques");
  assert.equal(
    serializeRoute({ alias: "destaques", id: 42, slug: "titulo-do-artigo" }),
    "#/destaques/42-titulo-do-artigo"
  );
  assert.equal(serializeRoute({ alias: "destaques", id: 42 }), "#/destaques/42");
  assert.equal(
    serializeRoute({ alias: "destaques", id: 42, slug: "titulo-do-artigo", query: { page: "2" } }),
    "#/destaques/42-titulo-do-artigo?page=2"
  );
  assert.equal(serializeRoute({ alias: "blog", query: {} }), "#/blog");

  console.log("router.test.js: serializeRoute omissão de partes ok.");
}

// --- round-trip parseRoute(serializeRoute(r)) === r --------------------------

{
  const cases = [
    { alias: "", id: null, slug: null, query: {} },
    { alias: "destaques", id: null, slug: null, query: {} },
    { alias: "destaques", id: 42, slug: "titulo-do-artigo", query: {} },
    { alias: "destaques", id: 42, slug: "titulo-do-artigo", query: { page: "2", ordem: "desc" } },
    { alias: "blog", id: null, slug: null, query: { categoria: "noticias" } }
  ];

  for (const original of cases) {
    const roundTripped = parseRoute(serializeRoute(original));
    assert.deepEqual(roundTripped, original);
  }

  // id sem slug: round-trip normaliza slug ausente para null (esperado,
  // já que não há slug a reconstituir).
  const idOnly = parseRoute(serializeRoute({ alias: "destaques", id: 42, query: {} }));
  assert.deepEqual(idOnly, { alias: "destaques", id: 42, slug: null, query: {} });

  console.log("router.test.js: round-trip parseRoute/serializeRoute ok.");
}

// --- createSiteRouter: onRoute chamado com objeto estruturado --------------
//
// `createSiteRouter` depende de `createHashRouter`/`navigateTo` de
// `core/navigation.js`, que por sua vez dependem de `window`/`location` e
// do evento `hashchange` (ambiente de browser). Seguindo o mesmo padrão de
// stub mínimo usado em `core/test/navigation.test.js` (sem DOM completo:
// apenas os métodos que `core/navigation.js` efetivamente chama).

{
  const window = {
    location: { hash: "#/destaques/42-titulo?page=2" },
    document: { getElementById() { return null; } },
    listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (this.listeners.get(type) === listener) this.listeners.delete(type);
    },
    matchMedia: () => ({ matches: false })
  };

  const receivedRoutes = [];
  const router = createSiteRouter({
    window,
    scroll: false,
    onRoute: (route) => receivedRoutes.push(route)
  });

  // chamada inicial (initial: true por padrão) já deve ter disparado onRoute
  // com a rota estruturada, não a string crua do hash.
  assert.deepEqual(receivedRoutes, [
    { alias: "destaques", id: 42, slug: "titulo", query: { page: "2" } }
  ]);

  // navigate() serializa e delega a navigateTo (muda window.location.hash).
  const hash = router.navigate({ alias: "blog", id: 7, slug: "post" }, { scroll: false });
  assert.equal(hash, "#/blog/7-post");
  assert.equal(window.location.hash, "#/blog/7-post");

  // simula o browser disparando hashchange após a navegação.
  window.listeners.get("hashchange")();
  assert.deepEqual(receivedRoutes, [
    { alias: "destaques", id: 42, slug: "titulo", query: { page: "2" } },
    { alias: "blog", id: 7, slug: "post", query: {} }
  ]);

  router.dispose();
  // após dispose(), nova mudança de hash não deve mais notificar onRoute.
  window.location.hash = "#/outra-rota";
  window.listeners.get("hashchange")?.();
  assert.equal(receivedRoutes.length, 2);

  console.log("router.test.js: createSiteRouter onRoute com objeto estruturado ok.");
}

console.log("router.test.js: verificações concluídas com sucesso.");
