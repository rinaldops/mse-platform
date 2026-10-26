/**
 * Serviço de leitura de artigos/categorias para o Componente PÚBLICO
 * `com_content` (lista/artigo/categoria/destaques — rota do site, não a
 * tela administrativa de `publisher.js`/`categories-editor.js`).
 *
 * Camada fina sobre `kernel/articles-data.js#createArticlesReadService`
 * (busca e mapeia os artigos crus) + `kernel/content-services.js`
 * (filtro/destaque/ordenação, funções puras já testadas) +
 * `kernel/categories.js` (filtro por categoria + resolução de categoria) —
 * mesmo princípio de `modules/mod_articles_latest/articles-latest-data.js`,
 * nenhuma lógica de filtro/ordenação duplicada aqui.
 *
 * `fieldMap` recebido por quem chama (ver `component.js`): aponta os campos
 * lógicos do domínio (`titulo`, `estadoEditorial`, `categoria`, `destaque`,
 * `ordemDestaque`, `publicarDe`, `publicarAte`, `slug`, `resumo`,
 * `corpoHtml`) para os nomes REAIS de campo da lista `MSEContent`
 * (`Title`, `State`, `CatId`, `Featured`, `Ordering`, `PublishUp`,
 * `PublishDown`, `Alias`, `Introtext`, `Fulltext` — ver
 * `kernel/schemas/mse-content.js`, campos oficiais do Joomla!
 * `#__content`) — nenhum nome real de campo é fixado aqui, só repassado ao
 * mapper já existente (`kernel/article-mapper.js`).
 */

import { createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished, filterFeatured, sortByDate } from "../../kernel/content-services.js";
import { filterArticlesByCategory, resolveArticleCategory } from "../../kernel/categories.js";

// `kernel/content-services.js#filterPublished` compara `artigo.estado` contra
// o LITERAL em português "Publicado" (valor fixo na função, não um nome de
// campo) — `fieldMap` traduz só QUAL campo é lido, nunca o VALOR dentro
// dele. `MSEContent.State` usa os valores oficiais do Joomla! em inglês
// ("Published"/"Unpublished"/"Archived"/"Trashed" — ver
// `kernel/schemas/mse-content.js`), então sem esta tradução todo artigo
// apareceria como "não publicado" para `content-services.js`. Traduzido
// aqui (fronteira SharePoint-oficial ↔ plumbing interno do kernel, mesmo
// princípio do `fieldMap` já documentado no cabeçalho deste arquivo) —
// `kernel/content-services.js`/`kernel/article-mapper.js` continuam
// intocados.
const STATE_TO_ESTADO_PT = Object.freeze({
  Published: "Publicado",
  Unpublished: "Despublicado",
  Archived: "Arquivado",
  Trashed: "Lixeira"
});

function translateState(article) {
  return { ...article, estado: STATE_TO_ESTADO_PT[article.estado] ?? article.estado };
}

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string}, fieldMap?: Record<string,string> }} options
 */
export function createContentReadService({ client, list, fieldMap } = {}) {
  const articlesService = createArticlesReadService({ client, list, fieldMap });

  async function listPublished() {
    const all = (await articlesService.listArticles()).map(translateState);
    return sortByDate(filterPublished(all), { field: "criadoEm", direction: "desc" });
  }

  async function listFeatured() {
    return filterFeatured(await listPublished());
  }

  async function listByCategory(categories, categoriaId) {
    return filterArticlesByCategory(await listPublished(), categories, categoriaId);
  }

  async function findArticle(id) {
    const published = await listPublished();
    const numericId = Number(id);
    return published.find((article) => article.id === numericId) ?? null;
  }

  return Object.freeze({ listPublished, listFeatured, listByCategory, findArticle });
}

/**
 * Lê `MSECategories` (mesmo contrato de leitura já usado por
 * `modules/mod_articles_latest/module.js`), tolerando ausência da lista
 * (site sem categorias provisionadas ainda — devolve `[]`, nunca lança).
 *
 * @param {{ client: { getListItems: Function }, listIds: Record<string, {listId:string}> }} options
 * @returns {Promise<Array<object>>}
 */
export async function listCategories({ client, listIds } = {}) {
  const list = listIds?.MSECategories;
  if (!list || typeof client?.getListItems !== "function") return [];
  return client.getListItems(list, { select: ["Id", "Title", "Alias", "Extension", "ParentId", "Level", "Ordering", "Published"] });
}

export { resolveArticleCategory };
