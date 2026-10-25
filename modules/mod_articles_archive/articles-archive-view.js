/**
 * View pura (sem rede) do módulo de posição `mod_articles_archive` — mesmo
 * padrão de `modules/mod_articles_popular/articles-popular-view.js`.
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function articleHref(article, routeAlias) {
  return serializeRoute({ alias: routeAlias ?? "", id: article?.id ?? null, slug: article?.slug ?? null });
}

/**
 * @param {{ root: Element, articles: Array<object>, routeAlias?: string }} options
 * @returns {() => void} função de limpeza.
 */
export function createArticlesArchiveView({ root, articles, routeAlias = "" } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(articles)) throw new TypeError("articles deve ser um array.");

  const document = root.ownerDocument;
  const section = element(document, "div", "mse-module-articles-archive");

  if (!articles.length) {
    section.append(element(document, "p", "mse-module-articles-archive__empty", "Nenhum artigo arquivado."));
  } else {
    const list = element(document, "ul", "mse-module-articles-archive__list");
    for (const article of articles) {
      const item = element(document, "li", "mse-module-articles-archive__item");
      const link = element(document, "a", "mse-module-articles-archive__link", article.titulo ?? "");
      link.href = articleHref(article, routeAlias);
      item.append(link);
      list.append(item);
    }
    section.append(list);
  }

  root.replaceChildren(section);

  return () => {
    root.replaceChildren();
  };
}
