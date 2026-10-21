import assert from "node:assert/strict";
import {
  diffModules,
  diffExtensions,
  diffMenu,
  diffModulesMenu,
  verifyMseSchemaMigration
} from "../verify-mse-schema-migration.js";

// --- diffModules -------------------------------------------------------

{
  const modulos = [
    { Id: 1, Title: "sd-hero", ModuloTipo: "sd", Posicao: "hero", Ordem: 1, Estado: "Publicado",
      MostrarTitulo: false, Estilo: "hero", AtribuicaoMenu: "Somente", ParamsJson: "{}" }
  ];
  const matching = diffModules(modulos, [
    { Id: 100, Title: "sd-hero", Module: "sd", Position: "hero", Ordering: 1, Published: "Published",
      PublishUp: null, PublishDown: null, ShowTitle: false, Style: "hero", MenuAssignment: "Only",
      ParamsJson: "{}", SchemaVersion: null }
  ]);
  assert.equal(matching.results[0].found, true);
  assert.deepEqual(matching.results[0].diffs, []);
  assert.deepEqual(matching.extra, []);

  const missing = diffModules(modulos, []);
  assert.equal(missing.results[0].found, false);

  const diverging = diffModules(modulos, [
    { Id: 100, Title: "sd-hero", Module: "sd", Position: "hero", Ordering: 1, Published: "Unpublished",
      PublishUp: null, PublishDown: null, ShowTitle: false, Style: "hero", MenuAssignment: "Only",
      ParamsJson: "{}", SchemaVersion: null }
  ]);
  assert.equal(diverging.results[0].found, true);
  assert.deepEqual(diverging.results[0].diffs, [{ field: "Published", expected: "Published", actual: "Unpublished" }]);

  const extra = diffModules(modulos, [
    { Id: 100, Title: "sd-hero", Module: "sd", Position: "hero", Ordering: 1, Published: "Published",
      PublishUp: null, PublishDown: null, ShowTitle: false, Style: "hero", MenuAssignment: "Only",
      ParamsJson: "{}", SchemaVersion: null },
    { Id: 101, Title: "orfao", Module: "x", Position: "y", Ordering: 1, Published: "Published",
      PublishUp: null, PublishDown: null, ShowTitle: false, Style: null, MenuAssignment: "All",
      ParamsJson: null, SchemaVersion: null }
  ]);
  assert.deepEqual(extra.extra, ["orfao"]);

  console.log("verify-mse-schema-migration.test.js: diffModules ok.");
}

// --- diffExtensions ------------------------------------------------------

{
  const extensoes = [
    { Id: 1, Title: "sd", Tipo: "Modulo", Elemento: "sd", Habilitado: true, Protegido: false }
  ];
  const matching = diffExtensions(extensoes, [
    { Id: 10, Title: "sd", Type: "Module", Element: "sd", Version: null, Enabled: true, Protected: false,
      Ordering: null, ParamsJson: null }
  ]);
  assert.equal(matching.results[0].found, true);
  assert.deepEqual(matching.results[0].diffs, []);

  const missing = diffExtensions(extensoes, []);
  assert.equal(missing.results[0].found, false);

  console.log("verify-mse-schema-migration.test.js: diffExtensions ok.");
}

// --- diffMenu --------------------------------------------------------------

{
  const menu = [
    { Id: 1, TipoMenu: "principal", Caminho: null, Nivel: 1, Ordem: 0, Componente: null, Visao: null,
      Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado",
      MenuType: "principal", Path: null, Level: 1, Ordering: 0, Component: null, View: null,
      Default: true, Target: "SameTab", Published: "Published" }
  ];
  const matching = diffMenu(menu);
  assert.deepEqual(matching.results[0].diffs, []);

  const diverging = diffMenu([{ ...menu[0], Published: "Unpublished" }]);
  assert.deepEqual(diverging.results[0].diffs, [{ field: "Published", expected: "Published", actual: "Unpublished" }]);

  console.log("verify-mse-schema-migration.test.js: diffMenu ok.");
}

// --- diffModulesMenu ---------------------------------------------------

{
  const modulosMenu = [{ Id: 1, Title: null, ModuloId: 1, MenuId: 1 }];
  const modulos = [{ Id: 1, Title: "sd-hero" }];
  const modulesNew = [{ Id: 100, Title: "sd-hero" }];

  const matching = diffModulesMenu(modulosMenu, modulos, modulesNew, [{ Id: 1, ModuleId: 100, MenuId: 1 }]);
  assert.equal(matching.results[0].found, true);
  assert.equal(matching.results[0].newModuleId, 100);

  const missing = diffModulesMenu(modulosMenu, modulos, modulesNew, []);
  assert.equal(missing.results[0].found, false);

  const orphanModulo = diffModulesMenu([{ Id: 2, Title: null, ModuloId: 999, MenuId: 1 }], modulos, modulesNew, []);
  assert.equal(orphanModulo.results[0].found, false);
  assert.match(orphanModulo.results[0].error, /inexistente/);

  console.log("verify-mse-schema-migration.test.js: diffModulesMenu ok.");
}

