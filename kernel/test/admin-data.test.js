import assert from "node:assert/strict";
import {
  listAdminItems,
  createAdminItem,
  updateAdminItem,
  deleteAdminItem
} from "../admin-data.js";

/**
 * Fake client em memória, registrando toda chamada em `calls` (histórico de
 * invocações, mesmo padrão de `kernel/test/seed.test.js`/
 * `tools/migrate-camap-home.js` — nenhum framework externo, só `assert`).
 * Expõe as mesmas assinaturas de `core/rest.js#createSharePointRestClient`:
 * `getListItems`, `getListItem`, `createListItem`, `updateListItem`,
 * `deleteListItem`.
 */
function createFakeClient({ etag = '"1"', onUpdate, onDelete } = {}) {
  const calls = [];
  const client = {
    async getListItems(list, options) {
      calls.push({ method: "getListItems", list, options });
      return [{ Id: 1 }];
    },
    async getListItem(list, id, options) {
      calls.push({ method: "getListItem", list, id, options });
      return Object.freeze({ item: { Id: id }, etag, status: 200 });
    },
    async createListItem(list, values) {
      calls.push({ method: "createListItem", list, values });
      return Object.freeze({ item: { Id: 1, ...values }, etag, status: 201 });
    },
    async updateListItem(list, id, values, options) {
      calls.push({ method: "updateListItem", list, id, values, options });
      if (onUpdate) onUpdate(options);
      return Object.freeze({ item: { Id: id, ...values }, etag, status: 204 });
    },
    async deleteListItem(list, id, options) {
      calls.push({ method: "deleteListItem", list, id, options });
      if (onDelete) onDelete(options);
      return Object.freeze({ etag: null, status: 204 });
    }
  };
  return { client, calls };
}

const LIST = Object.freeze({ listId: "10000000-0000-4000-8000-000000000001" });

// --- listAdminItems: pass-through sobre client.getListItems ----------------

{
  const { client, calls } = createFakeClient();
  const result = await listAdminItems({
    client,
    list: LIST,
    select: ["Id", "Title"],
    filter: "Habilitado eq 1",
    orderby: "Title"
  });
  assert.deepEqual(result, [{ Id: 1 }]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    method: "getListItems",
    list: LIST,
    options: { select: ["Id", "Title"], filter: "Habilitado eq 1", orderBy: "Title" }
  });

  console.log("admin-data.test.js: listAdminItems pass-through ok.");
}

// --- listAdminItems: sem select, usa o default ["Id","Title"] em vez de
// repassar undefined ao client REST (bug de produção 21/10/2026: as 3 telas
// de coleção chamavam sem select e core/rest.js lançava TypeError) ---------

{
  const { client, calls } = createFakeClient();
  await listAdminItems({ client, list: LIST, orderby: "Title" });
  assert.deepEqual(calls[0].options, { select: ["Id", "Title"], filter: undefined, orderBy: "Title" });

  console.log("admin-data.test.js: listAdminItems usa select default quando ausente ok.");
}

{
  const { client, calls } = createFakeClient();
  await listAdminItems({ client, list: LIST, select: [] });
  assert.deepEqual(calls[0].options.select, ["Id", "Title"]);

  console.log("admin-data.test.js: listAdminItems usa select default quando array vazio ok.");
}

// --- createAdminItem: delega a client.createListItem -----------------------

{
  const { client, calls } = createFakeClient();
  const values = { Title: "sd-principal", Habilitado: true };
  const result = await createAdminItem({ client, list: LIST, values });
  assert.equal(result.item.Title, "sd-principal");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { method: "createListItem", list: LIST, values });

  console.log("admin-data.test.js: createAdminItem delega ok.");
}

// --- createAdminItem: values não-objeto lança TypeError ---------------------

{
  const { client } = createFakeClient();
  await assert.rejects(createAdminItem({ client, list: LIST, values: null }), TypeError);
  await assert.rejects(createAdminItem({ client, list: LIST, values: "x" }), TypeError);
  await assert.rejects(createAdminItem({ client, list: LIST, values: [1, 2] }), TypeError);

  console.log("admin-data.test.js: createAdminItem rejeita values inválido ok.");
}

