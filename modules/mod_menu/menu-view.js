/**
 * View pura (sem rede) do módulo de posição `mod_menu`: `<nav><ul>`
 * recursivo a partir da árvore já montada por `kernel/menu.js#buildMenuTree`.
 *
 * Links usam `kernel/router.js#serializeRoute` para gerar o `href` SEF
 * (`#/<alias>`) — a navegação em si acontece pelo mecanismo padrão de hash
 * do navegador/`core/navigation.js#createHashRouter`, sem precisar chamar
 * `context.navigate` explicitamente (mesmo princípio de
 * `core/navigation.js#createBreadcrumb`: apenas `href`, sem
 * `preventDefault`).
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function itemHref(item) {
  return serializeRoute({ alias: item.Alias ?? "" });
}

function renderList(document, nodes, activeId, depth) {
  const list = element(document, "ul", depth === 0 ? "mse-module-menu__list" : "mse-module-menu__sublist");
  for (const node of nodes) {
    list.append(renderItem(document, node, activeId, depth));
  }
  return list;
}

function renderItem(document, node, activeId, depth) {
  const isActive = node.Id === activeId;
  const item = element(document, "li", "mse-module-menu__item");
  if (isActive) item.classList.add("mse-module-menu__item--active");

  const link = element(document, "a", "mse-module-menu__link", node.Title);
  link.href = itemHref(node);
  if (node.Target === "NewTab") {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  if (isActive) link.setAttribute("aria-current", "page");
  item.append(link);

  if (node.children?.length) {
    item.append(renderList(document, node.children, activeId, depth + 1));
  }

  return item;
}

/**
 * @param {{
 *   root: Element,
 *   tree: Array<object>,
 *   activeItem?: object|null
 * }} options `tree` é o resultado de `buildMenuTree(items)`; `activeItem`,
 *   o resultado de `findActiveMenuItem(items, route)` (pode ser `null`).
 * @returns {() => void} função de limpeza.
 */
export function createMenuView({ root, tree, activeItem = null } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(tree)) throw new TypeError("tree deve ser um array.");

  const document = root.ownerDocument;
  const nav = element(document, "nav", "mse-module-menu");
  nav.setAttribute("aria-label", "Menu principal");

  if (!tree.length) {
    nav.append(element(document, "p", "mse-module-menu__empty", "Nenhum item de menu publicado."));
  } else {
    nav.append(renderList(document, tree, activeItem?.Id ?? null, 0));
  }

  root.replaceChildren(nav);

  return () => {
    root.replaceChildren();
  };
}
