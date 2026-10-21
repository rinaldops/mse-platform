// mse-platform/tools/migrate-camap-activate-tema-01.js
//
// Ativa o Tema 1 (`CAMAP-AGP/templates/camap-tema-01`) como template real do
// site: localiza o item ÚNICO de `MSEConfiguracoes` com `Escopo === "Global"`
// e, se seu campo `Tema` ainda não for `"camap-tema-01"`, propõe um UPDATE
// (nunca um CREATE de um segundo item Global) setando SÓ esse campo — os
// demais (`Layout`, `ConfiguracaoJson`, etc.) permanecem inalterados. Modelo
// mínimo de template desta rodada: 1 template ativo por site, trocável pelo
// gestor via `MSEConfiguracoes.Tema` (escopo Global) — ver
// `kernel/application.js` e `host-adapters/modern-script-editor/
// site-boot.js`.
//
// Pré-condição validada em runtime, nunca assumida: deve haver EXATAMENTE 1
// item com `Escopo="Global"` em `MSEConfiguracoes`. 0 ou mais de 1 é
// reportado como erro recuperável (lança `Error` com mensagem clara, sem
// gravar nada), nunca uma gravação às cegas nem a criação de um item global
// alternativo.
//
// Mesmo padrão do resto de `tools/` (ver `migrate-camap-home.js`,
// `migrate-camap-content-routes.js`): `buildX()` função pura e congelada que
// descreve o plano sem rede, e `migrateX({ client, listIds, confirm })` que
// aplica de fato — só grava atrás de `confirm(plan)` explícito. Standalone:
// duplica `odataLiteral` localmente em vez de importar de outro script de
// `tools/`, mesmo princípio de auditabilidade isolada já usado pelos scripts
// irmãos.

const TARGET_THEME = "camap-tema-01";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Dados puros do plano de ativação: só o valor-alvo do campo `Tema` do item
 * Global de `MSEConfiguracoes` e o filtro usado para localizá-lo. Sem rede,
 * sem `Id` (resolvido em runtime pela própria migração).
 *
 * @returns {{
 *   list: "MSEConfiguracoes",
 *   scopeFilter: { Escopo: "Global" },
 *   values: { Tema: string }
 * }}
 */
export function buildActivateTema01Migration() {
  return deepFreeze({
    list: "MSEConfiguracoes",
    scopeFilter: { Escopo: "Global" },
    values: { Tema: TARGET_THEME }
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/**
 * Aplica `buildActivateTema01Migration()` contra o tenant real.
 *
 * Fluxo:
 * 1. `confirm(plan)` explícito, antes de qualquer leitura/gravação (mesmo
 *    padrão de `migrateCamapHome`/`migrateCamapContentRoutes`).
 * 2. Busca em `listIds.MSEConfiguracoes` os itens com `Escopo eq 'Global'`.
 *    Exige exatamente 1 resultado — 0 ou mais de 1 lança `Error` sem gravar
 *    nada (pré-condição real, nunca assumida).
 * 3. Se o item encontrado já tiver `Tema === "camap-tema-01"`, não grava
 *    nada (`status: "already-active"`, idempotência de verdade).
 * 4. Senão, busca a ETag atual via `getListItem` (única forma de obter uma
 *    ETag válida — mesmo princípio de `migrate-camap-home.js#upsertByKey`) e
 *    faz `updateListItem(list, id, { Tema: "camap-tema-01" }, { etag })` —
 *    só o campo `Tema` é enviado, preservando `Layout`/`ConfiguracaoJson`/
 *    demais campos do item existente inalterados.
 *
 * @param {{
 *   client: {
 *     getListItems: Function, getListItem: Function, updateListItem: Function
 *   },
 *   listIds: { MSEConfiguracoes: {listId:string}|string },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "activated" | "already-active" | "cancelled",
 *   itemId: number | null
 * }>}
 */
export async function migrateActivateTema01({ client, listIds, confirm } = {}) {
  if (!client
    || typeof client.getListItems !== "function"
    || typeof client.getListItem !== "function"
    || typeof client.updateListItem !== "function") {
    throw new TypeError(
      "client deve expor getListItems(list, options), getListItem(list, id, options) e " +
      "updateListItem(list, id, values, options)."
    );
  }
  if (!listIds || !listIds.MSEConfiguracoes) {
    throw new TypeError("listIds deve informar MSEConfiguracoes (listId ou título — ver core/rest.js#listApiPath).");
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de migrateCamapHome."
    );
  }

  const plan = buildActivateTema01Migration();
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", itemId: null });
  }

  const list = listIds.MSEConfiguracoes;
  const found = await client.getListItems(list, {
    select: ["Id", "Escopo", "Tema"],
    filter: `Escopo eq ${odataLiteral(plan.scopeFilter.Escopo)}`,
    top: 5 // só precisamos distinguir 0 / 1 / >1; nenhum tenant real deveria se aproximar deste teto
  });
  if (!Array.isArray(found)) {
    throw new Error("getListItems(MSEConfiguracoes) retornou um formato inesperado.");
  }
  if (found.length === 0) {
    throw new Error(
      'Nenhum item com Escopo="Global" encontrado em MSEConfiguracoes — não é seguro ativar o Tema 1 ' +
      "sem o item de configuração global existente."
    );
  }
  if (found.length > 1) {
    throw new Error(
      `${found.length} itens com Escopo="Global" encontrados em MSEConfiguracoes — esperado exatamente 1; ` +
      "corrija o dado antes de ativar o Tema 1."
    );
  }

  const globalItem = found[0];
  if (globalItem.Tema === TARGET_THEME) {
    return Object.freeze({ status: "already-active", itemId: globalItem.Id });
  }

  const { etag } = await client.getListItem(list, globalItem.Id, { select: ["Escopo"] });
  await client.updateListItem(list, globalItem.Id, plan.values, { etag });
  return Object.freeze({ status: "activated", itemId: globalItem.Id });
}
