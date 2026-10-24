import assert from "node:assert/strict";
import { readArticlesService, findActiveArticle, buildSimilarArticles } from "../similar-data.js";

// --- readArticlesService ----------------------------------------------------

{
  assert.throws(() => readArticlesService({}), TypeError);
  assert.throws(() => readArticlesService({ adminClient: { getListItems() {} } }), TypeError);

  const service = readArticlesService({
    adminClient: { async getListItems() { return []; } },
    listIds: { MSEPublicacoes: { listId: "guid-fake" } }
  });
  assert.equal(typeof service.listArticles, "function");
  console.log("similar-data.test.js: readArticlesService valida e resolve o serviço ok.");
}

// --- findActiveArticle -------------------------------------------------------

{
  const artigos = [
    { id: 1, slug: "primeiro" },
    { id: 2, slug: "segundo" }
  ];
  assert.deepEqual(findActiveArticle(artigos, { id: 2 }), artigos[1]);
  assert.deepEqual(findActiveArticle(artigos, { slug: "primeiro" }), artigos[0]);
  assert.equal(findActiveArticle(artigos, { id: 99 }), null);
  assert.equal(findActiveArticle(artigos, {}), null);
  assert.equal(findActiveArticle(artigos, undefined), null);
  assert.equal(findActiveArticle(undefined, { id: 1 }), null);
  console.log("similar-data.test.js: findActiveArticle resolve por id/slug e tolera ausência ok.");
}

// --- buildSimilarArticles -----------------------------------------------------

{
  const ativo = { id: 1, titulo: "Principal", estado: "Publicado", tags: ["a", "b"] };
  const artigos = [
    ativo,
    { id: 2, titulo: "Zebra", estado: "Publicado", tags: ["a"] },
    { id: 3, titulo: "Abelha", estado: "Publicado", tags: ["b", "c"] },
    { id: 4, titulo: "Sem relação", estado: "Publicado", tags: ["x"] },
    { id: 5, titulo: "Despublicado", estado: "Despublicado", tags: ["a"] }
  ];
  const resultado = buildSimilarArticles(artigos, ativo);
  assert.deepEqual(resultado.map((artigo) => artigo.id), [3, 2]); // ordenado por title asc: Abelha, Zebra
  console.log("similar-data.test.js: buildSimilarArticles filtra por tag em comum (any), exclui o próprio e despublicados ok.");
}

{
  const ativo = { id: 1, titulo: "Principal", estado: "Publicado", tags: ["a"] };
  const artigos = [ativo, { id: 2, titulo: "B", estado: "Publicado", tags: ["a"] }, { id: 3, titulo: "C", estado: "Publicado", tags: ["a"] }];
  const resultado = buildSimilarArticles(artigos, ativo, { maximum: 1 });
  assert.equal(resultado.length, 1);
  console.log("similar-data.test.js: buildSimilarArticles respeita maximum ok.");
}

{
  const ativo = { id: 1, titulo: "Principal", estado: "Publicado", tags: ["a"], criadoEm: "2026-01-01T00:00:00Z" };
  const artigos = [
    ativo,
    { id: 2, titulo: "Recente", estado: "Publicado", tags: ["a"], criadoEm: "2026-03-01T00:00:00Z" },
    { id: 3, titulo: "Antigo", estado: "Publicado", tags: ["a"], criadoEm: "2026-02-01T00:00:00Z" }
  ];
  const resultado = buildSimilarArticles(artigos, ativo, { ordering: "date" });
  assert.deepEqual(resultado.map((artigo) => artigo.id), [2, 3]);
  console.log("similar-data.test.js: buildSimilarArticles ordena por date ok.");
}

{
  assert.deepEqual(buildSimilarArticles(undefined, null), []);
  assert.deepEqual(buildSimilarArticles([{ id: 1 }], null), []);
  assert.deepEqual(buildSimilarArticles([{ id: 1, tags: [] }], { id: 1, tags: [] }), []);
  console.log("similar-data.test.js: buildSimilarArticles tolera artigo ativo ausente/sem tags ok.");
}

console.log("similar-data.test.js: verificações concluídas com sucesso.");
