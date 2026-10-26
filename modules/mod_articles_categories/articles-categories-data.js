/**
 * Serviço de leitura de categorias para o módulo de posição
 * `mod_articles_categories` — diferente dos demais módulos `mod_articles_*`
 * desta Wave, lê `MSECategories` (via `kernel/categories.js`). O piloto não
 * acessa conteúdo nem calcula contagens; isso pertence a um contrato posterior.
 */

import { listAdminItems } from "../../kernel/admin-data.js";
import { createArticlesReadService } from "../../kernel/articles-data.js";
import { filterPublished } from "../../kernel/content-services.js";
import { buildCategoryTree, listPublishedCategories, resolveArticleCategory, filterArticlesByCategory } from "../../kernel/categories.js";

const CATEGORY_FIELDS = ["Id", "Title", "Alias", "Extension", "Description", "ParentId", "Level", "Ordering", "Published"];

/**
 * @param {{ client: { getListItems: Function }, list: {listId: string} }} options
 * @returns {{ listCategories: () => Promise<object[]> }}
 */
export function createArticlesCategoriesReadService({ client, list } = {}) {
  if (!client || typeof client.getListItems !== "function") {
    throw new TypeError("client deve expor getListItems().");
  }
  if (!list || typeof list !== "object") {
    throw new TypeError("list deve ser o identificador resolvido de MSECategories ({ listId }).");
  }

  async function listCategories() {
    return listAdminItems({ client, list, select: CATEGORY_FIELDS, orderby: "Ordering asc" });
  }

  return Object.freeze({ listCategories });
}

/**
 * Restringe a árvore de categorias (já montada por `buildCategoryTree`) a
 * partir de uma categoria `parent` (Id/Alias/Título — mesmo campo `parent`
 * real do Joomla!), limitada a `maxlevel` níveis a partir dela. Quando
 * `parent` não resolve para nenhuma categoria real, devolve a árvore
 * completa a partir da raiz (mesmo comportamento de degradação adotado por
 * `kernel/categories.js#filterArticlesByCategory`), em vez de uma lista
 * vazia.
 *
 * `showChildren` controla se `children` de cada nó é preservado (`true`) ou
 * esvaziado (`false`, equivalente a "Mostrar subcategorias" desligado no
 * Joomla! real — lista plana de só 1 nível visível).
 *
 * @param {Array<object>} categories itens crus de MSECategories.
 * @param {{ parent?: number|string|null, maxlevel?: number, showChildren?: boolean, count?: number }} options
 * @returns {Array<object>} nós (com `children`, respeitando `showChildren`/`maxlevel`).
 */
export function resolveCategoriesTree(categories, { parent = null, maxlevel = 0, showChildren = false, count = 0 } = {}) {
  const tree = buildCategoryTree(categories);

  let roots = tree;
  if (parent !== null && parent !== undefined && parent !== "") {
    const parentCategory = resolveArticleCategory(categories, parent);
    if (parentCategory) {
      const findNode = (nodes) => {
        for (const node of nodes) {
          if (node.Id === parentCategory.Id) return node;
          const found = findNode(node.children);
          if (found) return found;
        }
        return null;
      };
      const parentNode = findNode(tree);
      roots = parentNode ? parentNode.children : [];
    }
  }

  function limitDepth(nodes, remainingLevels) {
    return nodes.map((node) => ({
      ...node,
      children: (!showChildren || remainingLevels <= 1) ? [] : limitDepth(node.children, remainingLevels - 1)
    }));
  }

  const limited = maxlevel > 0 ? limitDepth(roots, maxlevel) : roots.map((node) => ({
    ...node,
    children: showChildren ? node.children : []
  }));

  return count > 0 ? limited.slice(0, count) : limited;
}

/**
 * Conta artigos PUBLICADOS por categoria (`numitems` real do Joomla!), a
 * partir de uma lista de artigos já resolvida/mapeada (ver
 * `kernel/articles-data.js#createArticlesReadService`). Devolve um `Map`
 * `Id da categoria -> quantidade`, para consulta O(1) pela view.
 *
 * @param {Array<object>} categories itens crus de MSECategories.
 * @param {Array<object>} articles artigos já mapeados (ver `kernel/article-mapper.js`).
 * @returns {Map<number, number>}
 */
export function countArticlesByCategory(categories, articles) {
  const published = filterPublished(Array.isArray(articles) ? articles : []);
  const counts = new Map();
  for (const category of categories) {
    const matched = filterArticlesByCategory(published, categories, category.Id);
    counts.set(category.Id, matched.length);
  }
  return counts;
}

/**
 * Lê a quantidade de artigos publicados por categoria via
 * `services.adminClient` + a lista de artigos resolvida (ver
 * `kernel/articles-data.js#resolveArticlesList`). Devolve `null` quando a
 * lista de artigos não está disponível (degrada graciosamente — ver
 * `module.js`), em vez de lançar.
 *
 * @param {{ client: object, list: {listId: string}|null }} options
 * @param {Array<object>} categories
 * @returns {Promise<Map<number, number>|null>}
 */
export async function readArticleCountsByCategory({ client, list } = {}, categories) {
  if (!client || !list) return null;
  const articlesService = createArticlesReadService({ client, list });
  const articles = await articlesService.listArticles();
  return countArticlesByCategory(categories, articles);
}

export { listPublishedCategories };
