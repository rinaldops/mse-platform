// mse-platform/tools/migrate-camap-content-routes.js
//
// Fase C4 do plano (`CAMAP-AGP/docs/PLANO-ARQUITETURA-MINI-JOOMLA.md` §3): as
// 3 rotas de menu ainda faltantes do mapeamento ("Destaques", "Em foco",
// "Agenda e eventos") passam a existir em `MSEMenu`, todas apontando para o
// mesmo Componente BLOG já migrado (ver `migrate-camap-institutional-drafts.js`
// para as outras 5 rotas e para o inventário C1 completo):
//
//   - "destaques" (`#/destaques`): Visao "list" sem nenhum filtro
//     (ParamsJson:"{}") — a ordenação padrão de `core.js#published()` (sem
//     `ordenarPor`) já é `Destaque desc,OrdemDestaque asc,DataPublicacao
//     desc`, então a lista "geral" já nasce com os destaques no topo. Não
//     precisa de nenhuma mudança de código em blog.js/module.js para
//     funcionar — só desta migração de dados (confirmado por leitura de
//     `core/core.js#published` e `modules/blog/blog.js#renderList`).
//   - "em-foco" (`#/em-foco`): Visao "list" com
//     ParamsJson:'{"destaque":"somente"}' — depende da mudança de código
//     feita nesta mesma rodada em `CAMAP-AGP/modules/blog/module.js`
//     (lê `context.params?.destaque` para dentro de `routing.destaque`) e
//     `CAMAP-AGP/modules/blog/blog.js#renderList` (repassa
//     `routing.destaque` para `core.published({destaque, ...})`).
//   - "agenda" (`#/agenda`): Visao "list" com
//     ParamsJson:'{"categoria":"Agenda"}' — reaproveita o mesmo mecanismo de
//     categoria fixa já usado por "servicos-e-processos"/"docs-e-padroes"
//     (D2, ver `migrate-camap-institutional-drafts.js`), sem nenhuma mudança
//     de código adicional.
//
// Diferente de `migrate-camap-institutional-drafts.js`, esta migração NÃO
// cria nenhuma `CAMAPPublicacoes` nova (as 3 rotas de lista filtram
// publicações que já existem ou serão cadastradas manualmente depois) e tem
// um segundo objetivo, independente das 3 linhas de menu: a categoria
// "Agenda" já existe hoje em `CAMAPCategorias` (criada manualmente antes
// desta rodada) mas com `Slug:null`/`Ativo:null` — sem isso a rota "agenda"
// resolveria mecanicamente mas filtraria uma lista vazia por engano de dados,
// não por falta de conteúdo. Por isso o backfill busca essa linha por
// `Title eq 'Agenda'` (não por `Slug`, que é exatamente o campo ausente) e
// faz UPDATE, nunca um `createListItem` novo — duplicar essa linha seria o
// pior resultado possível (2 categorias "Agenda" divergentes). Só cria uma
// linha nova no caso defensivo (não esperado) de a busca por Title não
// encontrar nada.
//
// Mesmo padrão de todo o resto de `tools/` (ver cabeçalho de
// `migrate-camap-institutional-drafts.js`): `buildX()` puro e congelado +
// `migrateX({ client, listIds, confirm })` idempotente, só grava atrás de
// `confirm` explícito. Standalone: duplica os helpers locais
// (`odataLiteral`/`findItemByKey`/`createIfMissing`) em vez de importar de
// outro script de `tools/` — cada script é auditável isoladamente.

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Dados puros da migração: as 3 linhas de `MSEMenu` ainda faltantes do
 * mapeamento de §3 do plano, e o alvo do backfill de `CAMAPCategorias`
 * ("Agenda"). `Ordem` continua a sequência já usada em
 * `migrate-camap-institutional-drafts.js#buildCamapInstitutionalDraftsMigration`
 * (10/20/30/40/50 para quem-somos/nossa-estrutura/servicos-e-processos/
 * docs-e-padroes/contatos) — aqui seguimos de 60 em diante, na mesma ordem
 * em que aparecem em §3 da tabela do plano (Destaques, Em foco, Agenda).
 *
 * `menuBlueprint` já traz o `ParamsJson` final (diferente de
 * `migrate-camap-institutional-drafts.js`, nenhuma destas 3 rotas depende de
 * um `Id` nativo resolvido em fase anterior — todos os filtros são por texto
 * fixo, já conhecidos estaticamente).
 *
 * @returns {{
 *   menuBlueprint: Array<{ Alias: string, Title: string, Ordem: number, ParamsJson: string }>,
 *   agendaCategoriaBackfill: { Title: string, Slug: string, Ativo: boolean }
 * }}
 */
