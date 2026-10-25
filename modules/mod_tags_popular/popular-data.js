/**
 * Serviço de leitura + agregação de tags para o módulo de posição
 * `mod_tags_popular`.
 *
 * Reaproveita a infraestrutura já pronta da Wave 2: `kernel/articles-data.js`
 * (`resolveArticlesList`/`createArticlesReadService`) para ler os artigos já
 * mapeados para o shape de domínio (ver `kernel/article-mapper.js`), e
 * `kernel/content-services.js` (`filterPublished`, `aggregateTagCounts`)
 * para a filtragem/agregação em si — nenhuma lógica de REST/filtro é
 * duplicada aqui.
 *
 * Correspondência com os parâmetros reais de `mod_tags_popular.xml`
 * (Joomla!, ver `web-devs/JOOMLA/modules/mod_tags_popular/mod_tags_popular.xml`):
 * - `maximum` → `maximum` (qtd. de tags exibidas).
 * - `timeframe` → `timeframe` (`"all"|"year"|"month"|"week"`; filtra os
 *   ARTIGOS por `criadoEm` dentro da janela antes de agregar — não existe
 *   uma data própria de "quando a tag foi usada" no shape de artigo, então
 *   a janela é aplicada sobre `criadoEm` do artigo, como instruído).
 * - `order_value`/`order_direction` → `orderValue`/`orderDirection`
 *   (ordena por `"title"` (nome da tag) ou `"count"` (contagem), asc/desc).
 * - `display_count` → `displayCount` (repassado à view).
 * - `no_results_text` → `noResultsText` (repassado à view).
 * - `cloud`/`minsize`/`maxsize` → `cloud`/`minSize`/`maxSize` (nuvem
 *   aproximada por 5 níveis de tamanho — ver `popular-view.js`).
 * - `parentTag` fica FORA do MVP: MSETags não é hierárquico (ver
 *   `kernel/schemas/mse-tags.js` e `popular-settings-schema.js`).
 * - `layout`/`moduleclass_sfx`/`owncache`/`cache_time` ficam fora do MVP:
 *   sem mecanismo de layout alternativo/cache próprio por módulo hoje.
 */

import { resolveArticlesList, createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, aggregateTagCounts } from "../../kernel/content-services.js";

const TIMEFRAME_MS = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
};

/**
 * Resolve `services.adminClient` + a lista de artigos (via
 * `resolveArticlesList`) e devolve o serviço de leitura pronto — mesmo
 * contrato de `modules/mod_menu/menu-data.js`/`modules/mod_breadcrumbs/breadcrumbs-data.js`,
 * adaptado para a lista de artigos (em vez de MSEMenu).
 *
 * @param {object} services
 * @returns {{ listArticles: () => Promise<object[]> }}
 */
export function readArticlesService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError(
      "services.adminClient e a lista de artigos (services.listIds) são obrigatórios para o módulo de Tags populares."
    );
  }
  return createArticlesReadService({ client, list });
}

/**
 * Restringe `artigos` à janela de `timeframe`, comparando `criadoEm` contra
 * `agora`. `timeframe === "all"` (ou qualquer valor desconhecido) não
 * restringe nada.
 *
 * @param {Array<object>} artigos
 * @param {"all"|"year"|"month"|"week"} timeframe
 * @param {Date} agora
 * @returns {Array<object>}
 */
function filterByTimeframe(artigos, timeframe, agora) {
  const windowMs = TIMEFRAME_MS[timeframe];
  if (!windowMs) return artigos;
  const limite = agora.getTime() - windowMs;
  return artigos.filter((artigo) => {
    const criadoEm = artigo?.criadoEm ? new Date(artigo.criadoEm) : null;
    return criadoEm && !Number.isNaN(criadoEm.getTime()) && criadoEm.getTime() >= limite;
  });
}

function compareByOrder(orderValue, orderDirection) {
  const sign = orderDirection === "asc" ? 1 : -1;
  if (orderValue === "title") {
    return (a, b) => sign * a.tag.localeCompare(b.tag);
  }
  return (a, b) => sign * (a.count - b.count);
}

/**
 * Monta a lista de tags populares a partir de `artigos` já carregados —
 * função pura, sem rede, reaproveitada tanto pelo serviço de leitura quanto
 * pelos testes.
 *
 * @param {Array<object>} artigos
 * @param {{
 *   maximum?: number,
 *   timeframe?: "all"|"year"|"month"|"week",
 *   orderValue?: "title"|"count",
 *   orderDirection?: "asc"|"desc",
 *   agora?: Date|string|number
 * }} [options]
 * @returns {Array<{ tag: string, count: number }>}
 */
export function buildPopularTags(artigos, {
  maximum = 5,
  timeframe = "all",
  orderValue = "count",
  orderDirection = "desc",
  agora = new Date()
} = {}) {
  const now = agora instanceof Date ? agora : new Date(agora);
  const publicados = filterPublished(artigos);
  const dentroDaJanela = filterByTimeframe(publicados, timeframe, now);
  const contagens = aggregateTagCounts(dentroDaJanela);
  const ordenado = [...contagens].sort(compareByOrder(orderValue, orderDirection));
  const limite = maximum > 0 ? maximum : contagens.length;
  return ordenado.slice(0, limite);
}
