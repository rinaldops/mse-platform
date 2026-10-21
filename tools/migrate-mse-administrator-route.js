// mse-platform/tools/migrate-mse-administrator-route.js
//
// Propõe a rota de menu e o registro de extensão necessários para o
// Administrator (painel administrativo estilo Joomla!, `components/com_cpanel/`,
// Site Kernel Fase 5 — ver mse-platform/docs/PLANO-SITE-KERNEL-MSE.md
// seção 5) aparecer no site real:
//
// - Em `MSEMenu`: um item com `Alias: "administrator"` apontando para o
//   Component `"administrator"`, View `"controlpanel"` (a tela inicial do
//   Administrator, `components/com_cpanel/control-panel.js`).
// - Em `MSEExtensions`: um registro `Type: "Component"`, `Element:
//   "administrator"`, habilitado e protegido (o Administrator não pode ser
//   desabilitado pelo próprio gestor através da sua própria UI — mesmo
//   princípio de proteção documentado em `kernel/schemas/mse-extensions.js`
//   para extensões essenciais).
//
// Correção de 21/10/2026 (descoberta ao revisar o "próximo passo" de
// `docs/ADMINISTRATOR-OPERACOES.md`): este script gravava, originalmente, só
// os nomes de lista/campo em PORTUGUÊS antigos (`MSEExtensoes`, `TipoMenu`,
// `Caminho`, `Nivel`, `Ordem`, `Componente`, `Visao`, `Padrao`, `AbrirEm`,
// `Estado`, `Tipo`, `Elemento`, `Habilitado`, `Protegido`) — escritos antes da
// normalização Joomla! (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`) e nunca
// atualizados por ela. O código consumidor real já lê SÓ os campos em inglês
// (`kernel/extension-registry.js#isEnabled` lê `MSEExtensions.Element`/
// `.Enabled`; `kernel/menu.js#findActiveMenuItem` e
// `kernel/dispatcher.js#resolveDispatch` leem `MSEMenu.Published`/
// `.Component`/`.View`, nunca os campos PT) — rodar a versão antiga deste
// script contra o tenant real criaria um item de menu/extensão que o kernel
// NUNCA reconheceria como a rota do Administrator, falhando silenciosamente.
// Corrigido para gravar diretamente nos campos em inglês já normalizados.
//
// Decisões desta migração (sem especificação exata no pedido original,
// registradas aqui para rastreabilidade):
// - `MenuType: "system"` — nenhum item real de `MSEMenu` lido neste
//   repositório usa outro valor que não "principal" (ver
//   `tools/migrate-camap-home.js`/`migrate-camap-content-routes.js`); como o
//   Administrator não é um item do menu principal de navegação do site
//   público, foi escolhido um valor descritivo e distinto ("system") em vez
//   de reaproveitar "principal", para permitir no futuro listar/filtrar itens
//   de sistema separadamente dos itens de navegação do site. Ajustável sem
//   custo nesta fase (o campo não é validado por referência a
//   `MSEMenuTypes`, ver `kernel/schemas/mse-menu.js#MSE_MENU_SCHEMA.MenuType`).
// - `Level: 1`, `Ordering: 0`, `ParentId: 0` — item raiz, sem posição
//   relativa relevante (não aparece em nenhuma navegação visual que dependa
//   de ordem).
// - `Target: "SameTab"`, `Published: "Published"` — valores padrão já usados
//   por toda rota real de `MSEMenu` neste repositório.
// - `Default: false` — o Administrator nunca deve ser a Home do site.
// - Em `MSEExtensions`: `Version`/`Ordering`/`ParamsJson` ficam ausentes
//   (nenhum é `required` em `MSE_EXTENSIONS_SCHEMA`); `Enabled: true`,
//   `Protected: true` (ver acima).
//
// Mesmo padrão de todo o resto de `tools/` (ver `migrate-camap-home.js`,
// `migrate-camap-activate-tema-01.js`): `buildX()` função pura e congelada
// que descreve o plano sem rede, e `migrateX({ client, listIds, confirm })`
// que aplica de fato — só grava atrás de `confirm(plan)` explícito.
// Idempotente por chave natural (`MSEMenu.Alias`, `MSEExtensions.Element`),
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
 * `MSEExtensions` que tornam o Administrator navegável/conhecido pelo site.
 * Sem rede, sem `Id` (resolvido em runtime pela própria migração).
 *
 * @returns {{
 *   MSEMenu: { keyField: "Alias", values: object },
 *   MSEExtensions: { keyField: "Element", values: object }
 * }}
 */
export function buildMseAdministratorRouteMigration() {
  return deepFreeze({
    MSEMenu: {
      keyField: "Alias",
      values: {
        Title: "Administrator",
        Alias: "administrator",
        MenuType: "system",
        ParentId: 0,
        Path: "administrator",
        Level: 1,
        Ordering: 0,
        Component: "administrator",
        View: "controlpanel",
        ParamsJson: "{}",
        Default: false,
        Target: "SameTab",
        Published: "Published"
      }
    },
    MSEExtensions: {
      keyField: "Element",
      values: {
        Title: "Administrator",
        Type: "Component",
        Element: "administrator",
        Enabled: true,
        Protected: true
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
 * `Alias`) e/ou o de `MSEExtensions` (por `Element`) já existir, não propõe
 * duplicata — só cria o(s) que estiver(em) ausente(s).
 *
 * @param {{
 *   client: { getListItems: Function, createListItem: Function },
 *   listIds: { MSEMenu: {listId:string}|string, MSEExtensions: {listId:string}|string },
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
  if (!listIds || !listIds.MSEMenu || !listIds.MSEExtensions) {
    throw new TypeError(
      "listIds deve informar MSEMenu e MSEExtensions (listId ou título — ver core/rest.js#listApiPath)."
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
    listIds.MSEExtensions,
    plan.MSEExtensions.keyField,
    plan.MSEExtensions.values
  );

  return Object.freeze({ status: "migrated", menu, extension });
}
