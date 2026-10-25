/**
 * Serviço de leitura de artigos para o módulo de posição `mod_articles_news`
 * ("Destaques"/"News Flash", equivalente ao `mod_articles_news` real do
 * Joomla!) — mesma composição de `modules/mod_articles_latest/articles-latest-data.js`
 * (`kernel/articles-data.js` + `kernel/content-services.js` +
 * `kernel/categories.js`), acrescida de filtro por tag
 * (`kernel/content-services.js#filterByTag`) e exclusão do artigo da página
 * atual (`exclude_current`, campo real do Joomla!).
 */

import { createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, filterFeatured, filterByTag, sortByDate } from "../../kernel/content-services.js";
import { filterArticlesByCategory } from "../../kernel/categories.js";

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listNewsArticles: (options?: {
 *   categories?: Array<object>,
 *   categoriaId?: number|string|null,
 *   tag?: string|null,
 *   count?: number,
 *   showFeatured?: "todos"|"somenteDestacados"|"ocultarDestacados",
 *   excludeCurrent?: boolean,
 *   currentArticleId?: number|string|null,
 *   ordering?: "dataPublicacao"|"dataCriacao",
 *   direction?: "asc"|"desc"
 * }) => Promise<Array<object>> }}
 */
export function createArticlesNewsReadService({ client, list } = {}) {
  const articlesService = createArticlesReadService({ client, list });

  async function listNewsArticles({
    categories = [],
    categoriaId = null,
    tag = null,
    count = 5,
    showFeatured = "todos",
    excludeCurrent = true,
    currentArticleId = null,
    ordering = "dataPublicacao",
    direction = "desc"
  } = {}) {
    const all = await articlesService.listArticles();
    let published = filterPublished(all);
    published = filterArticlesByCategory(published, categories, categoriaId);
    if (tag) published = filterByTag(published, tag);

    if (showFeatured === "somenteDestacados") {
      published = filterFeatured(published);
    } else if (showFeatured === "ocultarDestacados") {
      published = published.filter((article) => article?.destaque !== true);
    }

    if (excludeCurrent && currentArticleId !== null && currentArticleId !== undefined) {
      published = published.filter((article) => article?.id !== currentArticleId);
    }

    const field = ordering === "dataCriacao" ? "criadoEm" : "publicarDe";
    const sorted = sortByDate(published, { field, direction });

    return sorted.slice(0, count > 0 ? count : 5);
  }

  return Object.freeze({ listNewsArticles });
}
