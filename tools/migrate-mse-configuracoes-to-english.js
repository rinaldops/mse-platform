// mse-platform/tools/migrate-mse-configuracoes-to-english.js
//
// Fase 3b da normalização Joomla! (23/10/2026, ver
// docs/AUDITORIA-JOOMLA-PENTE-FINO.md §2.8 e docs/CONVENCAO-JOOMLA.md §5):
// preenche os 7 campos novos em inglês de `MSEConfiguracoes`
// (`Scope`/`Module`/`Theme`/`ConfigurationJson`/`Active`/`State`/
// `ExtensionElement`) a partir dos campos PT já existentes no mesmo
// registro — mesmo princípio de `tools/migrate-mse-schemas-to-english.js`
// para `MSEMenu`: UPDATE IN-PLACE (MERGE com ETag), nunca cria um item novo
// (o Id já existe, é a mesma linha), e só quando os valores EN ainda não
// baterem com os já gravados (idempotente).
//
// `Layout` já era neutro em nome (sem lista irmã) — só a choice PT
// ("Herdar") ganhou a equivalente EN ("Inherit"); este script NÃO altera
// `Layout` (o valor gravado por quem já usa "Herdar" continua válido,
// aceito por ambos os vocabulários). Os 4 campos sem consumidor confirmado
// (`TipoInstancia`/`VersaoConfiguracao`/`VersaoSettings`/`VersaoModulo`)
// também não são tocados — permanecem só em PT, fora desta rodada.
//
// Traduções de valor (`Choice`), fixas e puras (sem rede):
//   Escopo: Global→Global, Instancia→Instance, Extensao→Extension
//   Estado: Rascunho→Draft, Publicado→Published
//
// NUNCA aplicar este script contra o tenant real sem revisão humana — ver
// `confirm` abaixo (mesmo padrão de todo o resto de `tools/`).

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const SCOPE_PT_TO_EN = Object.freeze({
  Global: "Global",
  Instancia: "Instance",
  Extensao: "Extension"
});

const STATE_PT_TO_EN = Object.freeze({
  Rascunho: "Draft",
  Publicado: "Published"
});

function translateChoice(map, value, label) {
  if (value === null || value === undefined) return null;
  const translated = map[value];
  if (translated === undefined) {
    throw new Error(`Valor de ${label} sem tradução conhecida: "${value}".`);
  }
  return translated;
}

/**
 * Traduz um item real de `MSEConfiguracoes` (campos PT já no mesmo
 * registro) para os valores EM INGLÊS a acrescentar via UPDATE no mesmo
 * item (mesma lista, mesmo `Id` — nunca cria um item novo).
 *
 * @param {object} item Item real de MSEConfiguracoes (Id + campos PT).
 * @returns {{ Id: number, values: object }}
 */
export function translateConfiguracaoItem(item) {
  if (!Number.isInteger(item.Id)) throw new TypeError("item.Id (MSEConfiguracoes) deve ser um inteiro.");
  return deepFreeze({
    Id: item.Id,
    values: {
      Scope: translateChoice(SCOPE_PT_TO_EN, item.Escopo, "MSEConfiguracoes.Escopo"),
      Module: item.Modulo ?? null,
      Theme: item.Tema ?? null,
      ConfigurationJson: item.ConfiguracaoJson ?? "{}",
      Active: Boolean(item.Ativo),
      State: translateChoice(STATE_PT_TO_EN, item.Estado, "MSEConfiguracoes.Estado") ?? "Published",
      ExtensionElement: item.ExtensaoElemento ?? null
    }
  });
}

function valuesAlreadyMatch(item, values) {
  return Object.entries(values).every(([field, value]) => item?.[field] === value);
}

/**
 * Lê todos os itens reais de `MSEConfiguracoes` (campos PT + os campos EN já
 * existentes, para permitir a comparação de idempotência em
 * `migrateMseConfiguracoesToEnglish`).
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @returns {Promise<object[]>}
 */
export async function readMseConfiguracoes(client, list) {
  return client.getListItems(list, {
    select: ["Id", "Title", "Escopo", "Modulo", "Tema", "ConfiguracaoJson", "Ativo", "Estado", "ExtensaoElemento",
      "Scope", "Module", "Theme", "ConfigurationJson", "Active", "State", "ExtensionElement"]
  });
}

/**
 * Monta o plano puro de migração (sem rede) a partir dos itens já lidos —
 * útil para revisão humana via `confirm(plan)` antes de qualquer escrita.
 *
 * @param {object[]} items Itens reais de MSEConfiguracoes.
 * @returns {{ updates: Array<{ Id: number, values: object }> }}
 */
export function buildMseConfiguracoesMigrationPlan(items) {
  return deepFreeze({
    updates: items.map(translateConfiguracaoItem)
  });
}

/**
 * Aplica a migração de fato, só atrás de `confirm(plan)` explícito (mesmo
 * padrão de todo o resto de `tools/`). `listIds.MSEConfiguracoes` é
 * informado pelo chamador — mesmo princípio de
 * `tools/migrate-camap-activate-tema-01.js` (lista já provisionada pelo
 * `core/provisioning.js#provisionConfigurationList`).
 *
 * @param {{
 *   client: { getListItems: Function, getListItem: Function, updateListItem: Function },
 *   listIds: { MSEConfiguracoes: {listId:string}|string },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{ status: "migrated" | "cancelled", updated: number[] }>}
 */
export async function migrateMseConfiguracoesToEnglish({ client, listIds, confirm } = {}) {
  if (!client || typeof client.getListItems !== "function" || typeof client.getListItem !== "function"
    || typeof client.updateListItem !== "function") {
    throw new TypeError(
      "client deve expor getListItems(list, options), getListItem(list, id, options) e " +
      "updateListItem(list, id, values, options)."
    );
  }
  if (!listIds?.MSEConfiguracoes) {
    throw new TypeError("listIds deve informar MSEConfiguracoes (listId ou título — ver core/rest.js#listApiPath).");
  }
  if (typeof confirm !== "function") {
    throw new TypeError("A migração exige um callback confirm(plan) explícito, no mesmo padrão dos demais scripts de tools/.");
  }

  const list = listIds.MSEConfiguracoes;
  const items = await readMseConfiguracoes(client, list);
  if (!Array.isArray(items)) {
    throw new Error("getListItems(MSEConfiguracoes) retornou um formato inesperado.");
  }
  const plan = buildMseConfiguracoesMigrationPlan(items);
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", updated: [] });
  }

  const itemsById = new Map(items.map((item) => [item.Id, item]));
  const updated = [];
  for (const { Id, values } of plan.updates) {
    const current = itemsById.get(Id);
    if (valuesAlreadyMatch(current, values)) continue;
    // eslint-disable-next-line no-await-in-loop
    const { etag } = await client.getListItem(list, Id, { select: ["Id"] });
    // eslint-disable-next-line no-await-in-loop
    await client.updateListItem(list, Id, values, { etag });
    updated.push(Id);
  }

  return Object.freeze({ status: "migrated", updated });
}
