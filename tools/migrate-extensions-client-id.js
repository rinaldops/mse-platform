// mse-platform/tools/migrate-extensions-client-id.js
//
// Backfill do campo `ClientId` (≈ Joomla! #__extensions.client_id) em
// MSEExtensions — ver kernel/schemas/mse-extensions.js, acrescentado junto
// com a auditoria pente-fino de 22/10/2026
// (docs/AUDITORIA-JOOMLA-PENTE-FINO.md): toda extensão era, até então,
// implicitamente "Site", sem distinção de Administrator. `ClientId` é
// `required: true` no schema (provisionado via `kernel/installer.js`), mas
// linhas JÁ EXISTENTES em produção nunca tiveram esse campo gravado —
// precisam de backfill explícito, não só criação.
//
// Plano (por `Element`, chave natural já usada por toda a lista):
//   - "administrator" (Type: "Component", ver
//     tools/migrate-mse-administrator-route.js) -> ClientId: "Administrator"
//     (única extensão hoje claramente do lado administrativo).
//   - Todas as demais linhas existentes (Component/Module/Plugin reais do
//     CAMAP-AGP, e as linhas Type: "Template" — camap-tema-01/camap-tema-02/
//     mse-default/system — criadas por
//     tools/migrate-create-template-styles.js) -> ClientId: "Site" (mesmo
//     valor do `defaultValue` do schema, gravado explicitamente em vez de
//     confiar em provisionamento retroativo de campo novo).
//
// Mesmo padrão do resto de `tools/` (ver `migrate-camap-activate-tema-01.js`,
// `migrate-create-template-styles.js`): `buildX()` função pura e congelada
// que descreve o plano sem rede, e `migrateX({ client, listIds, confirm })`
// que aplica de fato — só grava atrás de `confirm(plan)` explícito.
// Idempotente por `Element`: uma linha que já tem o `ClientId` esperado é
// pulada (`action: "skipped"`), nunca regravada; uma linha com `ClientId`
// DIFERENTE do esperado também é pulada, sem sobrescrever — este script só
// preenche o campo ausente/nulo, nunca corrige uma classificação manual já
// feita por um gestor (ver `shouldBackfill` abaixo).
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

const ADMINISTRATOR_ELEMENT = "administrator";

/**
 * Dados puros do plano de backfill: o valor-alvo de `ClientId` por
 * `Element` conhecido hoje, e o valor-alvo padrão ("Site") para qualquer
 * outro `Element` não listado explicitamente. Sem rede, sem `Id` (resolvido
 * em runtime pela própria migração, a partir do que `MSEExtensions` já
 * tiver).
 *
 * @returns {{
 *   defaultClientId: "Site",
 *   overridesByElement: Record<string, "Site"|"Administrator">
 * }}
 */
export function buildExtensionsClientIdMigration() {
  return deepFreeze({
    defaultClientId: "Site",
    overridesByElement: {
      [ADMINISTRATOR_ELEMENT]: "Administrator"
    }
  });
}

function expectedClientId(plan, elemento) {
  return plan.overridesByElement[elemento] ?? plan.defaultClientId;
}

/**
 * Aplica `buildExtensionsClientIdMigration()` contra o tenant real, só atrás
 * de `confirm(plan)` explícito (mesmo padrão de
 * `migrateActivateTema01`/`migrateCreateTemplateStyles`).
 *
 * Fluxo por item lido de `MSEExtensions`:
 * 1. Resolve `expectedClientId` (override por `Element`, ou `"Site"` por
 *    padrão).
 * 2. Se `item.ClientId` já for exatamente esse valor, pula
 *    (`action: "skipped"`) — idempotente, inclusive numa segunda execução
 *    completa do script.
 * 3. Se `item.ClientId` já tiver QUALQUER outro valor não vazio (uma
 *    classificação manual prévia, feita por um gestor via
 *    `com_extensions`), também pula — este script só preenche AUSÊNCIA de
 *    dado, nunca corrige/sobrescreve uma escolha já feita.
 * 4. Só grava (`action: "updated"`) quando `item.ClientId` está
 *    ausente/nulo/vazio — busca a ETag atual via `getListItem` (única forma
 *    de obter uma ETag válida, mesmo princípio de
 *    `migrate-camap-activate-tema-01.js`) e faz
 *    `updateListItem(list, id, { ClientId }, { etag })`.
 *
 * @param {{
 *   client: {
 *     getListItems: Function, getListItem: Function, updateListItem: Function
 *   },
 *   listIds: { MSEExtensions: {listId:string}|string },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "migrated" | "cancelled",
 *   items: Array<{ id: number, element: string, action: "updated"|"skipped", clientId: string|null }>
 * }>}
 */
export async function migrateExtensionsClientId({ client, listIds, confirm } = {}) {
  if (!client
    || typeof client.getListItems !== "function"
    || typeof client.getListItem !== "function"
    || typeof client.updateListItem !== "function") {
    throw new TypeError(
      "client deve expor getListItems(list, options), getListItem(list, id, options) e " +
      "updateListItem(list, id, values, options)."
    );
  }
  if (!listIds || !listIds.MSEExtensions) {
    throw new TypeError("listIds deve informar MSEExtensions (listId ou título — ver core/rest.js#listApiPath).");
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de migrateCamapHome."
    );
  }

  const plan = buildExtensionsClientIdMigration();
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", items: [] });
  }

  const list = listIds.MSEExtensions;
  const found = await client.getListItems(list, {
    select: ["Id", "Element", "ClientId"],
    top: 5000
  });
  if (!Array.isArray(found)) {
    throw new Error("getListItems(MSEExtensions) retornou um formato inesperado.");
  }

  const items = [];
  for (const row of found) {
    const elemento = String(row?.Element ?? "");
    const target = expectedClientId(plan, elemento);
    const current = row?.ClientId == null || row.ClientId === "" ? null : String(row.ClientId);

    if (current === target) {
      items.push({ id: row.Id, element: elemento, action: "skipped", clientId: current });
      continue;
    }
    if (current !== null) {
      // Já tem um valor (diferente do esperado) gravado manualmente — não
      // sobrescreve uma classificação já feita por um gestor.
      items.push({ id: row.Id, element: elemento, action: "skipped", clientId: current });
      continue;
    }

    const { etag } = await client.getListItem(list, row.Id, { select: ["Element"] });
    await client.updateListItem(list, row.Id, { ClientId: target }, { etag });
    items.push({ id: row.Id, element: elemento, action: "updated", clientId: target });
  }

  return Object.freeze({ status: "migrated", items });
}
