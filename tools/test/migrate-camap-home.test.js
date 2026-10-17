import assert from "node:assert/strict";
import {
  buildCamapHomeMigration,
  migrateCamapHome,
  buildCamapHomeC4Adjustments,
  migrateCamapHomeC4Adjustments
} from "../migrate-camap-home.js";

/**
 * Mesmo fake client simplificado de `kernel/test/seed.test.js` (não
 * reimportado dali de propósito — `tools/` não depende de `kernel/test/`,
 * mesmo princípio de isolamento de camadas do resto do repositório):
 * `getListItems(list, { filter })` e `createListItem(list, values)`, mesma
 * assinatura de `core/rest.js`, operando sobre um Map em memória.
 *
 * `migrateCamapHome` agora referencia cada lista por `{ listId }`
 * (resolvido via `installer.verify()`, nunca pelo nome interno bruto — ver
 * comentário em `migrate-camap-home.js#migrateCamapHome` sobre o bug real
 * de renomeação de `Title` que isso evita), então este fake client indexa
 * `lists` por `listId` internamente e expõe acesso por nome interno só
 * para manter as asserções legíveis.
 */
const LIST_IDS = Object.freeze({
  MSEMenu: "20000000-0000-4000-8000-000000000001",
  MSEExtensoes: "20000000-0000-4000-8000-000000000002",
  MSEModulos: "20000000-0000-4000-8000-000000000003",
  MSEModulosMenu: "20000000-0000-4000-8000-000000000004"
});

// Suporta `filter` combinando até duas cláusulas com "and" (ex.:
// "ModuloId eq 5 and MenuId eq 1"), além do único-campo já suportado — único
// formato extra exigido pelos novos testes de `migrateCamapHomeC4Adjustments`
// (consulta de duplicidade em MSEModulosMenu, ver `findItemByKey`/associação
// de menu em `migrate-camap-home.js`).
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

function fakeInstaller({ verifyError } = {}) {
  return {
    verify: async () => {
      if (verifyError) throw verifyError;
      return {
        status: "ready",
        plan: {
          lists: Object.entries(LIST_IDS).map(([internalName, listId]) => ({ internalName, listId }))
        }
      };
    }
  };
}

// buildCamapHomeMigration() é pura, congelada, e cobre exatamente os 5
// módulos reais (BLOG fica fora da Home no C3 — ver cabeçalho do arquivo).
{
  const plan = buildCamapHomeMigration();
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.MSEMenu));
  assert.deepEqual(Object.keys(plan), ["MSEMenu", "MSEExtensoes", "MSEModulos"]);

  assert.equal(plan.MSEMenu.items.length, 1);
  const inicio = plan.MSEMenu.items[0];
  assert.equal(inicio.Alias, "");
  assert.equal(inicio.Padrao, true);
  assert.equal(inicio.Componente, ""); // item "somente módulos"

  assert.equal(plan.MSEExtensoes.items.length, 6); // 5 módulos + BLOG (Componente)
  const blog = plan.MSEExtensoes.items.find((item) => item.Elemento === "blog");
  assert.equal(blog.Tipo, "Componente");

  assert.equal(plan.MSEModulos.items.length, 5); // sem BLOG nesta rodada
  const titles = plan.MSEModulos.items.map((item) => item.Title);
  assert.deepEqual(titles, ["sd-principal", "dt1-principal", "mc-principal", "db-principal", "footer-principal"]);
  assert.ok(!titles.includes("blog-principal"));

  const posicoes = plan.MSEModulos.items.map((item) => item.Posicao);
  assert.deepEqual(posicoes, ["home-a", "home-b", "home-c", "home-d", "rodape"]);
  for (const item of plan.MSEModulos.items) {
    assert.equal(item.Estado, "Publicado");
    assert.equal(item.AtribuicaoMenu, "Todas");
  }

  // Nenhum segredo/GUID/host real: só nomes técnicos genéricos (sd/dt1/mc/db/blog/footer).
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /sharepoint\.com/i);
  assert.doesNotMatch(serialized, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
}

