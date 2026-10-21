// mse-platform/tools/migrate-mse-administrator-route.js
//
// Propõe a rota de menu e o registro de extensão necessários para o
// Administrator (painel administrativo estilo Joomla!, `administrator/`,
// Site Kernel Fase 5 — ver mse-platform/docs/PLANO-SITE-KERNEL-MSE.md
// seção 5) aparecer no site real:
//
// - Em `MSEMenu`: um item com `Alias: "administrator"` apontando para o
//   Componente `"administrator"`, Visão `"controlpanel"` (a tela inicial do
//   Administrator, `administrator/screens/control-panel.js`).
// - Em `MSEExtensoes`: um registro `Tipo: "Componente"`, `Elemento:
//   "administrator"`, habilitado e protegido (o Administrator não pode ser
//   desabilitado pelo próprio gestor através da sua própria UI — mesmo
//   princípio de proteção documentado em `kernel/schemas/mse-extensoes.js`
//   para extensões essenciais).
//
// Decisões desta migração (sem especificação exata no pedido original,
// registradas aqui para rastreabilidade):
// - `TipoMenu: "sistema"` — nenhum item real de `MSEMenu` lido neste
//   repositório usa outro valor que não "principal" (ver
//   `tools/migrate-camap-home.js`/`migrate-camap-content-routes.js`); como o
//   Administrator não é um item do menu principal de navegação do site
//   público, foi escolhido um valor descritivo e distinto ("sistema") em vez
//   de reaproveitar "principal", para permitir no futuro listar/filtrar itens
//   de sistema separadamente dos itens de navegação do site. Ajustável sem
//   custo nesta fase (o campo não é validado por referência a
//   `MSEMenuTipos`, ver `kernel/schemas/mse-menu.js#MSE_MENU_SCHEMA.TipoMenu`).
// - `Nivel: 1`, `Ordem: 0`, `ParentId: 0` — item raiz, sem posição relativa
//   relevante (não aparece em nenhuma navegação visual que dependa de
//   ordem).
// - `AbrirEm: "MesmaAba"`, `Estado: "Publicado"` — valores padrão já usados
//   por toda rota real de `MSEMenu` neste repositório.
// - `Padrao: false` — o Administrator nunca deve ser a Home do site.
// - Em `MSEExtensoes`: `Versao`/`Ordem`/`ParamsJson` ficam ausentes (nenhum
//   é `required` em `MSE_EXTENSOES_SCHEMA`); `Habilitado: true`,
//   `Protegido: true` (ver acima).
//
// Mesmo padrão de todo o resto de `tools/` (ver `migrate-camap-home.js`,
// `migrate-camap-activate-tema-01.js`): `buildX()` função pura e congelada
// que descreve o plano sem rede, e `migrateX({ client, listIds, confirm })`
// que aplica de fato — só grava atrás de `confirm(plan)` explícito.
// Idempotente por chave natural (`MSEMenu.Alias`, `MSEExtensoes.Elemento`),
// mesmo princípio de `createIfMissing` usado em
// `migrate-camap-content-routes.js`/`migrate-camap-institutional-drafts.js`
// (função replicada aqui localmente, não importada, pelo mesmo motivo de
// auditabilidade isolada já adotado pelos scripts irmãos).
//
// NUNCA aplicar este script contra o tenant real sem revisão humana — ver
// `confirm` abaixo.

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Dados puros do plano de migração: a linha de `MSEMenu` e o registro de
 * `MSEExtensoes` que tornam o Administrator navegável/conhecido pelo site.
 * Sem rede, sem `Id` (resolvido em runtime pela própria migração).
 *
 * @returns {{
 *   MSEMenu: { keyField: "Alias", values: object },
 *   MSEExtensoes: { keyField: "Elemento", values: object }
 * }}
 */
