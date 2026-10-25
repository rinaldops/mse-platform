import assert from "node:assert/strict";
import { createArticlesPopularReadService } from "../articles-popular-data.js";

const now = new Date();
const articles = [
  { Id: 1, Title: "Recente", EstadoEditorial: "Publicado", CategoriaTexto: null, Destaque: false, Created: now.toISOString() },
  { Id: 2, Title: "Antigo destacado", EstadoEditorial: "Publicado", CategoriaTexto: null, Destaque: true, Created: new Date(now.getTime() - 5 * 86400000).toISOString() },
  { Id: 3, Title: "Despublicado", EstadoEditorial: "Despublicado", CategoriaTexto: null, Destaque: false, Created: now.toISOString() }
];

const list = { listId: "guid-fake" };
const client = { async getListItems() { return articles; } };
const service = createArticlesPopularReadService({ client, list });

// publicados apenas, ordenado por mais recente
{
  const result = await service.listPopularArticles({ count: 10 });
  assert.deepEqual(result.map((article) => article.id), [1, 2]);
}

// showFront false: exclui destacados
{
  const result = await service.listPopularArticles({ count: 10, showFront: false });
  assert.deepEqual(result.map((article) => article.id), [1]);
}

// filtro de data relativa
{
  const result = await service.listPopularArticles({ count: 10, dateFiltering: "relative", relativeDate: 1 });
  assert.deepEqual(result.map((article) => article.id), [1]);
}

console.log("articles-popular-data.test.js: verificações concluídas com sucesso.");
