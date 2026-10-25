import assert from "node:assert/strict";
import { createArticlesArchiveReadService } from "../articles-archive-data.js";

const now = new Date();
const articles = [
  { Id: 1, Title: "Arquivado recente", EstadoEditorial: "Arquivado", Created: now.toISOString() },
  { Id: 2, Title: "Arquivado antigo", EstadoEditorial: "Arquivado", Created: new Date(now.getTime() - 86400000).toISOString() },
  { Id: 3, Title: "Publicado", EstadoEditorial: "Publicado", Created: now.toISOString() }
];

const list = { listId: "guid-fake" };
const client = { async getListItems() { return articles; } };
const service = createArticlesArchiveReadService({ client, list });

// só artigos arquivados, ordenados por mais recente
{
  const result = await service.listArchivedArticles({ count: 10 });
  assert.deepEqual(result.map((article) => article.id), [1, 2]);
}

// count limita
{
  const result = await service.listArchivedArticles({ count: 1 });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
}

console.log("articles-archive-data.test.js: verificações concluídas com sucesso.");
