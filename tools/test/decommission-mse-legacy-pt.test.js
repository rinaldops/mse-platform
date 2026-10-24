// mse-platform/tools/test/decommission-mse-legacy-pt.test.js
import assert from "node:assert/strict";
import {
  MENU_PT_FIELDS,
  buildDecommissionPlan,
  readLegacyMenuTipos,
  decommissionMseLegacyPt
} from "../decommission-mse-legacy-pt.js";

/**
 * Fake client com `getListItems` (idêntico, em espírito, ao de
 * `tools/test/verify-mse-schema-migration.test.js`) + `request(path,
 * {method, etag, allowWildcardEtag})` simulando DELETE de lista/campo.
 *
 * Deliberadamente DESACOPLADO: `getListItems` lê de um Map indexado por
 * `listId` que nunca é alterado pelo `request()` simulando DELETE — isso
 * isola o teste de idempotência do DELETE (2ª chamada em lista/campo já
 * apagado -> `error.code === "not-found"`, tratado como no-op) do
 * comportamento de `verifyMseSchemaMigration` (que só lê, nunca escreve),
 * sem precisar reproduzir a consistência real do SharePoint (apagar a
 * lista também quebraria GETs subsequentes lá, mas isso é comportamento de
 * SharePoint, não deste script — fora do que estamos testando aqui).
 */
const LIST_IDS = Object.freeze({
  MSEModulos: "50000000-0000-4000-8000-000000000001",
  MSEMenu: "50000000-0000-4000-8000-000000000002",
  MSEExtensoes: "50000000-0000-4000-8000-000000000003",
  MSEModulosMenu: "50000000-0000-4000-8000-000000000004",
  MSEMenuTipos: "50000000-0000-4000-8000-000000000005",
  MSEModules: "50000000-0000-4000-8000-000000000006",
  MSEExtensions: "50000000-0000-4000-8000-000000000007",
  MSEModulesMenu: "50000000-0000-4000-8000-000000000008"
});

function createFakeClient(items) {
  const lists = new Map(Object.entries(items).map(([internalName, value]) => [LIST_IDS[internalName], value]));
  const deletedListIds = new Set();
  const deletedFields = new Map(); // listId -> Set<fieldName>
  const requests = [];

  async function getListItems(list) {
    return lists.get(list.listId) ?? [];
  }

  async function request(path, { method, etag, allowWildcardEtag } = {}) {
    requests.push({ path, method, etag, allowWildcardEtag });
    if (method !== "DELETE") throw new Error(`fake client só simula DELETE: ${method}`);
    if (etag !== "*" || allowWildcardEtag !== true) {
      throw new Error("fake client exige etag='*' com allowWildcardEtag:true.");
    }
    const fieldMatch = /^\/_api\/web\/lists\(guid'([0-9a-f-]+)'\)\/fields\/getbyinternalnameortitle\('([^']+)'\)$/i
      .exec(path);
    if (fieldMatch) {
      const [, listId, fieldName] = fieldMatch;
      const fields = deletedFields.get(listId) ?? new Set();
      if (fields.has(fieldName)) {
        const notFound = new Error(`campo ${fieldName} já apagado (fake client).`);
        notFound.code = "not-found";
        throw notFound;
      }
      fields.add(fieldName);
      deletedFields.set(listId, fields);
      return { status: 200 };
    }
    const listMatch = /^\/_api\/web\/lists\(guid'([0-9a-f-]+)'\)$/i.exec(path);
    if (listMatch) {
      const [, listId] = listMatch;
      if (deletedListIds.has(listId)) {
        const notFound = new Error(`lista ${listId} já apagada (fake client).`);
        notFound.code = "not-found";
        throw notFound;
      }
      deletedListIds.add(listId);
      return { status: 200 };
    }
    throw new Error(`fake client: path não reconhecido: ${path}`);
  }

  return { client: { getListItems, request }, lists, deletedListIds, deletedFields, requests };
}

function fakeInstaller() {
  return {
    verify: async () => ({
      status: "ready",
      plan: {
        lists: [
          { internalName: "MSEModules", listId: LIST_IDS.MSEModules },
          { internalName: "MSEExtensions", listId: LIST_IDS.MSEExtensions },
          { internalName: "MSEModulesMenu", listId: LIST_IDS.MSEModulesMenu },
          { internalName: "MSEMenu", listId: LIST_IDS.MSEMenu }
        ]
      }
    })
  };
}

function legacyListIds() {
  return {
    MSEModulos: { listId: LIST_IDS.MSEModulos },
    MSEMenu: { listId: LIST_IDS.MSEMenu },
    MSEExtensoes: { listId: LIST_IDS.MSEExtensoes },
    MSEModulosMenu: { listId: LIST_IDS.MSEModulosMenu },
    MSEMenuTipos: { listId: LIST_IDS.MSEMenuTipos }
  };
}

