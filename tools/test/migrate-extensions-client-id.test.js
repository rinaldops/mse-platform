import assert from "node:assert/strict";
import {
  buildExtensionsClientIdMigration,
  migrateExtensionsClientId
} from "../migrate-extensions-client-id.js";

/**
 * Fake client em memória, mesmo princípio dos outros testes de `tools/`
 * (não reimportado dali de propósito — ver cabeçalho de
 * `migrate-camap-activate-tema-01.test.js`).
 */
const LIST_IDS = Object.freeze({
  MSEExtensions: "70000000-0000-4000-8000-000000000001"
});

function createFakeClient(initialItems = []) {
  const items = initialItems.map((item) => ({ ...item }));
  const updates = [];

  async function getListItems() {
    return items.map((item) => ({ ...item }));
  }

  async function getListItem(list, id) {
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`getListItem: item ${id} não encontrado.`);
    return { item: { ...item }, etag: `"item-${item.Id}"`, status: 200 };
  }

  async function updateListItem(list, id, values, { etag } = {}) {
    if (!etag) throw new Error("updateListItem: etag é obrigatória (fake client).");
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`updateListItem: item ${id} não encontrado.`);
    Object.assign(item, values);
    updates.push({ id, values });
    return { item: { ...item }, etag: `"item-${item.Id}-updated"`, status: 204 };
  }

  return { client: { getListItems, getListItem, updateListItem }, items, updates };
}

const LIST_REFS = Object.freeze({
  MSEExtensions: { listId: LIST_IDS.MSEExtensions }
});

// buildExtensionsClientIdMigration() é pura, congelada: default "Site",
// override só para "administrator".
{
  const plan = buildExtensionsClientIdMigration();
  assert.ok(Object.isFrozen(plan));
  assert.equal(plan.defaultClientId, "Site");
  assert.deepEqual(plan.overridesByElement, { administrator: "Administrator" });

  console.log("migrate-extensions-client-id.test.js: plano puro e congelado ok.");
}

// migrateExtensionsClientId exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateExtensionsClientId({ client }), /listIds/);
  await assert.rejects(migrateExtensionsClientId({ client, listIds: LIST_REFS }), /confirm/);

  console.log("migrate-extensions-client-id.test.js: validações de parâmetro ok.");
}

// confirm que nega não grava nada.
{
  const { client, updates } = createFakeClient([
    { Id: 1, Element: "administrator", ClientId: null }
  ]);
  const result = await migrateExtensionsClientId({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(updates.length, 0);

  console.log("migrate-extensions-client-id.test.js: confirm negado não grava nada ok.");
}

// (a) backfill real: "administrator" -> Administrator; demais sem ClientId -> Site.
{
  const { client, updates, items } = createFakeClient([
    { Id: 1, Element: "administrator", ClientId: null },
    { Id: 2, Element: "camap-tema-01", ClientId: "" },
    { Id: 3, Element: "forum" } // ClientId ausente por completo
  ]);
  const result = await migrateExtensionsClientId({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "migrated");
  assert.equal(updates.length, 3);
  assert.ok(result.items.every((entry) => entry.action === "updated"));

  const byId = new Map(items.map((item) => [item.Id, item]));
  assert.equal(byId.get(1).ClientId, "Administrator");
  assert.equal(byId.get(2).ClientId, "Site");
  assert.equal(byId.get(3).ClientId, "Site");

  console.log("migrate-extensions-client-id.test.js: (a) backfill administrator/site ok.");
}

// (b) idempotência: segunda execução sobre o resultado de (a) não grava nada.
{
  const { client, updates } = createFakeClient([
    { Id: 1, Element: "administrator", ClientId: "Administrator" },
    { Id: 2, Element: "camap-tema-01", ClientId: "Site" }
  ]);
  const result = await migrateExtensionsClientId({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(updates.length, 0, "nenhum UPDATE deve ser disparado quando ClientId já está correto");
  assert.ok(result.items.every((entry) => entry.action === "skipped"));

  console.log("migrate-extensions-client-id.test.js: (b) idempotência (nada a atualizar) ok.");
}

// (c) classificação manual prévia divergente do padrão não é sobrescrita.
{
  const { client, updates } = createFakeClient([
    // "forum" classificado manualmente como Administrator, apesar de não
    // estar em overridesByElement — a migração nunca corrige isso.
    { Id: 1, Element: "forum", ClientId: "Administrator" }
  ]);
  const result = await migrateExtensionsClientId({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(updates.length, 0, "classificação manual pré-existente nunca é sobrescrita");
  assert.equal(result.items[0].action, "skipped");
  assert.equal(result.items[0].clientId, "Administrator");

  console.log("migrate-extensions-client-id.test.js: (c) não sobrescreve classificação manual ok.");
}

console.log("migrate-extensions-client-id.test.js (tools): verificações concluídas com sucesso.");
