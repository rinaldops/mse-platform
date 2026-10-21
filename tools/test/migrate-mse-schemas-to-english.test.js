import assert from "node:assert/strict";
import {
  translateModuloItem,
  translateExtensaoItem,
  translateMenuItemFields,
  readLegacyMseData,
  buildMseSchemaMigrationPlan,
  migrateMseSchemasToEnglish
} from "../migrate-mse-schemas-to-english.js";

/**
 * Mesmo padrão de fake client de `tools/test/migrate-camap-home.test.js`:
 * `getListItems(list, {select, filter, top})`/`getListItem(list, id,
 * {select})`/`createListItem(list, values)`/`updateListItem(list, id,
 * values, {etag})`, operando sobre um Map em memória indexado por `listId`.
 *
 * `MSEMenu` usa o MESMO `listId` nas duas pontas (legado e "novo") porque a
 * migração desta lista é IN-PLACE (ver cabeçalho de
 * `migrate-mse-schemas-to-english.js`) — não existe uma `MSEMenu` nova
 * separada, é a mesma linha ganhando campos extras.
 */
const LIST_IDS = Object.freeze({
  MSEModulos: "30000000-0000-4000-8000-000000000001",
  MSEMenu: "30000000-0000-4000-8000-000000000002",
  MSEExtensoes: "30000000-0000-4000-8000-000000000003",
  MSEModulosMenu: "30000000-0000-4000-8000-000000000004",
  MSEModules: "30000000-0000-4000-8000-000000000005",
  MSEExtensions: "30000000-0000-4000-8000-000000000006",
  MSEModulesMenu: "30000000-0000-4000-8000-000000000007"
});

function parseSimpleFilter(filter) {
  const clauses = filter.split(/\s+and\s+/);
  return clauses.map((clause) => {
    const match = /^(\w+) eq '([^']*)'$/.exec(clause) ?? /^(\w+) eq (-?\d+|true|false)$/.exec(clause);
    if (!match) throw new Error(`filtro não suportado pelo fake client: ${clause}`);
    const [, field, rawValue] = match;
    const value = rawValue === "true" ? true : rawValue === "false" ? false
      : /^-?\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
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
  let nextId = 1000;

  async function getListItems(list, { filter, top } = {}) {
    const items = lists.get(list.listId) ?? [];
    let result = items;
    if (filter) {
      const clauses = parseSimpleFilter(filter);
      result = items.filter((item) => clauses.every(([field, value]) => item[field] === value));
    }
    return typeof top === "number" ? result.slice(0, top) : result;
  }

  async function getListItem(list, id) {
    const items = lists.get(list.listId) ?? [];
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`getListItem: item ${id} não encontrado.`);
    return { item: { ...item }, etag: `"item-${item.Id}"`, status: 200 };
  }

  async function createListItem(list, values) {
    const id = nextId++;
    const item = { Id: id, ...values };
    creates.push({ list: internalNameByListId.get(list.listId), values: { ...values } });
    const items = lists.get(list.listId) ?? [];
    items.push(item);
    lists.set(list.listId, items);
    return { item: { ...item }, etag: `"item-${id}"`, status: 201 };
  }

  async function updateListItem(list, id, values, { etag } = {}) {
    if (!etag) throw new Error("updateListItem: etag é obrigatória (fake client).");
    const items = lists.get(list.listId) ?? [];
    const item = items.find((entry) => entry.Id === Number(id));
    if (!item) throw new Error(`updateListItem: item ${id} não encontrado.`);
    Object.assign(item, values);
    updates.push({ list: internalNameByListId.get(list.listId), id, values: { ...values } });
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
          lists: [
            { internalName: "MSEMenu", listId: LIST_IDS.MSEMenu },
            { internalName: "MSEExtensions", listId: LIST_IDS.MSEExtensions },
            { internalName: "MSEModules", listId: LIST_IDS.MSEModules },
            { internalName: "MSEModulesMenu", listId: LIST_IDS.MSEModulesMenu }
          ]
        }
      };
    }
  };
}

function legacyListIds() {
  return {
    MSEModulos: { listId: LIST_IDS.MSEModulos },
    MSEMenu: { listId: LIST_IDS.MSEMenu },
    MSEExtensoes: { listId: LIST_IDS.MSEExtensoes },
    MSEModulosMenu: { listId: LIST_IDS.MSEModulosMenu }
  };
}

