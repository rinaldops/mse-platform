import assert from "node:assert/strict";
import {
  createArticlesCategoriesReadService,
  resolveCategoriesTree,
  countArticlesByCategory,
  readArticleCountsByCategory
} from "../articles-categories-data.js";

const categories = [
  { Id: 10, Title: "Notícias", Alias: "noticias", ParentId: null, Ordering: 1, Published: "Published" },
  { Id: 20, Title: "Sub-notícias", Alias: "sub-noticias", ParentId: 10, Ordering: 1, Published: "Published" },
  { Id: 11, Title: "Eventos", Alias: "eventos", ParentId: null, Ordering: 2, Published: "Published" }
];

// createArticlesCategoriesReadService: validações + leitura
{
  assert.throws(() => createArticlesCategoriesReadService({}), /getListItems/);
  assert.throws(() => createArticlesCategoriesReadService({ client: { getListItems() {} } }), /list/);

  const list = { listId: "cat-guid" };
  const client = { async getListItems() { return categories; } };
  const service = createArticlesCategoriesReadService({ client, list });
  const result = await service.listCategories();
  assert.equal(result.length, 3);
}

// resolveCategoriesTree: raiz, sem subcategorias por padrão
{
  const tree = resolveCategoriesTree(categories, {});
  assert.equal(tree.length, 2);
  assert.deepEqual(tree[0].children, []);
}

// resolveCategoriesTree: showChildren true preserva subárvore
{
  const tree = resolveCategoriesTree(categories, { showChildren: true });
  assert.equal(tree[0].children.length, 1);
}

// resolveCategoriesTree: parent restringe a árvore
{
  const tree = resolveCategoriesTree(categories, { parent: "noticias", showChildren: true });
  assert.equal(tree.length, 1);
  assert.equal(tree[0].Title, "Sub-notícias");
}

// resolveCategoriesTree: count limita
{
  const tree = resolveCategoriesTree(categories, { count: 1 });
  assert.equal(tree.length, 1);
}

// countArticlesByCategory
{
  const articles = [
    { id: 1, categoriaId: "noticias" },
    { id: 2, categoriaId: "noticias" },
    { id: 3, categoriaId: "eventos" }
  ];
  const counts = countArticlesByCategory(categories, articles.map((a) => ({ ...a, estado: "Publicado" })));
  assert.equal(counts.get(10), 2);
  assert.equal(counts.get(11), 1);
}

// readArticleCountsByCategory: null quando sem lista
{
  const result = await readArticleCountsByCategory({ client: null, list: null }, categories);
  assert.equal(result, null);
}

console.log("articles-categories-data.test.js: verificações concluídas com sucesso.");
