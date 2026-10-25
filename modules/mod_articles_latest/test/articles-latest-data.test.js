import assert from "node:assert/strict";
import { createArticlesLatestReadService } from "../articles-latest-data.js";

const now = new Date();
const articles = [
  { Id: 1, Title: "B artigo", EstadoEditorial: "Publicado", CategoriaTexto: "noticias", Destaque: false, Created: now.toISOString() },
  { Id: 2, Title: "A artigo", EstadoEditorial: "Publicado", CategoriaTexto: "noticias", Destaque: true, OrdemDestaque: 1, Created: new Date(now.getTime() - 86400000).toISOString() },
  { Id: 3, Title: "C artigo", EstadoEditorial: "Despublicado", CategoriaTexto: "noticias", Destaque: false, Created: now.toISOString() }
];
const categories = [{ Id: 10, Title: "Notícias", Alias: "noticias", Published: "Published" }];

const list = { listId: "guid-fake" };
const client = {
  async getListItems() { return articles; }
};

const service = createArticlesLatestReadService({ client, list });

// publicados apenas, ordenado por mais recente
{
  const result = await service.listLatestArticles({ categories, count: 10 });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((article) => article.id), [1, 2]);
}

// somente destacados
{
  const result = await service.listLatestArticles({ categories, showFeatured: "somenteDestacados", count: 10 });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
}

// ordenado por título
{
  const result = await service.listLatestArticles({ categories, ordering: "titulo", count: 10 });
  assert.deepEqual(result.map((article) => article.titulo), ["A artigo", "B artigo"]);
}

// filtro por categoria (alias)
{
  const result = await service.listLatestArticles({ categories, categoriaId: "noticias", count: 10 });
  assert.equal(result.length, 2);
}

// count limita
{
  const result = await service.listLatestArticles({ categories, count: 1 });
  assert.equal(result.length, 1);
}

console.log("articles-latest-data.test.js: verificações concluídas com sucesso.");