export function buildCamapContentRoutesMigration() {
  return deepFreeze({
    // --- MSEMenu: 3 linhas novas, mesmo shape de campos usado pelas 5 rotas
    // já migradas em migrate-camap-institutional-drafts.js (Componente/Visao
    // fixos aqui porque as 3 rotas são sempre BLOG/"list"; TipoMenu/Nivel/
    // Padrao/AbrirEm/Estado replicam exatamente o padrão confirmado ali).
    menuBlueprint: [
      { Alias: "destaques", Title: "Destaques", Ordem: 60, ParamsJson: "{}" },
      { Alias: "em-foco", Title: "Em foco", Ordem: 70, ParamsJson: JSON.stringify({ destaque: "somente" }) },
      { Alias: "agenda", Title: "Agenda e eventos", Ordem: 80, ParamsJson: JSON.stringify({ categoria: "Agenda" }) }
    ],

    // --- CAMAPCategorias: backfill da linha "Agenda" já existente (ver
    // cabeçalho do arquivo) — nunca uma linha nova no caminho feliz.
    agendaCategoriaBackfill: { Title: "Agenda", Slug: "agenda", Ativo: true }
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/**
 * Busca o item de `list` cujo `keyField` casa com `keyValue`, trazendo também
 * `Id` e os campos de `extraSelect`. Devolve `null` quando não encontrado —
 * nunca lança por ausência. Mesma função (não reimportada de propósito — ver
 * cabeçalho) de `migrate-camap-institutional-drafts.js#findItemByKey`.
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {string} keyField
 * @param {unknown} keyValue
 * @param {string[]} [extraSelect]
 * @returns {Promise<object|null>}
 */
async function findItemByKey(client, list, keyField, keyValue, extraSelect = []) {
  const select = [...new Set(["Id", keyField, ...extraSelect])];
  const found = await client.getListItems(list, {
    select,
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(found) && found.length > 0 ? found[0] : null;
}

/**
 * Cria o item (chave `keyField`/`keyValue`) se ainda não existir; devolve o
 * `Id` nativo em qualquer um dos dois casos (encontrado ou recém-criado).
 * Mesma função de `migrate-camap-institutional-drafts.js#createIfMissing`.
 *
 * @returns {Promise<{ id: number, created: boolean }>}
 */
async function createIfMissing(client, list, keyField, values) {
  const keyValue = values[keyField];
  const existing = await findItemByKey(client, list, keyField, keyValue, ["Id"]);
  if (existing) return { id: existing.Id, created: false };
  const { item } = await client.createListItem(list, values);
  if (item?.Id == null) {
    throw new Error(`createListItem não devolveu Id para "${keyValue}" (keyField ${keyField}).`);
  }
  return { id: item.Id, created: true };
}

/**
 * Backfill especial da categoria "Agenda" (ver cabeçalho do arquivo): busca
 * por `Title eq 'Agenda'` (não por `Slug`, que é exatamente o campo que falta
 * preencher) e faz UPDATE em `Slug`/`Ativo` só se encontrada. Diferente de
 * `createIfMissing` (que casa por valor EXATO de chave e nunca atualiza um
 * item já encontrado), esta função deliberadamente faz upsert por valor —
 * mesmo princípio de "atualizar se divergente" (e mesma mecânica de ETag) de
 * `migrate-camap-home.js#upsertByKey`: não duplica a linha, mas corrige um
 * valor incorreto/ausente. Não sobrescreve `Slug`/`Ativo` quando já estão
 * exatamente nos valores alvo (evita um MERGE sem efeito nenhum e deixa a
 * ação "skipped" refletir a realidade do dado, não só da existência da
 * linha). `core/rest.js#updateListItem` exige uma ETag válida, que só vem de
 * `getListItem`/`createListItem`/`updateListItem` (nunca de
 * `getListItems`) — por isso o passo extra de buscar a ETag atual antes do
 * MERGE, igual a `upsertByKey`.
 *
 * No caso defensivo (não esperado em produção, ver cabeçalho) de a busca por
 * `Title` não encontrar nada, cria uma linha nova com os valores alvo.
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {{ Title: string, Slug: string, Ativo: boolean }} target
 * @returns {Promise<{ action: "updated" | "skipped" | "created" }>}
 */
async function upsertAgendaCategoria(client, list, target) {
  const existing = await findItemByKey(client, list, "Title", target.Title, ["Slug", "Ativo"]);
  if (!existing) {
    await client.createListItem(list, target);
    return { action: "created" };
  }
  const alreadyCorrect = existing.Slug === target.Slug && existing.Ativo === target.Ativo;
  if (alreadyCorrect) return { action: "skipped" };
  const { etag } = await client.getListItem(list, existing.Id, { select: ["Title"] });
  await client.updateListItem(list, existing.Id, { Slug: target.Slug, Ativo: target.Ativo }, { etag });
  return { action: "updated" };
}

/**
 * Aplica `buildCamapContentRoutesMigration()` contra o tenant real.
 *
 * Fluxo:
 * 1. Backfill da categoria "Agenda" em `CAMAPCategorias` (ver
 *    `upsertAgendaCategoria` — UPDATE/CREATE, nunca duplica).
 * 2. Cria cada linha de `MSEMenu` só se `Alias` ainda não existir (mesmo
 *    padrão aditivo de `migrate-camap-institutional-drafts.js` — este script
 *    nunca re-sincroniza um item de menu já existente).
 *
 * @param {{
 *   client: {
 *     getListItems: Function, getListItem: Function,
 *     createListItem: Function, updateListItem: Function
 *   },
 *   listIds: {
 *     MSEMenu: {listId:string}|string,
 *     CAMAPCategorias: {listId:string}|string
 *   },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "migrated" | "cancelled",
 *   agendaCategoria: { action: "created"|"updated"|"skipped" } | null,
 *   menuItems: Array<{ key: string, action: "created"|"skipped" }>
 * }>}
 */
export async function migrateCamapContentRoutes({ client, listIds, confirm } = {}) {
  if (!client || typeof client.getListItems !== "function" || typeof client.getListItem !== "function"
    || typeof client.createListItem !== "function" || typeof client.updateListItem !== "function") {
    throw new TypeError(
      "client deve expor getListItems(list, options), getListItem(list, id, options), " +
      "createListItem(list, values) e updateListItem(list, id, values, options)."
    );
  }
  if (!listIds || !listIds.MSEMenu || !listIds.CAMAPCategorias) {
    throw new TypeError(
      "listIds deve informar MSEMenu e CAMAPCategorias (listId ou título — ver core/rest.js#listApiPath)."
    );
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de migrateCamapInstitutionalDrafts."
    );
  }

  const plan = buildCamapContentRoutesMigration();
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", agendaCategoria: null, menuItems: [] });
  }

  const agendaCategoria = await upsertAgendaCategoria(client, listIds.CAMAPCategorias, plan.agendaCategoriaBackfill);

  const menuItems = [];
  for (const { Alias, Title, Ordem, ParamsJson } of plan.menuBlueprint) {
    const menuValues = {
      Title, Alias, TipoMenu: "principal", Nivel: 1, Ordem,
      Componente: "blog", Visao: "list", ParamsJson,
      Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado"
    };
    // eslint-disable-next-line no-await-in-loop
    const existing = await findItemByKey(client, listIds.MSEMenu, "Alias", Alias);
    if (existing) {
      menuItems.push({ key: Alias, action: "skipped" });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await client.createListItem(listIds.MSEMenu, menuValues);
    menuItems.push({ key: Alias, action: "created" });
  }

  return Object.freeze({ status: "migrated", agendaCategoria, menuItems });
}
