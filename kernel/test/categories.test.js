import assert from "node:assert/strict";
import { buildCategoryTree, listPublishedCategories, resolveArticleCategory } from "../categories.js";

// --- fixture compartilhada: 3 níveis -----------------------------------
//
// Notícias (raiz)
//   Esportes (filho de Notícias)
//     Futebol (nieto, filho de Esportes)
//   Economia (filho de Notícias, Unpublished -> deve ser ignorado)
// Cultura (raiz, Unpublished -> deve ser ignorado por completo)

function fixtureItems() {
  return [
    { Id: 1, Title: "Notícias", Alias: "noticias", Extension: "com_content", ParentId: 0, Level: 1, Ordering: 1, Published: "Published" },
    { Id: 2, Title: "Esportes", Alias: "esportes", Extension: "com_content", ParentId: 1, Level: 2, Ordering: 1, Published: "Published" },
    { Id: 3, Title: "Futebol", Alias: "futebol", Extension: "com_content", ParentId: 2, Level: 3, Ordering: 1, Published: "Published" },
    { Id: 4, Title: "Economia", Alias: "economia", Extension: "com_content", ParentId: 1, Level: 2, Ordering: 2, Published: "Unpublished" },
    { Id: 5, Title: "Cultura", Alias: "cultura", Extension: "com_content", ParentId: 0, Level: 1, Ordering: 2, Published: "Unpublished" }
  ];
}

// --- buildCategoryTree -------------------------------------------------

{
  const tree = buildCategoryTree(fixtureItems());
  // apenas raízes publicadas: Notícias; Cultura (despublicada) ignorada.
  assert.equal(tree.length, 1);
  assert.equal(tree[0].Title, "Notícias");

  const esportes = tree[0].children;
  // Economia (despublicada) não aparece entre os filhos de Notícias.
  assert.equal(esportes.length, 1);
  assert.equal(esportes[0].Title, "Esportes");
  assert.equal(esportes[0].children.length, 1);
  assert.equal(esportes[0].children[0].Title, "Futebol");
  assert.equal(esportes[0].children[0].children.length, 0);

  console.log("categories.test.js: buildCategoryTree ok.");
}

{
  assert.throws(() => buildCategoryTree(undefined), TypeError);
  assert.deepEqual(buildCategoryTree([]), []);
  console.log("categories.test.js: buildCategoryTree valida array/tolera lista vazia ok.");
}

// --- listPublishedCategories --------------------------------------------

{
  const items = [
    { Id: 1, Title: "B", Ordering: 2, Published: "Published" },
    { Id: 2, Title: "A", Ordering: 1, Published: "Published" },
    { Id: 3, Title: "C", Ordering: 3, Published: "Unpublished" }
  ];
  const published = listPublishedCategories(items);
  assert.deepEqual(published.map((item) => item.Title), ["A", "B"]);
  console.log("categories.test.js: listPublishedCategories filtra e ordena por Ordering ok.");
}

{
  assert.throws(() => listPublishedCategories(null), TypeError);
  assert.deepEqual(listPublishedCategories([]), []);
  console.log("categories.test.js: listPublishedCategories valida array/tolera lista vazia ok.");
}

// --- resolveArticleCategory ----------------------------------------------

{
  const categories = [
    { Id: 1, Title: "Notícias", Alias: "noticias" },
    { Id: 2, Title: "Esportes", Alias: "esportes" }
  ];
  assert.equal(resolveArticleCategory(categories, 2)?.Title, "Esportes");
  assert.equal(resolveArticleCategory(categories, "2")?.Title, "Esportes");
  assert.equal(resolveArticleCategory(categories, "noticias")?.Title, "Notícias");
  assert.equal(resolveArticleCategory(categories, "ESPORTES")?.Title, "Esportes");
  assert.equal(resolveArticleCategory(categories, "Notícias")?.Title, "Notícias");
  console.log("categories.test.js: resolveArticleCategory casa por Id, Alias e Title ok.");
}

{
  const categories = [{ Id: 1, Title: "Notícias", Alias: "noticias" }];
  assert.equal(resolveArticleCategory(categories, null), null);
  assert.equal(resolveArticleCategory(categories, undefined), null);
  assert.equal(resolveArticleCategory(categories, ""), null);
  assert.equal(resolveArticleCategory(categories, "inexistente"), null);
  assert.throws(() => resolveArticleCategory(undefined, 1), TypeError);
  console.log("categories.test.js: resolveArticleCategory tolera ausência/ids inexistentes ok.");
}

console.log("categories.test.js: todas as verificações concluídas com sucesso.");
