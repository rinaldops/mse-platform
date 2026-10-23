import assert from "node:assert/strict";
import {
  buildCreateTemplateStylesMigration,
  migrateCreateTemplateStyles
} from "../migrate-create-template-styles.js";

/**
 * Fake client em memória, mesmo princípio dos outros testes de `tools/`
 * (não reimportado dali de propósito — ver cabeçalho de
 * `migrate-mse-administrator-route.test.js`).
 */
const LIST_IDS = Object.freeze({
  MSETemplateStyles: "60000000-0000-4000-8000-000000000001",
  MSEExtensions: "60000000-0000-4000-8000-000000000002"
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

  const listsByInternalName = {
    get(internalName) { return lists.get(LIST_IDS[internalName]); }
  };

  return { client: { getListItems, createListItem }, lists: listsByInternalName, creates };
}

const LIST_REFS = Object.freeze({
  MSETemplateStyles: { listId: LIST_IDS.MSETemplateStyles },
  MSEExtensions: { listId: LIST_IDS.MSEExtensions }
});

// buildCreateTemplateStylesMigration() é pura, congelada, e só marca
// camap-tema-01 como Home=true (ele continua o template ativo em produção).
{
  const plan = buildCreateTemplateStylesMigration();
  assert.ok(Object.isFrozen(plan));
  assert.deepEqual(plan.templateStyles.keyFields, ["Template", "ClientId"]);

  const tema01Style = plan.templateStyles.rows.find((row) => row.Template === "camap-tema-01");
  assert.equal(tema01Style.Home, true);
  assert.equal(tema01Style.ClientId, "Site");
  const otherStyles = plan.templateStyles.rows.filter((row) => row.Template !== "camap-tema-01");
  assert.ok(otherStyles.length > 0);
  assert.ok(otherStyles.every((row) => row.Home === false), "só camap-tema-01 deve ser Home=true");

  const elements = plan.extensions.rows.map((row) => row.Element).sort();
  assert.deepEqual(elements, ["camap-tema-01", "camap-tema-02", "mse-default", "system"]);
  assert.ok(plan.extensions.rows.every((row) => row.Type === "Template"));

  const tema02Extension = plan.extensions.rows.find((row) => row.Element === "camap-tema-02");
  assert.equal(tema02Extension.Enabled, false, "camap-tema-02 é referência/não publicado");

  console.log("migrate-create-template-styles.test.js: plano puro e congelado ok.");
}

// migrateCreateTemplateStyles exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateCreateTemplateStyles({ client }), /listIds/);
  await assert.rejects(migrateCreateTemplateStyles({ client, listIds: LIST_REFS }), /confirm/);

  console.log("migrate-create-template-styles.test.js: validações de parâmetro ok.");
}

// confirm que nega não grava nada.
{
  const { client, creates } = createFakeClient();
  const result = await migrateCreateTemplateStyles({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);

  console.log("migrate-create-template-styles.test.js: confirm negado não grava nada ok.");
}

// (a) listas vazias -> todas as linhas do plano são criadas (3 estilos + 4
// extensões).
{
  const { client, creates } = createFakeClient({ MSETemplateStyles: [], MSEExtensions: [] });
  const result = await migrateCreateTemplateStyles({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "migrated");
  assert.equal(result.templateStyles.length, 3);
  assert.ok(result.templateStyles.every((entry) => entry.action === "created"));
  assert.equal(result.extensions.length, 4);
  assert.ok(result.extensions.every((entry) => entry.action === "created"));
  assert.equal(creates.length, 7);

  console.log("migrate-create-template-styles.test.js: (a) listas vazias -> todas as linhas criadas ok.");
}

// (b) tudo já existente -> nada proposto (idempotência).
{
  const plan = buildCreateTemplateStylesMigration();
  const { client, creates } = createFakeClient({
    MSETemplateStyles: plan.templateStyles.rows.map((row, index) => ({ Id: index + 1, ...row })),
    MSEExtensions: plan.extensions.rows.map((row, index) => ({ Id: index + 1, ...row }))
  });
  const result = await migrateCreateTemplateStyles({ client, listIds: LIST_REFS, confirm: () => true });

  assert.ok(result.templateStyles.every((entry) => entry.action === "skipped"));
  assert.ok(result.extensions.every((entry) => entry.action === "skipped"));
  assert.equal(creates.length, 0, "nenhuma duplicata deve ser proposta");

  console.log("migrate-create-template-styles.test.js: (b) tudo já existente -> nada proposto ok.");
}

// (c) chave composta: mesmo Template, ClientId diferente, não colide (uma
// linha "camap-tema-01"/"Administrator" pré-existente não impede a criação
// de "camap-tema-01"/"Site").
{
  const { client, creates } = createFakeClient({
    MSETemplateStyles: [{ Id: 1, Template: "camap-tema-01", ClientId: "Administrator", Home: false }],
    MSEExtensions: []
  });
  const result = await migrateCreateTemplateStyles({ client, listIds: LIST_REFS, confirm: () => true });

  const tema01SiteResult = result.templateStyles.find((_, index) =>
    buildCreateTemplateStylesMigration().templateStyles.rows[index].Template === "camap-tema-01"
  );
  assert.equal(tema01SiteResult.action, "created");
  assert.ok(creates.some((c) => c.list === "MSETemplateStyles" && c.values.Template === "camap-tema-01" && c.values.ClientId === "Site"));

  console.log("migrate-create-template-styles.test.js: (c) chave composta Template+ClientId não colide entre clients ok.");
}

// (d) não toca MSETemplateStyles/MSEExtensions pré-existentes (não há
// updateListItem no client fake — se a migração tentasse atualizar algo,
// lançaria por falta do método).
{
  const { client } = createFakeClient({
    MSETemplateStyles: [{ Id: 1, Template: "camap-tema-01", ClientId: "Site", Home: false }],
    MSEExtensions: []
  });
  await assert.doesNotReject(migrateCreateTemplateStyles({ client, listIds: LIST_REFS, confirm: () => true }));

  console.log("migrate-create-template-styles.test.js: (d) nunca chama updateListItem (só cria) ok.");
}

console.log("migrate-create-template-styles.test.js (tools): verificações concluídas com sucesso.");