export function buildMseAdministratorRouteMigration() {
  return deepFreeze({
    MSEMenu: {
      keyField: "Alias",
      values: {
        Title: "Administrator",
        Alias: "administrator",
        TipoMenu: "sistema",
        ParentId: 0,
        Caminho: "administrator",
        Nivel: 1,
        Ordem: 0,
        Componente: "administrator",
        Visao: "controlpanel",
        ParamsJson: "{}",
        Padrao: false,
        AbrirEm: "MesmaAba",
        Estado: "Publicado"
      }
    },
    MSEExtensoes: {
      keyField: "Elemento",
      values: {
        Title: "Administrator",
        Tipo: "Componente",
        Elemento: "administrator",
        Habilitado: true,
        Protegido: true
      }
    }
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/**
 * Busca o item de `list` cujo `keyField` casa com `keyValue`, trazendo também
 * `Id`. Devolve `null` quando não encontrado — nunca lança por ausência.
 * Mesma função (não importada de propósito — ver cabeçalho) de
 * `migrate-camap-content-routes.js#findItemByKey`.
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {string} keyField
 * @param {unknown} keyValue
 * @returns {Promise<object|null>}
 */
async function findItemByKey(client, list, keyField, keyValue) {
  const found = await client.getListItems(list, {
    select: ["Id", keyField],
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(found) && found.length > 0 ? found[0] : null;
}

/**
 * Cria o item (chave `keyField`) em `list` se ainda não existir um item com
 * o mesmo valor de chave; não propõe/duplica nada se já existir. Mesma
 * função de `migrate-camap-content-routes.js#createIfMissing`.
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {string} keyField
 * @param {Record<string, unknown>} values
 * @returns {Promise<{ action: "created" | "skipped", id: number|null }>}
 */
async function createIfMissing(client, list, keyField, values) {
  const keyValue = values[keyField];
  const existing = await findItemByKey(client, list, keyField, keyValue);
  if (existing) return { action: "skipped", id: existing.Id };
  const { item } = await client.createListItem(list, values);
  if (item?.Id == null) {
    throw new Error(`createListItem não devolveu Id para "${keyValue}" (keyField ${keyField}).`);
  }
  return { action: "created", id: item.Id };
}

/**
 * Aplica `buildMseAdministratorRouteMigration()` contra o tenant real, só
 * atrás de `confirm(plan)` explícito (mesmo padrão de `migrateCamapHome`/
 * `migrateActivateTema01`). Idempotente: se o item de `MSEMenu` (por
 * `Alias`) e/ou o de `MSEExtensoes` (por `Elemento`) já existir, não propõe
 * duplicata — só cria o(s) que estiver(em) ausente(s).
 *
 * @param {{
 *   client: { getListItems: Function, createListItem: Function },
 *   listIds: { MSEMenu: {listId:string}|string, MSEExtensoes: {listId:string}|string },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "migrated" | "cancelled",
 *   menu: { action: "created"|"skipped", id: number|null },
 *   extension: { action: "created"|"skipped", id: number|null }
 * }>}
 */
export async function migrateMseAdministratorRoute({ client, listIds, confirm } = {}) {
  if (!client || typeof client.getListItems !== "function" || typeof client.createListItem !== "function") {
    throw new TypeError("client deve expor getListItems(list, options) e createListItem(list, values).");
  }
  if (!listIds || !listIds.MSEMenu || !listIds.MSEExtensoes) {
    throw new TypeError(
      "listIds deve informar MSEMenu e MSEExtensoes (listId ou título — ver core/rest.js#listApiPath)."
    );
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de migrateCamapHome."
    );
  }

  const plan = buildMseAdministratorRouteMigration();
  if (await confirm(plan) !== true) {
    return Object.freeze({
      status: "cancelled",
      menu: { action: "skipped", id: null },
      extension: { action: "skipped", id: null }
    });
  }

  const menu = await createIfMissing(client, listIds.MSEMenu, plan.MSEMenu.keyField, plan.MSEMenu.values);
  const extension = await createIfMissing(
    client,
    listIds.MSEExtensoes,
    plan.MSEExtensoes.keyField,
    plan.MSEExtensoes.values
  );

  return Object.freeze({ status: "migrated", menu, extension });
}