// --- verifyMseSchemaMigration (ponta a ponta, fake client) -----------------

const LIST_IDS = Object.freeze({
  MSEModulos: "40000000-0000-4000-8000-000000000001",
  MSEMenu: "40000000-0000-4000-8000-000000000002",
  MSEExtensoes: "40000000-0000-4000-8000-000000000003",
  MSEModulosMenu: "40000000-0000-4000-8000-000000000004",
  MSEModules: "40000000-0000-4000-8000-000000000005",
  MSEExtensions: "40000000-0000-4000-8000-000000000006",
  MSEModulesMenu: "40000000-0000-4000-8000-000000000007"
});

function createFakeClient(items) {
  const lists = new Map(Object.entries(items).map(([internalName, value]) => [LIST_IDS[internalName], value]));
  async function getListItems(list) {
    return lists.get(list.listId) ?? [];
  }
  return { getListItems };
}

function fakeInstaller() {
  return {
    verify: async () => ({
      status: "ready",
      plan: { lists: Object.entries(LIST_IDS).map(([internalName, listId]) => ({ internalName, listId })) }
    })
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

{
  const legacyModulo = { Id: 1, Title: "sd-hero", ModuloTipo: "sd", Posicao: "hero", Ordem: 1,
    Estado: "Publicado", MostrarTitulo: false, Estilo: "hero", AtribuicaoMenu: "Somente", ParamsJson: "{}" };
  const legacyMenuItem = { Id: 1, TipoMenu: "principal", Caminho: null, Nivel: 1, Ordem: 0, Componente: null,
    Visao: null, Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado" };
  const legacyExtensao = { Id: 1, Title: "sd", Tipo: "Modulo", Elemento: "sd", Habilitado: true, Protegido: false };
  const legacyJuncao = { Id: 1, Title: null, ModuloId: 1, MenuId: 1 };

  const client = createFakeClient({
    MSEModulos: [legacyModulo],
    MSEMenu: [{ ...legacyMenuItem, MenuType: "principal", Path: null, Level: 1, Ordering: 0, Component: null,
      View: null, Default: true, Target: "SameTab", Published: "Published" }],
    MSEExtensoes: [legacyExtensao],
    MSEModulosMenu: [legacyJuncao],
    MSEModules: [{ Id: 100, Title: "sd-hero", Module: "sd", Position: "hero", Ordering: 1, Published: "Published",
      PublishUp: null, PublishDown: null, ShowTitle: false, Style: "hero", MenuAssignment: "Only",
      ParamsJson: "{}", SchemaVersion: null }],
    MSEExtensions: [{ Id: 10, Title: "sd", Type: "Module", Element: "sd", Version: null, Enabled: true,
      Protected: false, Ordering: null, ParamsJson: null }],
    MSEModulesMenu: [{ Id: 1, Title: "sd-hero × menu 1", ModuleId: 100, MenuId: 1 }]
  });

  const report = await verifyMseSchemaMigration({ installer: fakeInstaller(), legacyListIds: legacyListIds(), client });
  assert.equal(report.ok, true);
  assert.equal(report.counts.modulos, 1);
  assert.equal(report.counts.modulesNew, 1);

  console.log("verify-mse-schema-migration.test.js: caminho completo (tudo ok) ok.");
}

// Caminho com divergência real: report.ok deve ser false.
{
  const client = createFakeClient({
    MSEModulos: [{ Id: 1, Title: "sd-hero", ModuloTipo: "sd", Posicao: "hero", Ordem: 1,
      Estado: "Publicado", MostrarTitulo: false, Estilo: "hero", AtribuicaoMenu: "Somente", ParamsJson: "{}" }],
    MSEMenu: [{ Id: 1, TipoMenu: "principal", Caminho: null, Nivel: 1, Ordem: 0, Componente: null,
      Visao: null, Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado",
      MenuType: "principal", Path: null, Level: 1, Ordering: 0, Component: null,
      View: null, Default: true, Target: "SameTab", Published: "Published" }],
    MSEExtensoes: [],
    MSEModulosMenu: [],
    MSEModules: [], // módulo nunca migrado -> report.ok deve ser false
    MSEExtensions: [],
    MSEModulesMenu: []
  });

  const report = await verifyMseSchemaMigration({ installer: fakeInstaller(), legacyListIds: legacyListIds(), client });
  assert.equal(report.ok, false);
  assert.equal(report.modules.results[0].found, false);

  console.log("verify-mse-schema-migration.test.js: caminho com divergência (ok=false) ok.");
}

console.log("verify-mse-schema-migration.test.js (tools): verificações concluídas com sucesso.");