// migrateCamapHome lança erro claro se chamado antes do apply/sem verify() OK.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller({ verifyError: new Error("pendências") });
  await assert.rejects(
    migrateCamapHome({ installer, client, confirm: () => true }),
    /listas MSE\* não estão prontas; rode installer\.apply\(\) antes da migração/
  );
  assert.equal(creates.length, 0);
}

// confirm ausente/sem função lança erro, sem gravar nada.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller();
  await assert.rejects(migrateCamapHome({ installer, client }), /confirm/);
  assert.equal(creates.length, 0);
}

// confirm que nega não grava nada.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller();
  const result = await migrateCamapHome({ installer, client, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);
}

// Com tudo pronto e confirm, grava exatamente os 1 + 6 + 5 = 12 itens esperados.
{
  const { client, creates } = createFakeClient();
  const installer = fakeInstaller();
  const result = await migrateCamapHome({ installer, client, confirm: () => true });
  assert.equal(result.status, "migrated");
  assert.equal(creates.length, 12);
  assert.deepEqual(
    result.created.map((entry) => entry.list).sort(),
    ["MSEExtensoes", "MSEExtensoes", "MSEExtensoes", "MSEExtensoes", "MSEExtensoes", "MSEExtensoes",
      "MSEMenu", "MSEModulos", "MSEModulos", "MSEModulos", "MSEModulos", "MSEModulos"].sort()
  );
  assert.equal(creates.find((entry) => entry.list === "MSEMenu").values.Alias, "");
  assert.ok(creates.some((entry) => entry.list === "MSEModulos" && entry.values.Title === "sd-principal"));
  assert.ok(!creates.some((entry) => entry.list === "MSEModulos" && entry.values.Title === "blog-principal"));
}

// Idempotência: rodar duas vezes não duplica (a segunda consulta já encontra o item).
{
  const { client, creates, lists } = createFakeClient();
  const installer = fakeInstaller();

  const first = await migrateCamapHome({ installer, client, confirm: () => true });
  assert.equal(first.status, "migrated");
  assert.equal(creates.length, 12);

  const second = await migrateCamapHome({ installer, client, confirm: () => true });
  assert.equal(second.status, "migrated");
  assert.equal(second.created.length, 0); // nada novo: todas as chaves já existem
  assert.equal(creates.length, 12); // nenhuma escrita adicional
  assert.equal(lists.get("MSEMenu").length, 1);
  assert.equal(lists.get("MSEExtensoes").length, 6);
  assert.equal(lists.get("MSEModulos").length, 5);
}

// --- buildCamapHomeC4Adjustments / migrateCamapHomeC4Adjustments (D3) -----

// buildCamapHomeC4Adjustments() é pura, congelada, e cobre exatamente o
// reposicionamento esperado (db-principal -> home-e, sd-estrutura/sd-hero/
// breadcrumbs-trilha novos em home-d/hero/breadcrumbs, db-conteudo-abaixo
// novo, 2 associações de menu).
{
  const plan = buildCamapHomeC4Adjustments();
  assert.ok(Object.isFrozen(plan));
  assert.equal(plan.updates.length, 1);
  assert.deepEqual(plan.updates[0], {
    list: "MSEModulos", keyField: "Title", key: "db-principal", values: { Posicao: "home-e" }
  });
  assert.equal(plan.creates.length, 4);
  const createdTitles = plan.creates.map((entry) => entry.values.Title);
  assert.deepEqual(createdTitles, ["sd-estrutura", "sd-hero", "db-conteudo-abaixo", "breadcrumbs-trilha"]);
  assert.equal(plan.menuAssociations.length, 2);
  assert.ok(plan.menuAssociations.every((entry) => entry.menuAlias === ""));
}

// migrateCamapHomeC4Adjustments exige a Home original (migrateCamapHome) já
// migrada: sem o item de menu "Início" (Alias ""), lança sem gravar módulos.
{
  const { client } = createFakeClient({ MSEModulos: [{ Id: 100, Title: "db-principal", Posicao: "home-d" }] });
  const installer = fakeInstaller();
  await assert.rejects(
    migrateCamapHomeC4Adjustments({ installer, client, confirm: () => true }),
    /MSEMenu.*Alias.*não encontrado/
  );
}