// Fixture "tudo migrado e consistente" (mesmo formato de
// verify-mse-schema-migration.test.js) — garante report.ok === true.
function consistentFixture() {
  const legacyModulo = { Id: 1, Title: "sd-hero", ModuloTipo: "sd", Posicao: "hero", Ordem: 1,
    Estado: "Publicado", MostrarTitulo: false, Estilo: "hero", AtribuicaoMenu: "Somente", ParamsJson: "{}" };
  const legacyMenuItem = { Id: 1, TipoMenu: "principal", Caminho: null, Nivel: 1, Ordem: 0, Componente: null,
    Visao: null, Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado",
    MenuType: "principal", Path: null, Level: 1, Ordering: 0, Component: null,
    View: null, Default: true, Target: "SameTab", Published: "Published" };
  const legacyExtensao = { Id: 1, Title: "sd", Tipo: "Modulo", Elemento: "sd", Habilitado: true, Protegido: false };
  const legacyJuncao = { Id: 1, Title: null, ModuloId: 1, MenuId: 1 };
  const legacyMenuTipos = [{ Id: 1, Title: "Principal", Chave: "principal", Descricao: "Menu principal" }];

  return {
    MSEModulos: [legacyModulo],
    MSEMenu: [legacyMenuItem],
    MSEExtensoes: [legacyExtensao],
    MSEModulosMenu: [legacyJuncao],
    MSEMenuTipos: legacyMenuTipos,
    MSEModules: [{ Id: 100, Title: "sd-hero", Module: "sd", Position: "hero", Ordering: 1, Published: "Published",
      PublishUp: null, PublishDown: null, ShowTitle: false, Style: "hero", MenuAssignment: "Only",
      ParamsJson: "{}", SchemaVersion: null }],
    MSEExtensions: [{ Id: 10, Title: "sd", Type: "Module", Element: "sd", Version: null, Enabled: true,
      Protected: false, Ordering: null, ParamsJson: null }],
    MSEModulesMenu: [{ Id: 1, Title: "sd-hero × menu 1", ModuleId: 100, MenuId: 1 }]
  };
}

// Fixture com divergência real (módulo nunca migrado) -> report.ok === false.
function divergentFixture() {
  const fixture = consistentFixture();
  return { ...fixture, MSEModules: [] };
}

function createFsMocks() {
  const writes = [];
  const mkdirCalls = [];
  return {
    writeFileImpl: async (path, data, encoding) => { writes.push({ path, data, encoding }); },
    mkdirImpl: async (path, options) => { mkdirCalls.push({ path, options }); },
    writes,
    mkdirCalls
  };
}

const EXPORT_PATH = "tmp/dumps/decommission-mse-legacy-pt.json";

// --- buildDecommissionPlan -------------------------------------------------
{
  const plan = buildDecommissionPlan();
  assert.ok(Object.isFrozen(plan));
  assert.equal(plan.irreversible, true);
  assert.deepEqual(plan.lists.map((l) => l.internalName), ["MSEModulos", "MSEExtensoes", "MSEModulosMenu", "MSEMenuTipos"]);
  assert.deepEqual(plan.menuFields, MENU_PT_FIELDS);
  assert.equal(MENU_PT_FIELDS.length, 9);
  console.log("decommission-mse-legacy-pt.test.js: buildDecommissionPlan ok.");
}

// --- readLegacyMenuTipos ----------------------------------------------------
{
  const fixture = consistentFixture();
  const { client } = createFakeClient(fixture);
  const items = await readLegacyMenuTipos(client, legacyListIds().MSEMenuTipos);
  assert.equal(items.length, 1);
  assert.equal(items[0].Chave, "principal");
  console.log("decommission-mse-legacy-pt.test.js: readLegacyMenuTipos ok.");
}

// --- validações de entrada --------------------------------------------------
{
  const { client } = createFakeClient(consistentFixture());
  const fs = createFsMocks();
  await assert.rejects(
    decommissionMseLegacyPt({
      installer: fakeInstaller(), legacyListIds: { ...legacyListIds(), MSEMenuTipos: undefined },
      client, confirm: () => true, exportPath: EXPORT_PATH, ...fs
    }),
    TypeError
  );
  await assert.rejects(
    decommissionMseLegacyPt({
      installer: fakeInstaller(), legacyListIds: legacyListIds(),
      client: { getListItems: client.getListItems }, confirm: () => true, exportPath: EXPORT_PATH, ...fs
    }),
    TypeError
  );
  await assert.rejects(
    decommissionMseLegacyPt({
      installer: fakeInstaller(), legacyListIds: legacyListIds(), client, exportPath: EXPORT_PATH, ...fs
    }),
    TypeError
  );
  await assert.rejects(
    decommissionMseLegacyPt({
      installer: fakeInstaller(), legacyListIds: legacyListIds(), client, confirm: () => true, ...fs
    }),
    TypeError
  );
  assert.equal(fs.writes.length, 0);
  console.log("decommission-mse-legacy-pt.test.js: validações de entrada ok.");
}

