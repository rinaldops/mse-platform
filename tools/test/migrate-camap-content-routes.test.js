import assert from "node:assert/strict";
import {
  buildCamapContentRoutesMigration,
  migrateCamapContentRoutes
} from "../migrate-camap-content-routes.js";

/**
 * Fake client simplificado, mesmo princípio de
 * `migrate-camap-institutional-drafts.test.js` (não reimportado dali de
 * propósito — ver cabeçalho daquele teste e do script sob teste). Diferente
 * daquele teste, aqui o fake client também precisa de `getListItem`/
 * `updateListItem` com ETag (mesma mecânica de
 * `migrate-camap-home.test.js#createFakeClient`), já que
 * `upsertAgendaCategoria` pode fazer UPDATE, não só CREATE.
 */
const LIST_IDS = Object.freeze({
  MSEMenu: "40000000-0000-4000-8000-000000000001",
  CAMAPCategorias: "40000000-0000-4000-8000-000000000002"
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
  MSEMenu: { listId: LIST_IDS.MSEMenu },
  CAMAPCategorias: { listId: LIST_IDS.CAMAPCategorias }
});

// buildCamapContentRoutesMigration() é pura, congelada, cobre as 3 rotas
// faltantes ("destaques", "em-foco", "agenda") com os ParamsJson exatos do
// plano, e o alvo do backfill de categoria.
{
  const plan = buildCamapContentRoutesMigration();
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.menuBlueprint));

  assert.equal(plan.menuBlueprint.length, 3);
  const byAlias = Object.fromEntries(plan.menuBlueprint.map((m) => [m.Alias, m]));

  assert.ok(byAlias.destaques);
  assert.equal(byAlias.destaques.ParamsJson, "{}");

  assert.ok(byAlias["em-foco"]);
  assert.deepEqual(JSON.parse(byAlias["em-foco"].ParamsJson), { destaque: "somente" });

  assert.ok(byAlias.agenda);
  assert.deepEqual(JSON.parse(byAlias.agenda.ParamsJson), { categoria: "Agenda" });

  assert.deepEqual(plan.agendaCategoriaBackfill, { Title: "Agenda", Slug: "agenda", Ativo: true });
}

// migrateCamapContentRoutes exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateCamapContentRoutes({ client }), /listIds/);
  await assert.rejects(migrateCamapContentRoutes({ client, listIds: LIST_REFS }), /confirm/);
}

// confirm que nega não grava nada.
{
  const { client, creates, updates } = createFakeClient();
  const result = await migrateCamapContentRoutes({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);
  assert.equal(updates.length, 0);
}

// Caminho completo: categoria "Agenda" já existe com Slug/Ativo ausentes
// (cenário real descrito na tarefa) -> UPDATE, nunca um CREATE duplicado; as
// 3 linhas de MSEMenu são criadas com os ParamsJson exatos.
{
  const { client, creates, updates, lists } = createFakeClient({
    CAMAPCategorias: [{ Id: 1, Title: "Agenda", Slug: null, Ativo: null }]
  });
  const result = await migrateCamapContentRoutes({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "migrated");
  assert.equal(result.agendaCategoria.action, "updated");
  assert.equal(result.menuItems.filter((m) => m.action === "created").length, 3);

  const categorias = lists.get("CAMAPCategorias");
  assert.equal(categorias.length, 1, "a linha Agenda pré-existente não deve ser duplicada");
  assert.equal(categorias[0].Slug, "agenda");
  assert.equal(categorias[0].Ativo, true);
  assert.equal(updates.filter((u) => u.list === "CAMAPCategorias").length, 1);
  assert.equal(creates.filter((c) => c.list === "CAMAPCategorias").length, 0, "nunca cria uma 2ª linha Agenda");

  const menu = lists.get("MSEMenu");
  assert.equal(menu.length, 3);
  const destaquesMenu = menu.find((m) => m.Alias === "destaques");
  assert.equal(destaquesMenu.Componente, "blog");
  assert.equal(destaquesMenu.Visao, "list");
  assert.equal(destaquesMenu.ParamsJson, "{}");

  const emFocoMenu = menu.find((m) => m.Alias === "em-foco");
  assert.deepEqual(JSON.parse(emFocoMenu.ParamsJson), { destaque: "somente" });

  const agendaMenu = menu.find((m) => m.Alias === "agenda");
  assert.deepEqual(JSON.parse(agendaMenu.ParamsJson), { categoria: "Agenda" });

  assert.equal(creates.filter((c) => c.list === "MSEMenu").length, 3);
}

// Caminho defensivo: a categoria "Agenda" não existe (não esperado em
// produção, ver cabeçalho do script) -> cria uma linha nova com os valores
// alvo, em vez de lançar.
{
  const { client, creates, lists } = createFakeClient();
  const result = await migrateCamapContentRoutes({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.agendaCategoria.action, "created");
  const categorias = lists.get("CAMAPCategorias");
  assert.equal(categorias.length, 1);
  assert.deepEqual(
    { Title: categorias[0].Title, Slug: categorias[0].Slug, Ativo: categorias[0].Ativo },
    { Title: "Agenda", Slug: "agenda", Ativo: true }
  );
  assert.equal(creates.filter((c) => c.list === "CAMAPCategorias").length, 1);
}

// Categoria "Agenda" já com Slug/Ativo corretos -> não dispara nenhum UPDATE
// sem efeito (ação "skipped", mesmo princípio de idempotência de
// migrate-camap-home.js#upsertByKey).
{
  const { client, updates, lists } = createFakeClient({
    CAMAPCategorias: [{ Id: 1, Title: "Agenda", Slug: "agenda", Ativo: true }]
  });
  const result = await migrateCamapContentRoutes({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.agendaCategoria.action, "skipped");
  assert.equal(updates.length, 0, "nenhum MERGE deve ser disparado quando os valores já estão corretos");
  assert.equal(lists.get("CAMAPCategorias").length, 1);
}

// Idempotência: rodar duas vezes não duplica nada (nem MSEMenu, nem a
// categoria Agenda), mesmo tendo feito um UPDATE na 1ª rodada.
{
  const { client, creates, updates, lists } = createFakeClient({
    CAMAPCategorias: [{ Id: 1, Title: "Agenda", Slug: null, Ativo: null }]
  });

  const first = await migrateCamapContentRoutes({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(first.status, "migrated");
  assert.equal(first.agendaCategoria.action, "updated");

  const second = await migrateCamapContentRoutes({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(second.status, "migrated");
  assert.equal(second.agendaCategoria.action, "skipped");
  assert.ok(second.menuItems.every((m) => m.action === "skipped"));

  assert.equal(lists.get("CAMAPCategorias").length, 1);
  assert.equal(lists.get("MSEMenu").length, 3);
  assert.equal(creates.filter((c) => c.list === "MSEMenu").length, 3);
  assert.equal(creates.filter((c) => c.list === "CAMAPCategorias").length, 0);
  assert.equal(updates.filter((u) => u.list === "CAMAPCategorias").length, 1, "só a 1ª rodada deve ter atualizado a categoria");
}

console.log("migrate-camap-content-routes.test.js (tools): verificações concluídas com sucesso.");
