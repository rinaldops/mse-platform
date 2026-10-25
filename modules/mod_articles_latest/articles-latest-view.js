/**
 * View pura (sem rede) do módulo de posição `mod_articles_latest`: lista
 * `<ul>` dos artigos já resolvidos/ordenados/limitados por
 * `articles-latest-data.js` — mesmo padrão de `modules/mod_menu/menu-view.js`
 * (recebe dados prontos, monta DOM, devolve função de limpeza).
 *
 * Links usam `kernel/router.js#serializeRoute` com o MESMO alias da rota
 * atual (`routeAlias`, normalmente `context.route.alias`) — não existe uma
 * rota dedicada "view=article" no router do Site Kernel (ver tarefa/plano
 * da Wave 2), então o artigo é identificado dentro da própria página atual
 * via o segmento `<id>-<slug>` (`#/<alias>/<id>-<slug>`), nunca por um
 * "kind" novo.
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
 *   routeAlias?: string
 * }} options `articles` já filtrados/ordenados/limitados (ver
 *   `createArticlesLatestReadService`).
 * @returns {() => void} função de limpeza.
 */
export function createArticlesLatestView({ root, articles, routeAlias = "" } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(articles)) throw new TypeError("articles deve ser um array.");

  const document = root.ownerDocument;
  const section = element(document, "div", "mse-module-articles-latest");

  if (!articles.length) {
    section.append(element(document, "p", "mse-module-articles-latest__empty", "Nenhum artigo publicado."));
  } else {
    const list = element(document, "ul", "mse-module-articles-latest__list");
    for (const article of articles) {
      const item = element(document, "li", "mse-module-articles-latest__item");
      const link = element(document, "a", "mse-module-articles-latest__link", article.titulo ?? "");
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
