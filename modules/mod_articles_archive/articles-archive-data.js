/**
 * Serviço de leitura de artigos para o módulo de posição
 * `mod_articles_archive` — mesma composição básica dos demais módulos
 * desta Wave (`kernel/articles-data.js` + `kernel/content-services.js`),
 * mas filtrando por `estado === "Arquivado"` em vez de "Publicado" (ver
 * cabeçalho de `articles-archive-settings-schema.js` sobre a aproximação
 * adotada, sem agrupamento por mês/ano). O filtro por estado "Arquivado" é
 * uma comparação direta de um único campo — trivial o bastante para não
 * justificar uma função nova em `kernel/content-services.js` (que já
 * oferece `filterPublished` para o estado "Publicado"; nenhum outro módulo
 * desta Wave precisa filtrar por "Arquivado").
 */

import { createArticlesReadService } from "../../kernel/articles-data.js";
import { sortByDate } from "../../kernel/content-services.js";

const ESTADO_ARQUIVADO = "Arquivado";

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listArchivedArticles: (options?: { count?: number }) => Promise<Array<object>> }}
 */
export function createArticlesArchiveReadService({ client, list } = {}) {
  const articlesService = createArticlesReadService({ client, list });

  async function listArchivedArticles({ count = 10 } = {}) {
    const all = await articlesService.listArticles();
    const archived = all.filter((article) => article?.estado === ESTADO_ARQUIVADO);
    const sorted = sortByDate(archived, { field: "criadoEm", direction: "desc" });
    return sorted.slice(0, count > 0 ? count : 10);
  }

  return Object.freeze({ listArchivedArticles });
}
