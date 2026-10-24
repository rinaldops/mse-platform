/**
 * Serviço de leitura+busca de artigos para o módulo de posição
 * `mod_search` — equivalente MVP ao `mod_finder` real do Joomla! (caixa de
 * busca; no Joomla! real não existe um "mod_search" separado).
 *
 * Reaproveita `kernel/articles-data.js#resolveArticlesList` +
 * `createArticlesReadService` (mesmo contrato de serviços usado pela
 * família `mod_articles_*`: `services.adminClient` +
 * `services.listIds.<lista de artigos>`) — carrega a lista INTEIRA de
 * artigos uma única vez no mount do módulo, nunca por tecla digitada.
 *
 * `filterArticles` é a busca em si: puramente em memória, substring
 * case-insensitive por título, resumo OU alguma tag igual ao termo — sem
 * motor de indexação real (ver decisão de escopo em
 * `kernel/schemas/mse-search-filters.js`/`components/com_finder/README.md`).
 * Mesmo princípio simples de
 * `components/com_cpanel/administrator-toolbar.js` (busca client-side por
 * termo livre, sem filtros persistentes avançados).
 */

import { resolveArticlesList, createArticlesReadService } from "../../kernel/articles-data.js";

/**
 * @param {{ client: { getListItems: Function }, listIds?: object }} options
 * @returns {{ listArticles: () => Promise<object[]> } | null} `null` quando
 *   nenhuma lista de artigos conhecida está presente em `listIds` — quem
 *   chama decide como degradar (nunca lança).
 */
export function createSearchReadService({ client, listIds } = {}) {
  const list = resolveArticlesList(listIds);
  if (!client || typeof client.getListItems !== "function" || !list) return null;
  return createArticlesReadService({ client, list });
}

function matches(artigo, term) {
  if (String(artigo?.titulo ?? "").toLowerCase().includes(term)) return true;
  if (String(artigo?.resumo ?? "").toLowerCase().includes(term)) return true;
  return Array.isArray(artigo?.tags) && artigo.tags.some((tag) => String(tag ?? "").toLowerCase().includes(term));
}

/**
 * Filtra `artigos` (shape de domínio de `kernel/article-mapper.js`) pelo
 * termo informado — substring case-insensitive em título, resumo OU
 * alguma tag. Termo vazio/em branco devolve array vazio (sem resultado
 * "mostrar tudo" por padrão, mesmo princípio de uma caixa de busca real:
 * nada buscado ainda não tem resultado).
 *
 * @param {Array<object>} artigos
 * @param {string} term
 * @returns {Array<object>}
 */
export function filterArticles(artigos, term) {
  const normalized = String(term ?? "").trim().toLowerCase();
  if (!normalized) return [];
  return (Array.isArray(artigos) ? artigos : []).filter((artigo) => matches(artigo, normalized));
}
