/**
 * Funções puras de Categorias do Site Kernel (Wave 2 — análogo a
 * `kernel/menu.js`, mas sobre `MSECategories`, ver
 * `kernel/schemas/mse-categories.js`).
 *
 * Nenhuma função aqui faz REST: todas recebem um array de itens já
 * carregado em memória (shape de `MSE_CATEGORIES_SCHEMA` + `Id` nativo) e
 * devolvem dados derivados — mesmo princípio de `kernel/menu.js`.
 *
 * Shape esperado de cada item de `items` (um registro de `MSECategories` já
 * lido do SharePoint):
 *   {
 *     Id: number,
 *     Title: string,
 *     Alias: string,
 *     Extension: string,
 *     Description: string | null,
 *     ParentId: number | null | undefined,  // ausente/0 = raiz
 *     Level: number,
 *     Ordering: number,
 *     Published: "Published" | "Unpublished" | "Trashed"
 *   }
 */

const PUBLISHED = "Published";

function isRootParent(parentId) {
  return parentId === null || parentId === undefined || parentId === 0;
}

function isPublished(item) {
  return item?.Published === PUBLISHED;
}

/**
 * Monta a árvore hierárquica das categorias publicadas, a partir de
 * ParentId. Cada nível é ordenado por Ordering (crescente). Mesmo
 * algoritmo/mesmas garantias de `kernel/menu.js#buildMenuTree` (itens
 * despublicados são ignorados como nó E como pai).
 *
 * @param {Array<object>} items
 * @returns {Array<object>} nós raiz, cada um com `children` (array).
 */
export function buildCategoryTree(items) {
  if (!Array.isArray(items)) throw new TypeError("items deve ser um array.");

  const published = items.filter(isPublished);
  const nodesById = new Map();
  for (const item of published) {
    nodesById.set(item.Id, { ...item, children: [] });
  }

  const roots = [];
  for (const node of nodesById.values()) {
    if (isRootParent(node.ParentId) || !nodesById.has(node.ParentId)) {
      roots.push(node);
    } else {
      nodesById.get(node.ParentId).children.push(node);
    }
  }

  const byOrdering = (a, b) => (a.Ordering ?? 0) - (b.Ordering ?? 0);
  const sortTree = (nodes) => {
    nodes.sort(byOrdering);
    for (const node of nodes) sortTree(node.children);
  };
  sortTree(roots);

  return roots;
}

/**
 * Lista plana (sem hierarquia) das categorias publicadas, ordenada por
 * Ordering. Útil para módulos que só precisam de um lookup Id/Alias→Title,
 * sem montar a árvore inteira.
 *
 * @param {Array<object>} items
 * @returns {Array<object>}
 */
export function listPublishedCategories(items) {
  if (!Array.isArray(items)) throw new TypeError("items deve ser um array.");
  return items.filter(isPublished).sort((a, b) => (a.Ordering ?? 0) - (b.Ordering ?? 0));
}

/**
 * Resolve a categoria de um artigo mapeado (ver `kernel/article-mapper.js`),
 * cujo `categoriaId` pode ser um Id numérico de `MSECategories` OU um texto
 * livre (Alias ou Title) — reflexo de `CategoriaTexto` não ser uma FK
 * formal no schema real do CAMAP (ver `kernel/publisher-data.js`, campo
 * lógico `categoria`). Casa, em ordem: `Id` (comparação numérica), `Alias`
 * (case-insensitive) e `Title` (case-insensitive). Devolve `null` quando
 * `categoriaId` é vazio/ausente ou nenhuma categoria casa.
 *
 * @param {Array<object>} categories itens crus de MSECategories.
 * @param {number | string | null | undefined} categoriaId
 * @returns {object | null}
 */
export function resolveArticleCategory(categories, categoriaId) {
  if (!Array.isArray(categories)) throw new TypeError("categories deve ser um array.");
  if (categoriaId === null || categoriaId === undefined || categoriaId === "") return null;

  const numericId = Number(categoriaId);
  if (Number.isInteger(numericId)) {
    const byId = categories.find((category) => category?.Id === numericId);
    if (byId) return byId;
  }

  const text = String(categoriaId).trim().toLowerCase();
  if (text === "") return null;
  return (
    categories.find((category) => String(category?.Alias ?? "").toLowerCase() === text)
    ?? categories.find((category) => String(category?.Title ?? "").toLowerCase() === text)
    ?? null
  );
}
