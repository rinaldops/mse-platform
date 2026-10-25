import assert from "node:assert/strict";
import { readArticlesService, findActiveArticle, buildRelatedArticles } from "../related-data.js";

// --- readArticlesService ----------------------------------------------------

{
  assert.throws(() => readArticlesService({}), TypeError);
  assert.throws(() => readArticlesService({ adminClient: { getListItems() {} } }), TypeError);

  const service = readArticlesService({
    adminClient: { async getListItems() { return []; } },
    listIds: { MSEPublicacoes: { listId: "guid-fake" } }
  });
  assert.equal(typeof service.listArticles, "function");
  console.log("related-data.test.js: readArticlesService valida e resolve o serviço ok.");
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
  console.log("related-data.test.js: findActiveArticle resolve por id/slug e tolera ausência ok.");
}

// --- buildRelatedArticles -----------------------------------------------------

{
  const ativo = { id: 1, titulo: "Principal", estado: "Publicado", tags: ["a", "b"], criadoEm: "2026-01-01T00:00:00Z" };
  const artigos = [
    ativo,
    { id: 2, titulo: "Recente", estado: "Publicado", tags: ["a"], criadoEm: "2026-03-01T00:00:00Z" },
    { id: 3, titulo: "Antigo", estado: "Publicado", tags: ["b", "c"], criadoEm: "2026-02-01T00:00:00Z" },
    { id: 4, titulo: "Sem relação", estado: "Publicado", tags: ["x"], criadoEm: "2026-04-01T00:00:00Z" },
    { id: 5, titulo: "Despublicado", estado: "Despublicado", tags: ["a"], criadoEm: "2026-05-01T00:00:00Z" }
  ];
  const resultado = buildRelatedArticles(artigos, ativo);
  assert.deepEqual(resultado.map((artigo) => artigo.id), [2, 3]); // ordenado por data desc (sortByDate default)
  console.log("related-data.test.js: buildRelatedArticles filtra por tag em comum (any), exclui o próprio e despublicados, ordena por data desc ok.");
}

{
  const ativo = { id: 1, titulo: "Principal", estado: "Publicado", tags: ["a"] };
  const artigos = [ativo, { id: 2, titulo: "B", estado: "Publicado", tags: ["a"] }, { id: 3, titulo: "C", estado: "Publicado", tags: ["a"] }];
  const resultado = buildRelatedArticles(artigos, ativo, { maximum: 1 });
  assert.equal(resultado.length, 1);
  console.log("related-data.test.js: buildRelatedArticles respeita maximum ok.");
}

{
  assert.deepEqual(buildRelatedArticles(undefined, null), []);
  assert.deepEqual(buildRelatedArticles([{ id: 1 }], null), []);
  assert.deepEqual(buildRelatedArticles([{ id: 1, tags: [] }], { id: 1, tags: [] }), []);
  console.log("related-data.test.js: buildRelatedArticles tolera artigo ativo ausente/sem tags ok.");
}

console.log("related-data.test.js: verificações concluídas com sucesso.");
