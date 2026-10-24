// mse-platform/tools/decommission-mse-legacy-pt.js
//
// Fase 5 da normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`,
// item "Decomissionamento das listas/campos PT" do plano de implementação
// das lacunas "Baixa prioridade"): decomissiona DE FATO as listas/campos PT
// legados cuja migração para inglês já foi concluída e verificada
// (Fases 3/4) — apaga as 4 listas PT (`MSEModulos`/`MSEExtensoes`/
// `MSEModulosMenu`/`MSEMenuTipos`, com os dados) e os 9 campos PT de
// `MSEMenu` (`TipoMenu`/`Caminho`/`Nivel`/`Ordem`/`Componente`/`Visao`/
// `Padrao`/`AbrirEm`/`Estado` — ver `kernel/schemas/mse-menu.js`).
//
// AÇÃO IRREVERSÍVEL, autorizada explicitamente pelo usuário. Salvaguardas
// obrigatórias, NESTA ORDEM, nunca puladas:
//   1. `verifyMseSchemaMigration` (reaproveitado de
//      `tools/verify-mse-schema-migration.js`, NUNCA duplicado) — gate só de
//      LEITURA; lança se `report.ok !== true` (qualquer divergência entre o
//      dado PT e o já migrado para EN cancela tudo antes de qualquer escrita).
//   2. Export de segurança: dump JSON local (fora do controle de versão —
//      `tmp/` já está em `.gitignore`) com todos os itens das 4 listas PT e
//      os 9 campos PT de cada item de `MSEMenu`, escrito ANTES de qualquer
//      DELETE. Não é uma recomendação separada — é parte do próprio fluxo.
//   3. `confirm(plan)` explícito (mesmo padrão de todo o resto de `tools/`),
//      com o plano deixando claro que a ação é irreversível.
//
// Mecanismo de exclusão: `client.request()` de baixo nível (`core/rest.js`)
// — não existe helper de alto nível para apagar lista ou campo (só
// `deleteListItem`, por item). Mesmo padrão de `core/list-provisioning.js`
// para MERGE de campo (`fields/getbyinternalnameortitle('<Campo>')`), aqui
// com `method:"DELETE"` em vez de `"MERGE"`.
//
// Idempotente: lista ou campo já ausente (HTTP 404 → `error.code ===
// "not-found"`, ver `core/rest.js#throwForResponse`) é tratado como "nada a
// fazer", nunca como erro — permite rodar de novo em caso de falha parcial.

import { dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { readLegacyMseData } from "./migrate-mse-schemas-to-english.js";
import { verifyMseSchemaMigration } from "./verify-mse-schema-migration.js";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function listApiPathForId(listId) {
  if (typeof listId !== "string" || !GUID_RE.test(listId)) {
    throw new TypeError("listId deve ser um GUID válido.");
  }
  return `/_api/web/lists(guid'${listId.toLowerCase()}')`;
}

// Os 9 campos PT de MSEMenu — ver kernel/schemas/mse-menu.js, cada um
// marcado `// DEPRECATED (Fase 3)` no comentário, com o equivalente EN já
// lido com exclusividade pelo código consumidor desde a Fase 4
// (kernel/menu.js, components/com_menus/menus-editor.js).
export const MENU_PT_FIELDS = Object.freeze([
  "TipoMenu", "Caminho", "Nivel", "Ordem", "Componente", "Visao", "Padrao", "AbrirEm", "Estado"
]);

/**
 * Plano puro (sem rede) do que será apagado — útil para revisão humana via
 * `confirm(plan)` antes de qualquer escrita, e para o próprio dump de
 * segurança descrever o que está sendo preservado.
 */
export function buildDecommissionPlan() {
  return deepFreeze({
    irreversible: true,
    lists: [
      { internalName: "MSEModulos", displayName: "MSE Módulos (PT, legada)" },
      { internalName: "MSEExtensoes", displayName: "MSE Extensões (PT, legada)" },
      { internalName: "MSEModulosMenu", displayName: "MSE Módulos×Menu (PT, legada)" },
      { internalName: "MSEMenuTipos", displayName: "MSE Tipos de menu (PT, legada)" }
    ],
    menuFields: [...MENU_PT_FIELDS]
  });
}

/**
 * Lê todos os itens reais de `MSEMenuTipos` (PT) — não é lida por
 * `readLegacyMseData` (de `tools/migrate-mse-schemas-to-english.js`), já que
 * aquele script nunca migrou esta lista (sem equivalente EN mapeável 1:1 —
 * `MSEMenuTypes` é semeada à mão, não copiada registro a registro).
 *
 * @param {object} client
 * @param {{listId:string}} list
 * @returns {Promise<object[]>}
 */
export async function readLegacyMenuTipos(client, list) {
  return client.getListItems(list, { select: ["Id", "Title", "Chave", "Descricao"] });
}

/**
 * Executa o decomissionamento de fato — só atrás das 3 salvaguardas do
 * cabeçalho. `legacyListIds` deve informar `listId` para as 5 listas PT
 * envolvidas (as 4 que serão apagadas + `MSEMenu`, cujos campos PT serão
 * removidos, não a lista).
 *
 * @param {{
 *   installer: { verify: () => Promise<object> },
 *   legacyListIds: {
 *     MSEModulos: {listId:string}, MSEMenu: {listId:string},
 *     MSEExtensoes: {listId:string}, MSEModulosMenu: {listId:string},
 *     MSEMenuTipos: {listId:string}
 *   },
 *   client: { getListItems: Function, request: Function },
 *   confirm: (plan: object) => (boolean | Promise<boolean>),
 *   exportPath: string,
 *   writeFileImpl?: Function,
 *   mkdirImpl?: Function,
 *   nowImpl?: () => Date
 * }} options
 * @returns {Promise<{
 *   status: "decommissioned" | "cancelled",
 *   exportPath: string,
 *   listsDeleted: string[],
 *   fieldsDeleted: string[]
 * }>}
 */
export async function decommissionMseLegacyPt({
  installer,
  legacyListIds,
  client,
  confirm,
  exportPath,
  writeFileImpl = writeFile,
  mkdirImpl = mkdir,
  nowImpl = () => new Date()
} = {}) {
  if (!legacyListIds?.MSEModulos || !legacyListIds?.MSEMenu || !legacyListIds?.MSEExtensoes
    || !legacyListIds?.MSEModulosMenu || !legacyListIds?.MSEMenuTipos) {
    throw new TypeError(
      "legacyListIds deve informar MSEModulos, MSEMenu, MSEExtensoes, MSEModulosMenu e MSEMenuTipos."
    );
  }
  if (!client || typeof client.getListItems !== "function" || typeof client.request !== "function") {
    throw new TypeError("client deve expor getListItems(list, options) e request(path, options).");
  }
  if (typeof confirm !== "function") {
    throw new TypeError("O decomissionamento exige um callback confirm(plan) explícito, no mesmo padrão dos demais scripts de tools/.");
  }
  if (typeof exportPath !== "string" || !exportPath.trim()) {
    throw new TypeError("exportPath é obrigatório — caminho local (fora do repositório) do dump de segurança.");
  }

  // Salvaguarda 1: gate só de leitura — qualquer divergência cancela tudo
  // antes de qualquer escrita.
  const verification = await verifyMseSchemaMigration({ installer, legacyListIds, client });
  if (verification.ok !== true) {
    const error = new Error(
      "verifyMseSchemaMigration reportou divergências (ok=false); decomissionamento abortado antes de qualquer exclusão. " +
      "Revise o relatório (error.report) e reconcilie os dados antes de tentar novamente."
    );
    error.report = verification;
    throw error;
  }

  // Salvaguarda 2: dump de segurança ANTES de qualquer DELETE.
  const legacyData = await readLegacyMseData(client, legacyListIds);
  const menuTipos = await readLegacyMenuTipos(client, legacyListIds.MSEMenuTipos);
  const dump = deepFreeze({
    exportedAt: nowImpl().toISOString(),
    modulos: legacyData.modulos,
    extensoes: legacyData.extensoes,
    modulosMenu: legacyData.modulosMenu,
    menuTipos,
    // Id/Title/Alias + os 9 campos PT de cada item de MSEMenu (ver select de
    // readLegacyMseData) — o suficiente para reconstrução manual, sem
    // precisar re-derivar nada dos campos EN.
    menuPtFields: legacyData.menu
  });
  await mkdirImpl(dirname(exportPath), { recursive: true });
  await writeFileImpl(exportPath, JSON.stringify(dump, null, 2), "utf8");

  // Salvaguarda 3: confirm(plan) explícito, plano com contagens para revisão.
  const plan = deepFreeze({
    ...buildDecommissionPlan(),
    exportPath,
    counts: {
      modulos: legacyData.modulos.length,
      extensoes: legacyData.extensoes.length,
      modulosMenu: legacyData.modulosMenu.length,
      menuTipos: menuTipos.length,
      menu: legacyData.menu.length
    }
  });
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", exportPath, listsDeleted: [], fieldsDeleted: [] });
  }

  const listsDeleted = [];
  const listTargets = [
    { internalName: "MSEModulos", listId: legacyListIds.MSEModulos.listId },
    { internalName: "MSEExtensoes", listId: legacyListIds.MSEExtensoes.listId },
    { internalName: "MSEModulosMenu", listId: legacyListIds.MSEModulosMenu.listId },
    { internalName: "MSEMenuTipos", listId: legacyListIds.MSEMenuTipos.listId }
  ];
  for (const { internalName, listId } of listTargets) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await client.request(listApiPathForId(listId), { method: "DELETE", etag: "*", allowWildcardEtag: true });
      listsDeleted.push(internalName);
    } catch (error) {
      if (error?.code !== "not-found") throw error;
      // Lista já ausente — idempotente, nada a fazer.
    }
  }

  const fieldsDeleted = [];
  const menuListId = legacyListIds.MSEMenu.listId;
  for (const fieldName of MENU_PT_FIELDS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await client.request(`${listApiPathForId(menuListId)}/fields/getbyinternalnameortitle('${fieldName}')`, {
        method: "DELETE", etag: "*", allowWildcardEtag: true
      });
      fieldsDeleted.push(fieldName);
    } catch (error) {
      if (error?.code !== "not-found") throw error;
      // Campo já ausente — idempotente, nada a fazer.
    }
  }

  return Object.freeze({ status: "decommissioned", exportPath, listsDeleted, fieldsDeleted });
}