// --- translateModuloItem / translateExtensaoItem / translateMenuItemFields ---
// Traduções puras de valor Choice, incluindo os ramos despublicado/alternativo
// que os 2 itens completos da fixture abaixo não cobrem sozinhos.
{
  const modulo = translateModuloItem({
    Id: 8, Title: "db-conteudo-abaixo", ModuloTipo: "db", Posicao: "conteudo-abaixo", Ordem: 1,
    Estado: "Despublicado", PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null,
    AtribuicaoMenu: "Somente", ParamsJson: "{}", SchemaVersao: null
  });
  assert.equal(modulo.Title, "db-conteudo-abaixo");
  assert.equal(modulo.values.Published, "Unpublished");
  assert.equal(modulo.values.MenuAssignment, "Only");
  assert.equal(modulo.values.SchemaVersion, null);
  assert.ok(Object.isFrozen(modulo));

  const moduloTodas = translateModuloItem({
    Id: 5, Title: "footer-principal", ModuloTipo: "footer", Posicao: "rodape", Ordem: 1,
    Estado: "Publicado", AtribuicaoMenu: "Todas", MostrarTitulo: false, ParamsJson: "{}"
  });
  assert.equal(moduloTodas.values.MenuAssignment, "All");
  assert.equal(moduloTodas.values.Published, "Published");

  const extensaoComponente = translateExtensaoItem({
    Id: 5, Title: "blog", Tipo: "Componente", Elemento: "blog", Versao: null,
    Habilitado: true, Protegido: false, Ordem: null, ParamsJson: null
  });
  assert.equal(extensaoComponente.values.Type, "Component");
  assert.equal(extensaoComponente.values.Element, "blog");

  const menuComponente = translateMenuItemFields({
    Id: 2, TipoMenu: "principal", Caminho: null, Nivel: 1, Ordem: 10, Componente: "blog",
    Visao: "article", Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado"
  });
  assert.equal(menuComponente.values.Target, "SameTab");
  assert.equal(menuComponente.values.Published, "Published");
  assert.equal(menuComponente.values.Default, false);

  const menuNovaAba = translateMenuItemFields({
    Id: 99, TipoMenu: "sistema", Caminho: "administrator", Nivel: 1, Ordem: 0, Componente: "administrator",
    Visao: "controlpanel", Padrao: false, AbrirEm: "NovaAba", Estado: "Lixeira"
  });
  assert.equal(menuNovaAba.values.Target, "NewTab");
  assert.equal(menuNovaAba.values.Published, "Trashed");

  assert.throws(() => translateMenuItemFields({ Id: "x" }), TypeError);
  assert.throws(() => translateModuloItem({ Title: "x", Estado: "Rascunho" }), /sem tradução conhecida/);

  console.log("migrate-mse-schemas-to-english.test.js: traduções de Choice ok.");
}

