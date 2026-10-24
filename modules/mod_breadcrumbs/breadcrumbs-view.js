/**
 * View pura (sem rede), 100% autocontida, do módulo de posição
 * `mod_breadcrumbs`: `<nav aria-label="Trilha de navegação"><ol>` a partir
 * da trilha já montada por `kernel/menu.js#buildPathway`.
 *
 * Deliberadamente NÃO reaproveita `core/navigation.js#createBreadcrumb`
 * (que usa classes `.mse-breadcrumb__*` compartilhadas com `core/core.css`):
 * este módulo segue o padrão 100% autocontido de `mod_recursos` (CSS
 * próprio, classes `mse-module-breadcrumbs__*` prefixadas por módulo).
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {{ root: Element, pathway: Array<{title: string, alias: string}> }} options
 *   `pathway` é o resultado de `buildPathway(items, activeItem)`.
 * @returns {() => void} função de limpeza.
 */
export function createBreadcrumbsView({ root, pathway } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(pathway)) throw new TypeError("pathway deve ser um array.");

  const document = root.ownerDocument;
  const nav = element(document, "nav", "mse-module-breadcrumbs");
  nav.setAttribute("aria-label", "Trilha de navegação");

  if (pathway.length) {
    const list = element(document, "ol", "mse-module-breadcrumbs__list");
    pathway.forEach((entry, index) => {
      const isLast = index === pathway.length - 1;
      const item = element(document, "li", "mse-module-breadcrumbs__item");

      if (isLast) {
        const current = element(document, "span", "mse-module-breadcrumbs__current", entry.title);
        current.setAttribute("aria-current", "page");
        item.append(current);
      } else {
        const link = element(document, "a", "mse-module-breadcrumbs__link", entry.title);
        link.href = serializeRoute({ alias: entry.alias ?? "" });
        item.append(link);
      }

      list.append(item);
      if (!isLast) {
        const separatorItem = element(document, "li", "mse-module-breadcrumbs__separator");
        separatorItem.setAttribute("aria-hidden", "true");
        separatorItem.append(element(document, "span", null, "›"));
        list.append(separatorItem);
      }
    });
    nav.append(list);
  }

  root.replaceChildren(nav);

  return () => {
    root.replaceChildren();
  };
}