// --- updateAdminItem: busca ETag atual antes de escrever --------------------

{
  const { client, calls } = createFakeClient({ etag: '"42"' });
  const values = { Posicao: "home-b" };
  const result = await updateAdminItem({ client, list: LIST, id: 7, values });
  assert.equal(result.item.Posicao, "home-b");

  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "getListItem");
  assert.equal(calls[0].id, 7);
  assert.deepEqual(calls[0].options, { select: ["Id"] });
  assert.equal(calls[1].method, "updateListItem");
  assert.equal(calls[1].id, 7);
  assert.deepEqual(calls[1].values, values);
  assert.deepEqual(calls[1].options, { etag: '"42"' });

  console.log("admin-data.test.js: updateAdminItem busca ETag antes de escrever ok.");
}

// --- deleteAdminItem: busca ETag atual antes de excluir ---------------------

{
  const { client, calls } = createFakeClient({ etag: '"99"' });
  const result = await deleteAdminItem({ client, list: LIST, id: 9 });
  assert.equal(result.status, 204);

  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "getListItem");
  assert.equal(calls[0].id, 9);
  assert.deepEqual(calls[0].options, { select: ["Id"] });
  assert.equal(calls[1].method, "deleteListItem");
  assert.equal(calls[1].id, 9);
  assert.deepEqual(calls[1].options, { etag: '"99"' });

  console.log("admin-data.test.js: deleteAdminItem busca ETag antes de excluir ok.");
}

// --- updateAdminItem: propaga erro de conflito de concorrência -------------

{
  class FakeConcurrencyError extends Error {
    constructor() {
      super("O recurso foi alterado por outra pessoa.");
      this.name = "SharePointRestError";
      this.code = "concurrency-conflict";
      this.status = 412;
    }
  }
  const { client } = createFakeClient({
    onUpdate() {
      throw new FakeConcurrencyError();
    }
  });
  await assert.rejects(
    updateAdminItem({ client, list: LIST, id: 1, values: { Title: "x" } }),
    (error) => error instanceof FakeConcurrencyError && error.code === "concurrency-conflict"
  );

  console.log("admin-data.test.js: updateAdminItem propaga conflito de concorrência ok.");
}

// --- deleteAdminItem: propaga erro de conflito de concorrência -------------

{
  class FakeConcurrencyError extends Error {
    constructor() {
      super("O recurso foi alterado por outra pessoa.");
      this.name = "SharePointRestError";
      this.code = "concurrency-conflict";
      this.status = 412;
    }
  }
  const { client } = createFakeClient({
    onDelete() {
      throw new FakeConcurrencyError();
    }
  });
  await assert.rejects(
    deleteAdminItem({ client, list: LIST, id: 1 }),
    (error) => error instanceof FakeConcurrencyError && error.code === "concurrency-conflict"
  );

  console.log("admin-data.test.js: deleteAdminItem propaga conflito de concorrência ok.");
}

// --- parâmetros ausentes lançam TypeError (bordas) --------------------------

{
  const { client } = createFakeClient();

  await assert.rejects(listAdminItems({ list: LIST }), TypeError); // client ausente
  await assert.rejects(listAdminItems({ client }), TypeError); // list ausente
  await assert.rejects(createAdminItem({ client, values: { a: 1 } }), TypeError); // list ausente
  await assert.rejects(createAdminItem({ list: LIST, values: { a: 1 } }), TypeError); // client ausente
  await assert.rejects(updateAdminItem({ client, list: LIST, values: { a: 1 } }), TypeError); // id ausente
  await assert.rejects(updateAdminItem({ client, list: LIST, id: 1 }), TypeError); // values ausente
  await assert.rejects(deleteAdminItem({ client, list: LIST }), TypeError); // id ausente
  await assert.rejects(deleteAdminItem({ list: LIST, id: 1 }), TypeError); // client ausente

  await assert.rejects(
    listAdminItems({ client: { getListItems: undefined }, list: LIST }),
    TypeError
  ); // client sem os métodos exigidos

  console.log("admin-data.test.js: parâmetros ausentes lançam TypeError ok.");
}

console.log("admin-data.test.js: verificações concluídas com sucesso.");