// Caminho completo: db-principal é atualizado (MERGE com ETag), os 4 novos
// módulos são criados e as 2 associações de menu são gravadas em
// MSEModulosMenu referenciando os Ids nativos corretos.
{
  const { client, creates, updates, lists } = createFakeClient({
    MSEMenu: [{ Id: 1, Title: "Início", Alias: "", Padrao: true }],
    MSEModulos: [{ Id: 100, Title: "db-principal", Posicao: "home-d" }]
  });
  const installer = fakeInstaller();
  const result = await migrateCamapHomeC4Adjustments({ installer, client, confirm: () => true });

  assert.equal(result.status, "adjusted");
  assert.deepEqual(result.updated, [{ list: "MSEModulos", key: "db-principal" }]);
  assert.deepEqual(
    result.created.map((entry) => entry.key),
    ["sd-estrutura", "sd-hero", "db-conteudo-abaixo", "breadcrumbs-trilha"]
  );
  assert.equal(result.associated.length, 2);

  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 100);
  assert.deepEqual(updates[0].values, { Posicao: "home-e" });
  assert.equal(lists.get("MSEModulos").find((item) => item.Title === "db-principal").Posicao, "home-e");

  const modulosMenu = lists.get("MSEModulosMenu");
  assert.equal(modulosMenu.length, 2);
  const sdHeroId = lists.get("MSEModulos").find((item) => item.Title === "sd-hero").Id;
  assert.ok(modulosMenu.some((entry) => entry.ModuloId === sdHeroId && entry.MenuId === 1));

  // Nenhum create extra foi feito para MSEMenu/MSEExtensoes — o ajuste de C4
  // só toca MSEModulos/MSEModulosMenu.
  assert.ok(!creates.some((entry) => entry.list === "MSEMenu"));
}

// Idempotência: rodar duas vezes não duplica criações/associações, e o
// update (já aplicado) não gera uma segunda chamada MERGE.
{
  const { client, creates, updates, lists } = createFakeClient({
    MSEMenu: [{ Id: 1, Title: "Início", Alias: "", Padrao: true }],
    MSEModulos: [{ Id: 100, Title: "db-principal", Posicao: "home-d" }]
  });
  const installer = fakeInstaller();

  const first = await migrateCamapHomeC4Adjustments({ installer, client, confirm: () => true });
  assert.equal(first.status, "adjusted");
  assert.equal(first.updated.length, 1);
  assert.equal(first.created.length, 4);
  assert.equal(first.associated.length, 2);

  const second = await migrateCamapHomeC4Adjustments({ installer, client, confirm: () => true });
  assert.equal(second.status, "adjusted");
  assert.equal(second.updated.length, 0, "Posicao já é home-e: nenhum MERGE adicional");
  assert.equal(second.created.length, 0, "os 4 módulos já existem");
  assert.equal(second.associated.length, 0, "as 2 associações já existem");
  assert.equal(updates.length, 1, "nenhuma chamada updateListItem extra");
  assert.equal(creates.filter((entry) => entry.list === "MSEModulos").length, 4, "nenhum create extra");
  assert.equal(lists.get("MSEModulosMenu").length, 2, "nenhuma associação duplicada");
}

// confirm que nega não grava nem atualiza nada.
{
  const { client, creates, updates } = createFakeClient({
    MSEMenu: [{ Id: 1, Title: "Início", Alias: "", Padrao: true }],
    MSEModulos: [{ Id: 100, Title: "db-principal", Posicao: "home-d" }]
  });
  const installer = fakeInstaller();
  const result = await migrateCamapHomeC4Adjustments({ installer, client, confirm: () => false });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);
  assert.equal(updates.length, 0);
}

console.log("migrate-camap-home.test.js (tools): verificações concluídas com sucesso.");
