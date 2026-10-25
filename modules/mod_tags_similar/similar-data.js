/**
 * Serviço de leitura + resolução do artigo ativo + similares para o módulo
 * de posição `mod_tags_similar`.
 *
 * Reaproveita a infraestrutura já pronta da Wave 2: `kernel/articles-data.js`
 * (`resolveArticlesList`/`createArticlesReadService`) para ler os artigos já
 * mapeados para o shape de domínio, e `kernel/content-services.js`
 * (`filterPublished`, `sortByDate`) para a filtragem/ordenação — nenhuma
 * lógica de REST/filtro é duplicada aqui.
 *
 * Artigo ativo: resolvido a partir de `context.route` (`kernel/router.js`,
 * shape `{ alias, id, slug, query }`) — mesmo princípio de
 * `modules/mod_breadcrumbs/module.js` (que resolve o ITEM DE MENU ativo via
 * `kernel/menu.js#findActiveMenuItem`), mas aqui resolvendo o ARTIGO cujo
 * `id`/`slug` bate com `route.id`/`route.slug`, dentro da lista de artigos
 * já carregada. Quando não há artigo ativo identificável (ex.: página
 * inicial, `route.id` ausente), `findActiveArticle` devolve `null` — quem
 * chama (ver `module.js`) deve renderizar um estado vazio, nunca lançar.
 *
 * Correspondência com os parâmetros reais de `mod_tags_similar.xml`
 * (Joomla!, ver `web-devs/JOOMLA/modules/mod_tags_similar/mod_tags_similar.xml`):
 * - `maximum` → `maximum` (qtd. de artigos similares exibidos).
 * - `matchtype` → `matchType`: só `"any"` (qualquer tag em comum) é
 *   implementado no MVP — ver `similar-settings-schema.js`.
 * - `ordering` → `ordering` (`"title"` ou `"date"`, por `criadoEm`).
 * - `layout`/`moduleclass_sfx`/`owncache`/`cache_time` ficam fora do MVP.
 */

import { resolveArticlesList, createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, sortByDate } from "../../kernel/content-services.js";

/**
 * Resolve `services.adminClient` + a lista de artigos (via
 * `resolveArticlesList`) e devolve o serviço de leitura pronto — mesmo
 * contrato de `modules/mod_tags_popular/popular-data.js#readArticlesService`.
 *
 * @param {object} services
 * @returns {{ listArticles: () => Promise<object[]> }}
 */
export function readArticlesService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError(
      "services.adminClient e a lista de artigos (services.listIds) são obrigatórios para o módulo de Artigos similares."
    );
  }
  return createArticlesReadService({ client, list });
}

/**
 * Encontra, dentro de `artigos` (já no shape de domínio de
 * `kernel/article-mapper.js`), o artigo cujo `id` ou `slug` corresponde à
 * rota atual. Prioriza `id` (mais preciso); cai para `slug` quando `id`
 * está ausente ou não combina com nenhum artigo. Devolve `null` quando a
 * rota não identifica nenhum artigo (ex.: página inicial, sem `id`/`slug`,
 * ou nenhum artigo combina) — nunca lança.
 *
 * @param {Array<object>} artigos
 * @param {{ id?: number|string|null, slug?: string|null }} route
 * @returns {object | null}
 */
export function findActiveArticle(artigos, route) {
  if (!Array.isArray(artigos)) return null;
  const id = route?.id;
  const slug = typeof route?.slug === "string" ? route.slug : null;

  if (id !== undefined && id !== null) {
    const byId = artigos.find((artigo) => String(artigo?.id) === String(id));
    if (byId) return byId;
  }
  if (slug) {
    const bySlug = artigos.find((artigo) => artigo?.slug === slug);
    if (bySlug) return bySlug;
  }
  return null;
}

/**
 * Monta a lista de artigos similares ao `artigoAtivo`, a partir de
 * `artigos` já carregados — função pura, sem rede. Considera "similar"
 * qualquer artigo PUBLICADO (exceto o próprio `artigoAtivo`) que compartilhe
 * ao menos 1 tag com ele (`matchType: "any"`, único critério do MVP).
 * Devolve `[]` quando `artigoAtivo` é `null`/sem tags.
 *
 * @param {Array<object>} artigos
 * @param {object | null} artigoAtivo
 * @param {{ maximum?: number, ordering?: "title"|"date" }} [options]
 * @returns {Array<object>}
 */
export function buildSimilarArticles(artigos, artigoAtivo, { maximum = 5, ordering = "title" } = {}) {
  if (!artigoAtivo || !Array.isArray(artigoAtivo.tags) || !artigoAtivo.tags.length) return [];

  const tagsAtivo = new Set(artigoAtivo.tags);
  const publicados = filterPublished(artigos).filter((artigo) => String(artigo.id) !== String(artigoAtivo.id));
  const similares = publicados.filter((artigo) => Array.isArray(artigo.tags) && artigo.tags.some((tag) => tagsAtivo.has(tag)));

  const ordenados = ordering === "date"
    ? sortByDate(similares)
    : [...similares].sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? "")));

  const limite = maximum > 0 ? maximum : ordenados.length;
  return ordenados.slice(0, limite);
}
