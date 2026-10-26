import assert from "node:assert/strict";
import { createArticlesCategoriesReadService, resolveCategoriesTree } from "../articles-categories-data.js";

const calls = [];
const repository = {
  async findMany(query) {
    calls.push(query);
    return {
      items: [
        { id: 10, title: "Notícias", alias: "noticias", extension: "com_content", parentId: 0, level: 1, ordering: 1, published: "Published" },
        { id: 11, title: "Eventos", alias: "eventos", extension: "com_content", parentId: 10, level: 2, ordering: 2, published: "Published" }
      ]
    };
  }
};

const service = createArticlesCategoriesReadService({ repository });
const categories = await service.listCategories();
assert.deepEqual(categories[0], {
  Id: 10,
  Title: "Notícias",
  Alias: "noticias",
  Extension: "com_content",
  Description: undefined,
  ParentId: 0,
  Level: 1,
  Ordering: 1,
  Published: "Published",
  ParamsJson: undefined
});
assert.equal(resolveCategoriesTree(categories, { showChildren: true })[0].children[0].Title, "Eventos");
assert.deepEqual(calls[0], {
  select: ["id", "title", "alias", "extension", "description", "parentId", "level", "ordering", "published"],
  filter: { field: "published", operator: "eq", value: "Published" },
  orderBy: [{ field: "ordering", direction: "asc" }],
  pageSize: 100
});
console.log("ok - categories module consumes the SPMIDDLE repository contract");
