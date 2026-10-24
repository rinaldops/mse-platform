import assert from "node:assert/strict";
import { createBreadcrumbsReadService } from "../breadcrumbs-data.js";

const items = [
  { Id: 1, Title: "Início", Alias: "", ParentId: 0, Ordering: 1, Published: "Published", Default: true },
  { Id: 2, Title: "Blog", Alias: "blog", ParentId: 0, Ordering: 2, Published: "Published", Default: false }
];

const list = { listId: "guid-fake" };
const client = {
  async getListItems(receivedList, options) {
    assert.equal(receivedList, list);
    assert.ok(options.select.includes("ParentId"));
    assert.equal(options.orderBy, "Ordering asc");
    return items;
  }
};

const service = createBreadcrumbsReadService({ client, list });
const result = await service.listMenuItems();
assert.deepEqual(result, items);

assert.throws(() => createBreadcrumbsReadService({}), TypeError);
assert.throws(() => createBreadcrumbsReadService({ client }), TypeError);

console.log("breadcrumbs-data.test.js: verificações concluídas com sucesso.");
