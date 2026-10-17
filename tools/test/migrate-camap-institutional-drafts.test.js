import assert from "node:assert/strict";
import {
  buildCamapInstitutionalDraftsMigration,
  migrateCamapInstitutionalDrafts
} from "../migrate-camap-institutional-drafts.js";

/**
 * Fake client simplificado, mesmo princípio de `migrate-camap-home.test.js`
 * (não reimportado dali de propósito — ver cabeçalho daquele arquivo e do
 * script sob teste). Diferente daquele teste, aqui as 3 listas são
 * referenciadas por `{listId}` GUID fixo em `LIST_IDS` (não resolvidas via
 * `installer.verify()` — este script não depende do instalador, ver
 * cabeçalho de `migrate-camap-institutional-drafts.js`).
 */
const LIST_IDS = Object.freeze({
  MSEMenu: "30000000-0000-4000-8000-000000000001",
  CAMAPCategorias: "30000000-0000-4000-8000-000000000002",
  CAMAPPublicacoes: "30000000-0000-4000-8000-000000000003"
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
  MSEMenu: { listId: LIST_IDS.MSEMenu },
  CAMAPCategorias: { listId: LIST_IDS.CAMAPCategorias },
  CAMAPPublicacoes: { listId: LIST_IDS.CAMAPPublicacoes }
});

// buildCamapInstitutionalDraftsMigration() é pura, congelada, cobre as 5
// rotas institucionais (Ids 8-12 de C1, Id 7 fora) e nunca marca nada como
// "Publicado".
{
  const plan = buildCamapInstitutionalDraftsMigration();
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.categorias));

  assert.equal(plan.categorias.items.length, 2);
  assert.deepEqual(plan.categorias.items.map((i) => i.Slug), ["servicos-e-processos", "docs-e-padroes"]);

  assert.equal(plan.publicacoes.items.length, 5);
  for (const pub of plan.publicacoes.items) {
    assert.equal(pub.EstadoEditorial, "Rascunho", `${pub.Slug} deveria ser Rascunho, nunca Publicado`);
    assert.match(pub.CorpoHtmlSeguroV1, /pendente de revisão editorial/);
  }

  assert.equal(plan.menuBlueprint.length, 5);
  const aliases = plan.menuBlueprint.map((m) => m.Alias);
  assert.deepEqual(aliases.sort(), ["contatos", "docs-e-padroes", "nossa-estrutura", "quem-somos", "servicos-e-processos"].sort());
  for (const entry of plan.menuBlueprint) {
    assert.equal(entry.routing.kind === "article" || entry.routing.kind === "list", true);
  }

  // Nenhum segredo/GUID real nem referência a texto institucional "novo"
  // fora do que já vem do C1 (ex.: nenhuma URL sharepoint.com).
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /sharepoint\.com/i);
}

// migrateCamapInstitutionalDrafts exige client/listIds/confirm corretos.
{
  const { client } = createFakeClient();
  await assert.rejects(migrateCamapInstitutionalDrafts({ client }), /listIds/);
  await assert.rejects(migrateCamapInstitutionalDrafts({ client, listIds: LIST_REFS }), /confirm/);
}

// confirm que nega não grava nada.
{
  const { client, creates } = createFakeClient();
  const result = await migrateCamapInstitutionalDrafts({ client, listIds: LIST_REFS, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);
}

// Caminho completo: categorias + publicações criadas, e MSEMenu recebe o Id
// NATIVO correto nas rotas de artigo (não o Slug) e a categoria-texto certa
// nas rotas de lista.
{
  const { client, creates, lists } = createFakeClient();
  const result = await migrateCamapInstitutionalDrafts({ client, listIds: LIST_REFS, confirm: () => true });

  assert.equal(result.status, "migrated");
  assert.equal(result.categorias.filter((c) => c.action === "created").length, 2);
  assert.equal(result.publicacoes.filter((p) => p.action === "created").length, 5);
  assert.equal(result.menuItems.filter((m) => m.action === "created").length, 5);

  const publicacoes = lists.get("CAMAPPublicacoes");
  const quemSomosId = publicacoes.find((p) => p.Slug === "quem-somos").Id;
  const menu = lists.get("MSEMenu");
  const quemSomosMenu = menu.find((m) => m.Alias === "quem-somos");
  assert.equal(quemSomosMenu.Componente, "blog");
  assert.equal(quemSomosMenu.Visao, "article");
  assert.deepEqual(JSON.parse(quemSomosMenu.ParamsJson), { id: quemSomosId });

  const servicosMenu = menu.find((m) => m.Alias === "servicos-e-processos");
  assert.equal(servicosMenu.Visao, "list");
  assert.deepEqual(JSON.parse(servicosMenu.ParamsJson), { categoria: "Serviços e processos" });

  // Nenhuma publicação criada por este script é "Publicado".
  assert.ok(publicacoes.every((p) => p.EstadoEditorial === "Rascunho"));

  assert.equal(creates.filter((c) => c.list === "CAMAPCategorias").length, 2);
  assert.equal(creates.filter((c) => c.list === "CAMAPPublicacoes").length, 5);
  assert.equal(creates.filter((c) => c.list === "MSEMenu").length, 5);
}

// Idempotência: rodar duas vezes não duplica nada (nem categorias, nem
// publicações, nem itens de menu), mesmo precisando re-resolver o Id nativo
// das publicações já existentes na 2ª rodada.
{
  const { client, creates, lists } = createFakeClient();

  const first = await migrateCamapInstitutionalDrafts({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(first.status, "migrated");

  const second = await migrateCamapInstitutionalDrafts({ client, listIds: LIST_REFS, confirm: () => true });
  assert.equal(second.status, "migrated");
  assert.ok(second.categorias.every((c) => c.action === "skipped"));
  assert.ok(second.publicacoes.every((p) => p.action === "skipped"));
  assert.ok(second.menuItems.every((m) => m.action === "skipped"));

  assert.equal(creates.filter((c) => c.list === "CAMAPCategorias").length, 2);
  assert.equal(creates.filter((c) => c.list === "CAMAPPublicacoes").length, 5);
  assert.equal(creates.filter((c) => c.list === "MSEMenu").length, 5);
  assert.equal(lists.get("MSEMenu").length, 5);
  assert.equal(lists.get("CAMAPPublicacoes").length, 5);
  assert.equal(lists.get("CAMAPCategorias").length, 2);
}

console.log("migrate-camap-institutional-drafts.test.js (tools): verificações concluídas com sucesso.");
