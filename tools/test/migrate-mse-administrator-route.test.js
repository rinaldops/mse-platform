import assert from "node:assert/strict";
import {
  buildMseAdministratorRouteMigration,
  migrateMseAdministratorRoute
} from "../migrate-mse-administrator-route.js";

/**
 * Fake client em memória, mesmo princípio dos outros testes de `tools/`
 * (não reimportado dali de propósito — ver cabeçalho de
 * `migrate-camap-activate-tema-01.test.js`).
 */
const LIST_IDS = Object.freeze({
  MSEMenu: "30000000-0000-4000-8000-000000000001",
  MSEExtensoes: "30000000-0000-4000-8000-000000000002"
});

function parseSimpleFilter(filter) {
  const match = /^(\w+) eq '([^']*)'$/.exec(filter);
  if (!match) throw new Error(`filtro não suportado pelo fake client: ${filter}`);
  const [, field, value] = match;
  return [field, value];
}

function createFakeClient(initialItems = {}) {
  const lists = new Map(
    Object.entries(initialItems).map(([internalName, items]) => [LIST_IDS[internalName], [...items]])
  );
  const internalNameByListId = new Map(Object.entries(LIST_IDS).map(([name, id]) => [id, name]));
  const creates = [];
  let nextId = 1;

  async function getListItems(list, { filter } = {}) {
    const items = lists.get(list.listId) ?? [];
    if (!filter) return items;
    const [field, value] = parseSimpleFilter(filter);
    return items.filter((item) => item[field] === value);
  }

  async function createListItem(list, values) {
    const id = nextId++;
    const item = { Id: id, ...values };
    creates.push({ list: internalNameByListId.get(list.listId), values });
    const items = lists.get(list.listId) ?? [];
    items.push(item);
    lists.set(list.listId, items);
    return { item: { ...item }, etag: `"item-${id}"`, status: 201 };
  }

  const listsByInternalName = {
    get(internalName) { return lists.get(LIST_IDS[internalName]); }
  };

  return { client: { getListItems, createListItem }, lists: listsByInternalName, creates };
}

const LIST_REFS = Object.freeze({
  MSEMenu: { listId: LIST_IDS.MSEMenu },
  MSEExtensoes: { listId: LIST_IDS.MSEExtensoes }
});

// buildMseAdministratorRouteMigration() é pura, congelada, e aponta para as
// chaves naturais exigidas (Alias/Elemento).
{
  const plan = buildMseAdministratorRouteMigration();
  assert.ok(Object.isFrozen(plan));
  assert.equal(plan.MSEMenu.keyField, "Alias");
  assert.equal(plan.MSEMenu.values.Alias, "administrator");
  assert.equal(plan.MSEMenu.values.Componente, "administrator");
  assert.equal(plan.MSEExtensoes.keyField, "Elemento");
  assert.equal(plan.MSEExtensoes.values.Elemento, "administrator");
  assert.equal(plan.MSEExtensoes.values.Tipo, "Componente");

  console.log("migrate-mse-administrator-route.test.js: plano puro e congelado ok.");
}

// migrateMseAdministratorRoute exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateMseAdministratorRoute({ client }), /listIds/);
  await assert.rejects(migrateMseAdministratorRoute({ client, listIds: LIST_REFS }), /confirm/);

  console.log("migrate-mse-administrator-route.test.js: validações de parâmetro ok.");
}

// confirm que nega não grava nada.
{
  const { client, creates } = createFakeClient();
  const result = await migrateMseAdministratorRoute({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);

  console.log("migrate-mse-administrator-route.test.js: confirm negado não grava nada ok.");
}

// (a) ambos ausentes -> ambos propostos para criação.
{
  const { client, creates } = createFakeClient({ MSEMenu: [], MSEExtensoes: [] });
  const result = await migrateMseAdministratorRoute({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "migrated");
  assert.equal(result.menu.action, "created");
  assert.equal(result.extension.action, "created");
  assert.equal(creates.length, 2);
  assert.deepEqual(creates.map((c) => c.list).sort(), ["MSEExtensoes", "MSEMenu"]);

  console.log("migrate-mse-administrator-route.test.js: (a) ambos ausentes -> ambos criados ok.");
}

// (b) ambos já existentes -> nada proposto.
{
  const { client, creates } = createFakeClient({
    MSEMenu: [{ Id: 1, Alias: "administrator", Title: "Administrator" }],
    MSEExtensoes: [{ Id: 2, Elemento: "administrator", Title: "Administrator" }]
  });
  const result = await migrateMseAdministratorRoute({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "migrated");
  assert.equal(result.menu.action, "skipped");
  assert.equal(result.menu.id, 1);
  assert.equal(result.extension.action, "skipped");
  assert.equal(result.extension.id, 2);
  assert.equal(creates.length, 0, "nenhuma duplicata deve ser proposta");

  console.log("migrate-mse-administrator-route.test.js: (b) ambos existentes -> nada proposto ok.");
}

// (c) só um dos dois existente -> só o outro é proposto.
{
  const { client, creates } = createFakeClient({
    MSEMenu: [{ Id: 1, Alias: "administrator", Title: "Administrator" }],
    MSEExtensoes: []
  });
  const result = await migrateMseAdministratorRoute({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.menu.action, "skipped");
  assert.equal(result.extension.action, "created");
  assert.equal(creates.length, 1);
  assert.equal(creates[0].list, "MSEExtensoes");

  console.log("migrate-mse-administrator-route.test.js: (c) só MSEMenu existente -> só MSEExtensoes criado ok.");
}

{
  const { client, creates } = createFakeClient({
    MSEMenu: [],
    MSEExtensoes: [{ Id: 2, Elemento: "administrator", Title: "Administrator" }]
  });
  const result = await migrateMseAdministratorRoute({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.menu.action, "created");
  assert.equal(result.extension.action, "skipped");
  assert.equal(creates.length, 1);
  assert.equal(creates[0].list, "MSEMenu");

  console.log("migrate-mse-administrator-route.test.js: (c) só MSEExtensoes existente -> só MSEMenu criado ok.");
}

console.log("migrate-mse-administrator-route.test.js: verificações concluídas com sucesso.");
