/**
 * View pura (sem rede) do módulo de posição `mod_articles_news`: lista
 * `<ul>` dos artigos já resolvidos/filtrados/ordenados/limitados por
 * `articles-news-data.js`, com resumo opcional (`showIntrotext`, campo real
 * `show_introtext` do Joomla!) — mesmo padrão de
 * `modules/mod_articles_latest/articles-latest-view.js`.
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
 * @param {{
 *   root: Element,
 *   articles: Array<object>,
 *   routeAlias?: string,
 *   showIntrotext?: boolean
 * }} options
 * @returns {() => void} função de limpeza.
 */
export function createArticlesNewsView({ root, articles, routeAlias = "", showIntrotext = true } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(articles)) throw new TypeError("articles deve ser um array.");

  const document = root.ownerDocument;
  const section = element(document, "div", "mse-module-articles-news");

  if (!articles.length) {
    section.append(element(document, "p", "mse-module-articles-news__empty", "Nenhum artigo publicado."));
  } else {
    const list = element(document, "ul", "mse-module-articles-news__list");
    for (const article of articles) {
      const item = element(document, "li", "mse-module-articles-news__item");
      const link = element(document, "a", "mse-module-articles-news__link", article.titulo ?? "");
      link.href = articleHref(article, routeAlias);
      item.append(link);
      if (showIntrotext && article.resumo) {
        item.append(element(document, "p", "mse-module-articles-news__intro", article.resumo));
      }
      list.append(item);
    }
    section.append(list);
  }

  root.replaceChildren(section);

  return () => {
    root.replaceChildren();
  };
}