// --- verifyMseSchemaMigration não-ok aborta ANTES de qualquer escrita -------
{
  const { client, requests } = createFakeClient(divergentFixture());
  const fs = createFsMocks();
  let error;
  try {
    await decommissionMseLegacyPt({
      installer: fakeInstaller(), legacyListIds: legacyListIds(), client,
      confirm: () => true, exportPath: EXPORT_PATH, ...fs
    });
  } catch (e) {
    error = e;
  }
  assert.ok(error, "deveria lançar quando verifyMseSchemaMigration reporta ok=false");
  assert.match(error.message, /divergências/);
  assert.equal(error.report.ok, false);
  assert.equal(fs.writes.length, 0, "dump não deve ser escrito se a verificação falhar");
  assert.equal(requests.length, 0, "nenhum DELETE deve ser tentado se a verificação falhar");
  console.log("decommission-mse-legacy-pt.test.js: verify ok=false aborta sem escrever nada ok.");
}

// --- confirm(plan) === false: dump é escrito (salvaguarda obrigatória), mas
// nada é apagado -----------------------------------------------------------
{
  const { client, requests } = createFakeClient(consistentFixture());
  const fs = createFsMocks();
  const result = await decommissionMseLegacyPt({
    installer: fakeInstaller(), legacyListIds: legacyListIds(), client,
    confirm: () => false, exportPath: EXPORT_PATH, ...fs
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.exportPath, EXPORT_PATH);
  assert.deepEqual(result.listsDeleted, []);
  assert.deepEqual(result.fieldsDeleted, []);
  assert.equal(fs.writes.length, 1, "dump de segurança é escrito mesmo quando confirm nega");
  assert.equal(fs.mkdirCalls.length, 1);
  const dump = JSON.parse(fs.writes[0].data);
  assert.equal(dump.modulos.length, 1);
  assert.equal(dump.menuTipos.length, 1);
  assert.equal(dump.menuPtFields.length, 1);
  assert.equal(requests.length, 0, "confirm negado não deve apagar nada");
  console.log("decommission-mse-legacy-pt.test.js: confirm=false cancela sem apagar (mas grava o dump) ok.");
}

// --- caminho completo: confirm(plan) === true apaga as 4 listas PT + os 9
// campos PT de MSEMenu -------------------------------------------------------
{
  const { client, requests, deletedListIds, deletedFields } = createFakeClient(consistentFixture());
  const fs = createFsMocks();
  const result = await decommissionMseLegacyPt({
    installer: fakeInstaller(), legacyListIds: legacyListIds(), client,
    confirm: () => true, exportPath: EXPORT_PATH, ...fs
  });
  assert.equal(result.status, "decommissioned");
  assert.deepEqual(result.listsDeleted, ["MSEModulos", "MSEExtensoes", "MSEModulosMenu", "MSEMenuTipos"]);
  assert.deepEqual(result.fieldsDeleted, MENU_PT_FIELDS);
  assert.equal(deletedListIds.size, 4);
  assert.equal(deletedFields.get(LIST_IDS.MSEMenu).size, 9);
  assert.ok(requests.every((r) => r.method === "DELETE" && r.etag === "*" && r.allowWildcardEtag === true));
  assert.equal(fs.writes.length, 1, "dump escrito antes das exclusões");
  console.log("decommission-mse-legacy-pt.test.js: caminho completo (apaga tudo) ok.");
}

// --- idempotência: 2ª chamada sobre lista/campo já apagados não lança, só
// não reporta nada como "deletado de novo" -----------------------------------
{
  const { client, requests } = createFakeClient(consistentFixture());
  const fs = createFsMocks();

  const first = await decommissionMseLegacyPt({
    installer: fakeInstaller(), legacyListIds: legacyListIds(), client,
    confirm: () => true, exportPath: EXPORT_PATH, ...fs
  });
  assert.equal(first.status, "decommissioned");
  assert.equal(first.listsDeleted.length, 4);
  assert.equal(first.fieldsDeleted.length, 9);

  const second = await decommissionMseLegacyPt({
    installer: fakeInstaller(), legacyListIds: legacyListIds(), client,
    confirm: () => true, exportPath: EXPORT_PATH, ...fs
  });
  assert.equal(second.status, "decommissioned", "2ª chamada não deve lançar mesmo com tudo já apagado");
  assert.deepEqual(second.listsDeleted, [], "nada é reportado como apagado de novo (já estava ausente)");
  assert.deepEqual(second.fieldsDeleted, [], "idem para os campos");
  assert.equal(requests.length, 13 + 13, "13 tentativas de DELETE por rodada (4 listas + 9 campos), 2 rodadas");
  console.log("decommission-mse-legacy-pt.test.js: idempotência (2ª chamada não lança) ok.");
}

console.log("decommission-mse-legacy-pt.test.js (tools): verificações concluídas com sucesso.");
