/**
 * Serviço de leitura de artigos para o módulo de posição
 * `mod_articles_popular` — mesma composição de
 * `modules/mod_articles_category/articles-category-data.js` (filtro de
 * categoria/destaque/janela de data), mas SEM ordenação por "hits" (não
 * existe contador de acessos no shape de domínio hoje — ver cabeçalho de
 * `articles-popular-settings-schema.js`): ordena por `criadoEm` desc, como
 * aproximação aceitável.
 */

import { createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, filterByDateWindow, sortByDate } from "../../kernel/content-services.js";
import { filterArticlesByCategory } from "../../kernel/categories.js";

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listPopularArticles: (options?: object) => Promise<Array<object>> }}
 */
export function createArticlesPopularReadService({ client, list } = {}) {
  const articlesService = createArticlesReadService({ client, list });

  async function listPopularArticles({
    categories = [],
    categoriaId = null,
    count = 5,
    showFront = true,
    dateFiltering = "off",
    dateField = "criadoEm",
    startDateRange = null,
    endDateRange = null,
    relativeDate = 30
  } = {}) {
    const all = await articlesService.listArticles();
    let published = filterPublished(all);
    published = filterArticlesByCategory(published, categories, categoriaId);
    if (!showFront) published = published.filter((article) => article?.destaque !== true);

    published = filterByDateWindow(published, {
      mode: dateFiltering,
      field: dateField,
      startDate: startDateRange,
      endDate: endDateRange,
      relativeDays: relativeDate
    });

    const sorted = sortByDate(published, { field: "criadoEm", direction: "desc" });
    return sorted.slice(0, count > 0 ? count : 5);
  }

  return Object.freeze({ listPopularArticles });
}
