import assert from "node:assert/strict";
import { createArticlesNewsReadService } from "../articles-news-data.js";

const articles = [
  { Id: 1, Title: "A", EstadoEditorial: "Publicado", CategoriaTexto: null, TagsTexto: JSON.stringify(["promo"]), Destaque: false, DataPublicacao: "2026-01-03T00:00:00Z", Created: "2026-01-03T00:00:00Z" },
  { Id: 2, Title: "B", EstadoEditorial: "Publicado", CategoriaTexto: null, TagsTexto: "[]", Destaque: true, OrdemDestaque: 1, DataPublicacao: "2026-01-01T00:00:00Z", Created: "2026-01-01T00:00:00Z" },
  { Id: 3, Title: "C", EstadoEditorial: "Despublicado", CategoriaTexto: null, TagsTexto: "[]", Destaque: false, DataPublicacao: "2026-01-02T00:00:00Z", Created: "2026-01-02T00:00:00Z" }
];

const list = { listId: "guid-fake" };
const client = { async getListItems() { return articles; } };
const service = createArticlesNewsReadService({ client, list });

// publicados apenas, ordenado por data de publicação desc
{
  const result = await service.listNewsArticles({ count: 10 });
  assert.deepEqual(result.map((article) => article.id), [1, 2]);
}

// filtro por tag
{
  const result = await service.listNewsArticles({ tag: "promo", count: 10 });
  assert.deepEqual(result.map((article) => article.id), [1]);
}

// excludeCurrent
{
  const result = await service.listNewsArticles({ count: 10, excludeCurrent: true, currentArticleId: 1 });
  assert.deepEqual(result.map((article) => article.id), [2]);
}

// ordenação crescente por data de criação
{
  const result = await service.listNewsArticles({ count: 10, ordering: "dataCriacao", direction: "asc" });
  assert.deepEqual(result.map((article) => article.id), [2, 1]);
}

console.log("articles-news-data.test.js: verificações concluídas com sucesso.");
