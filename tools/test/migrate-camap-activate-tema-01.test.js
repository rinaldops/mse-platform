import assert from "node:assert/strict";
import {
  buildActivateTema01Migration,
  migrateActivateTema01
} from "../migrate-camap-activate-tema-01.js";

/**
 * Fake client simplificado, mesmo princípio dos outros testes de `tools/`
 * (não reimportado dali de propósito — ver cabeçalho de
 * `migrate-camap-content-routes.test.js`/`migrate-camap-home.test.js`).
 */
const LIST_IDS = Object.freeze({
  MSEConfiguracoes: "50000000-0000-4000-8000-000000000001"
});

function parseSimpleFilter(filter) {
  const clauses = filter.split(/\s+and\s+/);
  return clauses.map((clause) => {
    const match = /^(\w+) eq '([^']*)'$/.exec(clause) ?? /^(\w+) eq (\d+|true|false)$/.exec(clause);
    if (!match) throw new Error(`filtro não suportado pelo fake client: ${clause}`);
    const [, field, rawValue] = match;
    const value = rawValue === "true" ? true : rawValue === "false" ? false
      : /^\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
    return [field, value];
  });
}

function createFakeClient(initialItems = {}) {
  const lists = new Map(
    Object.entries(initialItems).map(([internalName, items]) => [LIST_IDS[internalName], [...items]])
  );
  const internalNameByListId = new Map(Object.entries(LIST_IDS).map(([name, id]) => [id, name]));
  const creates = [];
  const updates = [];
  let nextId = 1;

  async function getListItems(list, { filter } = {}) {
    const items = lists.get(list.listId) ?? [];
    if (!filter) return items;
    const clauses = parseSimpleFilter(filter);
    return items.filter((item) => clauses.every(([field, value]) => item[field] === value));
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

  async function getListItem(list, id) {
    const items = lists.get(list.listId) ?? [];
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`getListItem: item ${id} não encontrado.`);
    return { item: { ...item }, etag: `"item-${item.Id}"`, status: 200 };
  }

  async function updateListItem(list, id, values, { etag } = {}) {
    if (!etag) throw new Error("updateListItem: etag é obrigatória (fake client).");
    const items = lists.get(list.listId) ?? [];
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`updateListItem: item ${id} não encontrado.`);
    Object.assign(item, values);
    updates.push({ list: internalNameByListId.get(list.listId), id, values });
    return { item: { ...item }, etag: `"item-${item.Id}-updated"`, status: 204 };
  }

  const listsByInternalName = {
    get(internalName) { return lists.get(LIST_IDS[internalName]); }
  };

  return {
    client: { getListItems, getListItem, createListItem, updateListItem },
    lists: listsByInternalName,
    creates,
    updates
  };
}

const LIST_REFS = Object.freeze({
  MSEConfiguracoes: { listId: LIST_IDS.MSEConfiguracoes }
});

// buildActivateTema01Migration() é pura, congelada, e aponta para o valor
// alvo exato exigido pela tarefa.
{
  const plan = buildActivateTema01Migration();
  assert.ok(Object.isFrozen(plan));
  assert.equal(plan.list, "MSEConfiguracoes");
  assert.deepEqual(plan.scopeFilter, { Escopo: "Global" });
  assert.deepEqual(plan.values, { Tema: "camap-tema-01" });
}

// migrateActivateTema01 exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateActivateTema01({ client }), /listIds/);
  await assert.rejects(migrateActivateTema01({ client, listIds: LIST_REFS }), /confirm/);
}

// confirm que nega não grava nada.
{
  const { client, updates } = createFakeClient({
    MSEConfiguracoes: [{ Id: 1, Escopo: "Global", Tema: "default", Layout: "Herdar", ConfiguracaoJson: "{}" }]
  });
  const result = await migrateActivateTema01({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(updates.length, 0);
}

// (a) item Global encontrado e atualizado corretamente — só Tema muda,
// Layout/ConfiguracaoJson permanecem intactos.
{
  const { client, updates, lists } = createFakeClient({
    MSEConfiguracoes: [
      { Id: 1, Escopo: "Global", Tema: "default", Layout: "Herdar", ConfiguracaoJson: '{"foo":1}' }
    ]
  });
  const result = await migrateActivateTema01({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "activated");
  assert.equal(result.itemId, 1);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].values, { Tema: "camap-tema-01" });

  const items = lists.get("MSEConfiguracoes");
  assert.equal(items.length, 1, "nunca cria um 2º item Global");
  assert.equal(items[0].Tema, "camap-tema-01");
  assert.equal(items[0].Layout, "Herdar", "Layout deve permanecer inalterado");
  assert.equal(items[0].ConfiguracaoJson, '{"foo":1}', "ConfiguracaoJson deve permanecer inalterado");
}

// (b) nenhum item Global encontrado -> erro claro, nenhuma gravação.
{
  const { client, updates, creates } = createFakeClient({
    MSEConfiguracoes: [{ Id: 1, Escopo: "Instancia", Tema: null }]
  });
  await assert.rejects(
    migrateActivateTema01({ client, listIds: LIST_REFS, confirm: () => true }),
    /Nenhum item com Escopo="Global"/
  );
  assert.equal(updates.length, 0);
  assert.equal(creates.length, 0);
}

// Mais de 1 item Global -> erro claro, nenhuma gravação (nunca assume qual
// usar).
{
  const { client, updates } = createFakeClient({
    MSEConfiguracoes: [
      { Id: 1, Escopo: "Global", Tema: "default" },
      { Id: 2, Escopo: "Global", Tema: "outro" }
    ]
  });
  await assert.rejects(
    migrateActivateTema01({ client, listIds: LIST_REFS, confirm: () => true }),
    /2 itens com Escopo="Global"/
  );
  assert.equal(updates.length, 0);
}

// (c) item já com Tema: "camap-tema-01" -> nenhuma mudança proposta
// (idempotência).
{
  const { client, updates } = createFakeClient({
    MSEConfiguracoes: [
      { Id: 1, Escopo: "Global", Tema: "camap-tema-01", Layout: "Herdar", ConfiguracaoJson: "{}" }
    ]
  });
  const result = await migrateActivateTema01({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(result.status, "already-active");
  assert.equal(result.itemId, 1);
  assert.equal(updates.length, 0, "nenhum MERGE deve ser disparado quando o Tema já está correto");
}

console.log("migrate-camap-activate-tema-01.test.js (tools): verificações concluídas com sucesso.");
