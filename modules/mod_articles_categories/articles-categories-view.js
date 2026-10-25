/**
 * View pura (sem rede) do módulo de posição `mod_articles_categories`:
 * `<ul>` recursivo de categorias, com descrição e contagem de artigos
 * opcionais — mesmo padrão estrutural de
 * `modules/mod_menu/menu-view.js#renderList`/`renderItem`, mas sobre a
 * árvore de `kernel/categories.js#buildCategoryTree`.
 *
 * Links de categoria usam `kernel/router.js#serializeRoute({ alias })`
 * (mesmo princípio de `mod_menu` — não existe uma rota "view=category"
 * dedicada no router do Site Kernel).
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function categoryHref(category) {
  return serializeRoute({ alias: category?.Alias ?? "" });
}

function renderList(document, nodes, counts, showDescription, depth) {
  const list = element(document, "ul", depth === 0 ? "mse-module-articles-categories__list" : "mse-module-articles-categories__sublist");
  for (const node of nodes) {
    list.append(renderItem(document, node, counts, showDescription, depth));
  }
  return list;
}

function renderItem(document, node, counts, showDescription, depth) {
  const item = element(document, "li", "mse-module-articles-categories__item");

  const link = element(document, "a", "mse-module-articles-categories__link", node.Title);
  link.href = categoryHref(node);
  item.append(link);

  if (counts?.has(node.Id)) {
    item.append(element(document, "span", "mse-module-articles-categories__count", ` (${counts.get(node.Id)})`));
  }

  if (showDescription && node.Description) {
    item.append(element(document, "p", "mse-module-articles-categories__description", node.Description));
  }

  if (node.children?.length) {
    item.append(renderList(document, node.children, counts, showDescription, depth + 1));
  }

  return item;
}

/**
 * @param {{
 *   root: Element,
 *   tree: Array<object>,
 *   counts?: Map<number, number>|null,
 *   showDescription?: boolean
 * }} options `tree` é o resultado de `resolveCategoriesTree` (ou
 *   `buildCategoryTree` diretamente).
 * @returns {() => void} função de limpeza.
 */
export function createArticlesCategoriesView({ root, tree, counts = null, showDescription = false } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(tree)) throw new TypeError("tree deve ser um array.");

  const document = root.ownerDocument;
  const section = element(document, "div", "mse-module-articles-categories");

  if (!tree.length) {
    section.append(element(document, "p", "mse-module-articles-categories__empty", "Nenhuma categoria publicada."));
  } else {
    section.append(renderList(document, tree, counts, showDescription, 0));
  }

  root.replaceChildren(section);

  return () => {
    root.replaceChildren();
  };
}
