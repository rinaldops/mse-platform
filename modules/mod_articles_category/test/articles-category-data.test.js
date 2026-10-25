import assert from "node:assert/strict";
import { createArticlesCategoryReadService } from "../articles-category-data.js";

const now = new Date();
const articles = [
  { Id: 1, Title: "Zebra", EstadoEditorial: "Publicado", CategoriaTexto: "noticias", Destaque: false, Created: now.toISOString() },
  { Id: 2, Title: "Abelha", EstadoEditorial: "Publicado", CategoriaTexto: "noticias", Destaque: true, OrdemDestaque: 1, Created: new Date(now.getTime() - 86400000).toISOString() },
  { Id: 3, Title: "Outra categoria", EstadoEditorial: "Publicado", CategoriaTexto: "eventos", Destaque: false, Created: now.toISOString() }
];
const categories = [
  { Id: 10, Title: "Notícias", Alias: "noticias", Published: "Published" },
  { Id: 11, Title: "Eventos", Alias: "eventos", Published: "Published" }
];

const list = { listId: "guid-fake" };
const client = { async getListItems() { return articles; } };
const service = createArticlesCategoryReadService({ client, list });

// filtro por categoria + ordenação por título ascendente (padrão)
{
  const result = await service.listCategoryArticles({ categories, categoriaId: "noticias" });
  assert.deepEqual(result.map((article) => article.titulo), ["Abelha", "Zebra"]);
}

// showFront "somenteDestacados"
{
  const result = await service.listCategoryArticles({ categories, categoriaId: "noticias", showFront: "somenteDestacados" });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
}

// count limita
{
  const result = await service.listCategoryArticles({ categories, categoriaId: "noticias", count: 1 });
  assert.equal(result.length, 1);
}

// filtro de data relativa exclui artigos fora da janela
{
  const result = await service.listCategoryArticles({
    categories, categoriaId: "noticias", dateFiltering: "relative", dateField: "criadoEm", relativeDate: 0.5
  });
  assert.deepEqual(result.map((article) => article.id), [1]);
}

console.log("articles-category-data.test.js: verificações concluídas com sucesso.");
