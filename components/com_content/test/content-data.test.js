import assert from "node:assert/strict";
import { createContentReadService, listCategories } from "../content-data.js";

const list = { listId: "guid-fake" };
const raw = [
  { Id: 1, Title: "Mais novo", State: "Published", CatId: 10, Featured: true, Created: "2026-01-03T00:00:00Z" },
  { Id: 2, Title: "Mais antigo", State: "Published", CatId: 20, Featured: false, Created: "2026-01-01T00:00:00Z" },
  { Id: 3, Title: "Despublicado", State: "Unpublished", CatId: 10, Featured: true, Created: "2026-01-02T00:00:00Z" }
];
const fieldMap = { titulo: "Title", estadoEditorial: "State", categoria: "CatId", destaque: "Featured" };

function clientReturning(items) {
  return { async getListItems() { return items; } };
}

// --- listPublished: filtra por estado e ordena por criadoEm desc --------

{
  const service = createContentReadService({ client: clientReturning(raw), list, fieldMap });
  const published = await service.listPublished();
  assert.deepEqual(published.map((article) => article.id), [1, 2]);
  console.log("content-data.test.js: listPublished filtra e ordena ok.");
}

// --- listFeatured: só destacados entre os publicados --------------------

{
  const service = createContentReadService({ client: clientReturning(raw), list, fieldMap });
  const featured = await service.listFeatured();
  assert.deepEqual(featured.map((article) => article.id), [1]);
  console.log("content-data.test.js: listFeatured ok.");
}

// --- listByCategory: filtra por categoriaId (via kernel/categories.js) --

{
  const service = createContentReadService({ client: clientReturning(raw), list, fieldMap });
  const categories = [{ Id: 10, Title: "Notícias", Alias: "noticias", Published: "Published" }];
  const byCategory = await service.listByCategory(categories, 10);
  assert.deepEqual(byCategory.map((article) => article.id), [1]);
  console.log("content-data.test.js: listByCategory ok.");
}

// --- findArticle: resolve por id numérico, entre os publicados ----------

{
  const service = createContentReadService({ client: clientReturning(raw), list, fieldMap });
  const found = await service.findArticle("1");
  assert.equal(found?.id, 1);
  assert.equal(await service.findArticle(999), null);
  assert.equal(await service.findArticle(3), null, "artigo despublicado não deve ser encontrado");
  console.log("content-data.test.js: findArticle ok.");
}

// --- listCategories: tolera ausência de MSECategories (devolve []) ------

{
  assert.deepEqual(await listCategories({ client: clientReturning([]), listIds: {} }), []);
  const result = await listCategories({
    client: { async getListItems(l) { return [{ Id: 10, Title: "Notícias" }]; } },
    listIds: { MSECategories: { listId: "cat-list" } }
  });
  assert.deepEqual(result, [{ Id: 10, Title: "Notícias" }]);
  console.log("content-data.test.js: listCategories ok.");
}

console.log("content-data.test.js: verificações concluídas com sucesso.");
