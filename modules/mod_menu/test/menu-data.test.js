import assert from "node:assert/strict";
import { createMenuReadService } from "../menu-data.js";

const items = [
  { Id: 1, Title: "Início", Alias: "", ParentId: 0, Ordering: 1, Target: "SameTab", Published: "Published", Default: true },
  { Id: 2, Title: "Contato", Alias: "contato", ParentId: 0, Ordering: 2, Target: "SameTab", Published: "Published", Default: false }
];

const list = { listId: "guid-fake" };
const client = {
  async getListItems(receivedList, options) {
    assert.equal(receivedList, list);
    assert.ok(options.select.includes("Alias"));
    assert.equal(options.orderBy, "Ordering asc");
    return items;
  }
};

const service = createMenuReadService({ client, list });
const result = await service.listMenuItems();
assert.deepEqual(result, items);

assert.throws(() => createMenuReadService({}), TypeError);
assert.throws(() => createMenuReadService({ client }), TypeError);

console.log("menu-data.test.js: verificações concluídas com sucesso.");
