/**
 * Serviço de leitura + resolução do artigo ativo + artigos relacionados
 * para o módulo de posição `mod_related_items`.
 *
 * Reaproveita a infraestrutura já pronta da Wave 2: `kernel/articles-data.js`
 * (`resolveArticlesList`/`createArticlesReadService`) para ler os artigos já
 * mapeados para o shape de domínio, e `kernel/content-services.js`
 * (`filterPublished`, `sortByDate`) para a filtragem/ordenação — nenhuma
 * lógica de REST/filtro é duplicada aqui.
 *
 * Artigo ativo: resolvido a partir de `context.route` (`kernel/router.js`,
 * shape `{ alias, id, slug, query }`) — mesmo princípio de
 * `modules/mod_tags_similar/similar-data.js#findActiveArticle` (reimplementado
 * aqui, não importado: cada módulo de posição desta família mantém sua
 * própria `*-data.js` autossuficiente, mesmo padrão já seguido por
 * `mod_articles_*`/`mod_tags_popular`/`mod_tags_similar`, nenhum dos quais
 * importa `*-data.js` de outro módulo).
 *
 * Correspondência com os parâmetros reais de `mod_related_items.xml`
 * (Joomla!, ver `web-devs/JOOMLA/modules/mod_related_items/mod_related_items.xml`
 * e `RelatedItemsHelper::getRelatedArticles`):
 * - O Joomla! real casa artigos pelo campo livre `metakey` (palavras-chave
 *   separadas por vírgula, comparação `LIKE`). `MSEPublicacoes` não tem
 *   campo equivalente a `metakey` — este MVP usa o array `tags` já existente
 *   (mesmo campo lógico usado por `mod_tags_similar`) como substituto
 *   documentado: "relacionado" = compartilha ao menos 1 tag com o artigo
 *   ativo, publicado, excluindo o próprio artigo. Diferente do Joomla! real
 *   (que aceita correspondência parcial de substring dentro de cada
 *   palavra-chave via `LIKE '%palavra%'`), aqui a comparação é por IGUALDADE
 *   de string de tag (mesmo critério de `mod_tags_similar`).
 * - `maximum` → `maximum` (qtd. máxima de artigos relacionados exibidos).
 * - `showDate` → `showDate` (exibição da data de criação na view).
 * - `layout`/`moduleclass_sfx`/`owncache`/`cache_time` ficam fora do MVP.
 *
 * Ordenação: por data de criação (`criadoEm`) descendente — o Joomla! real
 * usa a ordenação padrão do model genérico de Artigos (sem campo de
 * ordenação próprio no XML do módulo); replicado aqui como o comportamento
 * mais previsível sem introduzir uma opção de settings que o módulo real
 * não expõe.
 */

import { resolveArticlesList, createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, sortByDate } from "../../kernel/content-services.js";

/**
 * Resolve `services.adminClient` + a lista de artigos (via
 * `resolveArticlesList`) e devolve o serviço de leitura pronto — mesmo
 * contrato de `modules/mod_tags_similar/similar-data.js#readArticlesService`.
 *
 * @param {object} services
 * @returns {{ listArticles: () => Promise<object[]> }}
 */
export function readArticlesService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError(
      "services.adminClient e a lista de artigos (services.listIds) são obrigatórios para o módulo de Artigos relacionados."
    );
  }
  return createArticlesReadService({ client, list });
}

/**
 * Encontra, dentro de `artigos` (já no shape de domínio de
 * `kernel/article-mapper.js`), o artigo cujo `id` ou `slug` corresponde à
 * rota atual. Prioriza `id` (mais preciso); cai para `slug` quando `id`
 * está ausente ou não combina com nenhum artigo. Devolve `null` quando a
 * rota não identifica nenhum artigo — nunca lança.
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
 * Monta a lista de artigos relacionados ao `artigoAtivo`, a partir de
 * `artigos` já carregados — função pura, sem rede. Considera "relacionado"
 * qualquer artigo PUBLICADO (exceto o próprio `artigoAtivo`) que compartilhe
 * ao menos 1 tag com ele (ver cabeçalho — substituto documentado de
 * `metakey`). Devolve `[]` quando `artigoAtivo` é `null`/sem tags.
 *
 * @param {Array<object>} artigos
 * @param {object | null} artigoAtivo
 * @param {{ maximum?: number }} [options]
 * @returns {Array<object>}
 */
export function buildRelatedArticles(artigos, artigoAtivo, { maximum = 5 } = {}) {
  if (!artigoAtivo || !Array.isArray(artigoAtivo.tags) || !artigoAtivo.tags.length) return [];

  const tagsAtivo = new Set(artigoAtivo.tags);
  const publicados = filterPublished(artigos).filter((artigo) => String(artigo.id) !== String(artigoAtivo.id));
  const relacionados = publicados.filter((artigo) => Array.isArray(artigo.tags) && artigo.tags.some((tag) => tagsAtivo.has(tag)));

  const ordenados = sortByDate(relacionados);

  const limite = maximum > 0 ? maximum : ordenados.length;
  return ordenados.slice(0, limite);
}
