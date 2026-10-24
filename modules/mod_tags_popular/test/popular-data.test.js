import assert from "node:assert/strict";
import { readArticlesService, buildPopularTags } from "../popular-data.js";

// --- readArticlesService ----------------------------------------------------

{
  assert.throws(() => readArticlesService({}), TypeError);
  assert.throws(() => readArticlesService({ adminClient: { getListItems() {} } }), TypeError);

  const service = readArticlesService({
    adminClient: { async getListItems() { return []; } },
    listIds: { MSEPublicacoes: { listId: "guid-fake" } }
  });
  assert.equal(typeof service.listArticles, "function");
  console.log("popular-data.test.js: readArticlesService valida e resolve o serviço ok.");
}

// --- buildPopularTags --------------------------------------------------------

{
  const artigos = [
    { id: 1, estado: "Publicado", tags: ["a", "b"] },
    { id: 2, estado: "Publicado", tags: ["b"] },
    { id: 3, estado: "Publicado", tags: ["a", "c"] },
    { id: 4, estado: "Despublicado", tags: ["ignorado"] }
  ];
  const resultado = buildPopularTags(artigos);
  assert.deepEqual(resultado, [{ tag: "a", count: 2 }, { tag: "b", count: 2 }, { tag: "c", count: 1 }]);
  console.log("popular-data.test.js: buildPopularTags filtra publicados e agrega tags ok.");
}

{
  const artigos = [
    { id: 1, estado: "Publicado", tags: ["a", "b", "c"] }
  ];
  const resultado = buildPopularTags(artigos, { maximum: 2 });
  assert.equal(resultado.length, 2);
  console.log("popular-data.test.js: buildPopularTags respeita maximum ok.");
}

{
  const agora = new Date("2026-06-15T12:00:00Z");
  const artigos = [
    { id: "antigo", estado: "Publicado", tags: ["velha"], criadoEm: "2025-01-01T00:00:00Z" },
    { id: "recente", estado: "Publicado", tags: ["nova"], criadoEm: "2026-06-10T00:00:00Z" }
  ];
  const resultado = buildPopularTags(artigos, { timeframe: "week", agora });
  assert.deepEqual(resultado, [{ tag: "nova", count: 1 }]);
  console.log("popular-data.test.js: buildPopularTags respeita timeframe ok.");
}

{
  const artigos = [
    { id: 1, estado: "Publicado", tags: ["zebra"] },
    { id: 2, estado: "Publicado", tags: ["abelha", "abelha"] }
  ];
  const porTitulo = buildPopularTags(artigos, { orderValue: "title", orderDirection: "asc" });
  assert.deepEqual(porTitulo.map((entry) => entry.tag), ["abelha", "zebra"]);
  console.log("popular-data.test.js: buildPopularTags ordena por title/direction ok.");
}

{
  assert.deepEqual(buildPopularTags(undefined), []);
  assert.deepEqual(buildPopularTags([]), []);
  console.log("popular-data.test.js: buildPopularTags tolera lista ausente/vazia ok.");
}

console.log("popular-data.test.js: verificações concluídas com sucesso.");
