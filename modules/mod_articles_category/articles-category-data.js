/**
 * Serviço de leitura de artigos para o módulo de posição
 * `mod_articles_category` — mesma composição de
 * `modules/mod_articles_latest/articles-latest-data.js`, acrescida de
 * filtro por janela de data (`kernel/content-services.js#filterByDateWindow`,
 * equivalente ao `date_filtering`/`date_field`/`start_date_range`/
 * `end_date_range`/`relative_date` reais do Joomla!) e ordenação por
 * título/data (equivalente a `article_ordering`/`article_ordering_direction`).
 */

import { createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, filterFeatured, filterByTag, filterByDateWindow, sortByDate } from "../../kernel/content-services.js";
import { filterArticlesByCategory } from "../../kernel/categories.js";

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listCategoryArticles: (options?: object) => Promise<Array<object>> }}
 */
export function createArticlesCategoryReadService({ client, list } = {}) {
  const articlesService = createArticlesReadService({ client, list });

  async function listCategoryArticles({
    categories = [],
    categoriaId = null,
    filterTag = null,
    count = 0,
    showFront = "mostrar",
    dateFiltering = "off",
    dateField = "criadoEm",
    startDateRange = null,
    endDateRange = null,
    relativeDate = 30,
    articleOrdering = "titulo",
    articleOrderingDirection = "asc"
  } = {}) {
    const all = await articlesService.listArticles();
    let published = filterPublished(all);
    published = filterArticlesByCategory(published, categories, categoriaId);
    if (filterTag) published = filterByTag(published, filterTag);

    if (showFront === "somenteDestacados") {
      published = filterFeatured(published);
    } else if (showFront === "ocultar") {
      published = published.filter((article) => article?.destaque !== true);
    }

    published = filterByDateWindow(published, {
      mode: dateFiltering,
      field: dateField,
      startDate: startDateRange,
      endDate: endDateRange,
      relativeDays: relativeDate
    });

    const sorted = articleOrdering === "titulo"
      ? [...published].sort((a, b) => {
          const result = String(a?.titulo ?? "").localeCompare(String(b?.titulo ?? ""));
          return articleOrderingDirection === "desc" ? -result : result;
        })
      : sortByDate(published, {
          field: articleOrdering === "dataPublicacao" ? "publicarDe" : "criadoEm",
          direction: articleOrderingDirection === "desc" ? "desc" : "asc"
        });

    return count > 0 ? sorted.slice(0, count) : sorted;
  }

  return Object.freeze({ listCategoryArticles });
}