// --- buildMseSchemaMigrationPlan ------------------------------------------
// Fixture pequena, mas representativa: 2 módulos reais, 2 itens de menu
// (um "somente módulos", um roteado para blog), 2 extensões, 2 associações.
function fixtureLegacyData() {
  return {
    modulos: [
      { Id: 1, Title: "sd-hero", ModuloTipo: "sd", Posicao: "hero", Ordem: 1, Estado: "Publicado",
        PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: "hero",
        AtribuicaoMenu: "Somente", ParamsJson: "{}", SchemaVersao: null },
      { Id: 2, Title: "footer-principal", ModuloTipo: "footer", Posicao: "rodape", Ordem: 1, Estado: "Publicado",
        PublicarEm: null, PublicarAte: null, MostrarTitulo: false, Estilo: null,
        AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: null }
    ],
    menu: [
      { Id: 1, Title: "Início", Alias: "", TipoMenu: "principal", Caminho: "", Nivel: 1, Ordem: 0,
        Componente: null, Visao: null, Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado" },
      { Id: 2, Title: "Quem somos", Alias: "quem-somos", TipoMenu: "principal", Caminho: "quem-somos", Nivel: 1,
        Ordem: 10, Componente: "blog", Visao: "article", Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado" }
    ],
    extensoes: [
      { Id: 1, Title: "sd", Tipo: "Modulo", Elemento: "sd", Versao: null, Habilitado: true, Protegido: false,
        Ordem: null, ParamsJson: null },
      { Id: 2, Title: "blog", Tipo: "Componente", Elemento: "blog", Versao: null, Habilitado: true,
        Protegido: false, Ordem: null, ParamsJson: null }
    ],
    modulosMenu: [
      { Id: 1, Title: null, ModuloId: 1, MenuId: 1 }
    ]
  };
}

{
  const plan = buildMseSchemaMigrationPlan(fixtureLegacyData());
  assert.ok(Object.isFrozen(plan));
  assert.deepEqual(Object.keys(plan), ["modules", "extensions", "menuUpdates", "modulesMenu"]);

  assert.equal(plan.modules.length, 2);
  assert.deepEqual(plan.modules.map((m) => m.Title), ["sd-hero", "footer-principal"]);
  assert.equal(plan.modules[0].values.MenuAssignment, "Only");
  assert.equal(plan.modules[1].values.MenuAssignment, "All");

  assert.equal(plan.extensions.length, 2);
  assert.equal(plan.extensions[1].values.Type, "Component");

  assert.equal(plan.menuUpdates.length, 2);
  assert.equal(plan.menuUpdates[0].Id, 1);
  assert.equal(plan.menuUpdates[0].values.Default, true);
  assert.equal(plan.menuUpdates[1].values.Component, "blog");
  assert.equal(plan.menuUpdates[1].values.Published, "Published");

  assert.equal(plan.modulesMenu.length, 1);
  assert.equal(plan.modulesMenu[0].moduleTitle, "sd-hero");
  assert.equal(plan.modulesMenu[0].menuId, 1);
  assert.equal(plan.modulesMenu[0].title, "sd-hero × menu 1");

  // Referência órfã (ModuloId inexistente) lança erro claro.
  const broken = fixtureLegacyData();
  broken.modulosMenu.push({ Id: 2, Title: null, ModuloId: 999, MenuId: 1 });
  assert.throws(() => buildMseSchemaMigrationPlan(broken), /ModuloId=999 inexistente/);

  console.log("migrate-mse-schemas-to-english.test.js: buildMseSchemaMigrationPlan ok.");
}

// --- readLegacyMseData -----------------------------------------------------
{
  const { client } = createFakeClient({
    MSEModulos: fixtureLegacyData().modulos,
    MSEMenu: fixtureLegacyData().menu,
    MSEExtensoes: fixtureLegacyData().extensoes,
    MSEModulosMenu: fixtureLegacyData().modulosMenu
  });
  const data = await readLegacyMseData(client, legacyListIds());
  assert.equal(data.modulos.length, 2);
  assert.equal(data.menu.length, 2);
  assert.equal(data.extensoes.length, 2);
  assert.equal(data.modulosMenu.length, 1);
  console.log("migrate-mse-schemas-to-english.test.js: readLegacyMseData ok.");
}

// --- migrateMseSchemasToEnglish --------------------------------------------

function seedFixture() {
  const f = fixtureLegacyData();
  return {
    MSEModulos: f.modulos,
    MSEMenu: f.menu,
    MSEExtensoes: f.extensoes,
    MSEModulosMenu: f.modulosMenu
  };
}

// Lança erro claro se as listas novas não estão prontas (verify falha).
{
  const { client, creates } = createFakeClient(seedFixture());
  const installer = fakeInstaller({ verifyError: new Error("pendências") });
  await assert.rejects(
    migrateMseSchemasToEnglish({ installer, legacyListIds: legacyListIds(), client, confirm: () => true }),
    /listas MSE\* \(novas\) não estão prontas; rode installer\.apply\(\) antes da migração/
  );
  assert.equal(creates.length, 0);
}

// confirm ausente/sem função lança erro, sem gravar nada.
{
  const { client, creates } = createFakeClient(seedFixture());
  const installer = fakeInstaller();
  await assert.rejects(
    migrateMseSchemasToEnglish({ installer, legacyListIds: legacyListIds(), client }),
    /confirm/
  );
  assert.equal(creates.length, 0);
}

// confirm que nega não grava nada.
{
  const { client, creates, updates } = createFakeClient(seedFixture());
  const installer = fakeInstaller();
  const result = await migrateMseSchemasToEnglish({
    installer, legacyListIds: legacyListIds(), client, confirm: () => false
  });
  assert.equal(result.status, "cancelled");
  assert.equal(creates.length, 0);
  assert.equal(updates.length, 0);
}

// Caminho completo: cria MSEModules/MSEExtensions, atualiza MSEMenu in-place,
// cria MSEModulesMenu com o ModuleId NOVO (remapeado), não o antigo.
{
  const { client, creates, updates, lists } = createFakeClient(seedFixture());
  const installer = fakeInstaller();
  const result = await migrateMseSchemasToEnglish({
    installer, legacyListIds: legacyListIds(), client, confirm: () => true
  });

  assert.equal(result.status, "migrated");
  assert.deepEqual(result.modulesCreated, ["sd-hero", "footer-principal"]);
  assert.deepEqual(result.extensionsCreated, ["sd", "blog"]);
  assert.deepEqual(result.menuUpdated, [1, 2]);
  assert.deepEqual(result.modulesMenuCreated, ["sd-hero × menu 1"]);

  assert.equal(lists.get("MSEModules").length, 2);
  assert.equal(lists.get("MSEExtensions").length, 2);
  const newSdHero = lists.get("MSEModules").find((item) => item.Title === "sd-hero");
  assert.equal(newSdHero.MenuAssignment, "Only");

  // MSEMenu foi atualizado IN-PLACE (mesmo Id, mesma lista) — nenhum create.
  assert.ok(!creates.some((entry) => entry.list === "MSEMenu"));
  assert.equal(updates.filter((entry) => entry.list === "MSEMenu").length, 2);
  const inicioAtualizado = lists.get("MSEMenu").find((item) => item.Id === 1);
  assert.equal(inicioAtualizado.Default, true);
  assert.equal(inicioAtualizado.Published, "Published");

  // MSEModulesMenu referencia o Id NOVO de MSEModules, não o Id antigo (1) de MSEModulos.
  const modulesMenu = lists.get("MSEModulesMenu");
  assert.equal(modulesMenu.length, 1);
  assert.equal(modulesMenu[0].ModuleId, newSdHero.Id);
  assert.notEqual(modulesMenu[0].ModuleId, 1);
  assert.equal(modulesMenu[0].MenuId, 1);

  console.log("migrate-mse-schemas-to-english.test.js: caminho completo ok.");
}

// Idempotência: rodar duas vezes não duplica criações, e o segundo UPDATE de
// MSEMenu é pulado (valores já batem).
{
  const { client, creates, updates, lists } = createFakeClient(seedFixture());
  const installer = fakeInstaller();

  const first = await migrateMseSchemasToEnglish({
    installer, legacyListIds: legacyListIds(), client, confirm: () => true
  });
  assert.equal(first.status, "migrated");
  assert.equal(first.menuUpdated.length, 2);

  const second = await migrateMseSchemasToEnglish({
    installer, legacyListIds: legacyListIds(), client, confirm: () => true
  });
  assert.equal(second.status, "migrated");
  assert.equal(second.modulesCreated.length, 0, "módulos já existem (por Title)");
  assert.equal(second.extensionsCreated.length, 0, "extensões já existem (por Element)");
  assert.equal(second.menuUpdated.length, 0, "valores em inglês já batem: nenhum MERGE adicional");
  assert.equal(second.modulesMenuCreated.length, 0, "associação já existe (par ModuleId/MenuId)");

  assert.equal(lists.get("MSEModules").length, 2);
  assert.equal(lists.get("MSEExtensions").length, 2);
  assert.equal(lists.get("MSEModulesMenu").length, 1);
  assert.equal(updates.filter((entry) => entry.list === "MSEMenu").length, 2, "nenhum MERGE extra na segunda rodada");
  assert.equal(creates.length, 5, "2 módulos + 2 extensões + 1 associação, nenhuma escrita adicional na 2ª rodada");
}

// Referência órfã em MSEModulosMenu (ModuloId sem módulo correspondente)
// propaga erro ANTES de qualquer confirm/escrita (buildMseSchemaMigrationPlan
// já lança ao montar o plano).
{
  const seeded = seedFixture();
  seeded.MSEModulosMenu = [...seeded.MSEModulosMenu, { Id: 2, Title: null, ModuloId: 999, MenuId: 1 }];
  const { client, creates } = createFakeClient(seeded);
  const installer = fakeInstaller();
  await assert.rejects(
    migrateMseSchemasToEnglish({ installer, legacyListIds: legacyListIds(), client, confirm: () => true }),
    /ModuloId=999 inexistente/
  );
  assert.equal(creates.length, 0);
}

console.log("migrate-mse-schemas-to-english.test.js (tools): verificações concluídas com sucesso.");
