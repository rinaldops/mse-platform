/**
 * Serviço de leitura de artigos para o módulo de posição `mod_articles_latest`
 * ("Artigos — Mais recentes", equivalente ao `mod_articles_latest` real do
 * Joomla!) — camada fina sobre `kernel/articles-data.js#createArticlesReadService`
 * (que busca e mapeia os artigos crus) + `kernel/content-services.js`
 * (filtro/destaque/ordenação/paginação, funções puras já testadas) +
 * `kernel/categories.js#filterArticlesByCategory` (filtro por categoria).
 *
 * Mesmo contrato de serviços de `modules/mod_menu/menu-data.js`
 * (`services.adminClient` + lista resolvida) — aqui a lista é resolvida por
 * `resolveArticlesList(services.listIds)` (ver cabeçalho de
 * `kernel/articles-data.js`), não um nome fixo como `MSEMenu`.
 *
 * Nenhuma lógica de filtro/ordenação/paginação é duplicada aqui: tudo é
 * delegado a `kernel/content-services.js`/`kernel/categories.js`. Este
 * arquivo só compõe a sequência "ler tudo publicado → filtrar por categoria
 * → aplicar destacados → ordenar → limitar a `count`" nessa ordem (mesma
 * ordem documentada em `composeFilters`, adaptada para incluir a etapa de
 * categoria por nome/alias deste módulo, que `composeFilters` não cobre).
 */

import { createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, filterFeatured, sortByDate } from "../../kernel/content-services.js";
import { filterArticlesByCategory } from "../../kernel/categories.js";

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listLatestArticles: (options?: {
 *   categories?: Array<object>,
 *   categoriaId?: number|string|null,
 *   count?: number,
 *   showFeatured?: "todos"|"somenteDestacados"|"ocultarDestacados",
 *   ordering?: "maisRecentes"|"titulo"
 * }) => Promise<Array<object>> }}
 */
export function createArticlesLatestReadService({ client, list } = {}) {
  const articlesService = createArticlesReadService({ client, list });

  async function listLatestArticles({ categories = [], categoriaId = null, count = 5, showFeatured = "todos", ordering = "maisRecentes" } = {}) {
    const all = await articlesService.listArticles();
    let published = filterPublished(all);
    published = filterArticlesByCategory(published, categories, categoriaId);

    if (showFeatured === "somenteDestacados") {
      published = filterFeatured(published);
    } else if (showFeatured === "ocultarDestacados") {
      published = published.filter((article) => article?.destaque !== true);
    }

    const sorted = ordering === "titulo"
      ? [...published].sort((a, b) => String(a?.titulo ?? "").localeCompare(String(b?.titulo ?? "")))
      : sortByDate(published, { field: "criadoEm", direction: "desc" });

    return sorted.slice(0, count > 0 ? count : 5);
  }

  return Object.freeze({ listLatestArticles });
}
