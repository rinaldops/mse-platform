/**
 * View pura (sem rede) do módulo de posição `mod_tags_similar`: lista de
 * artigos que compartilham tags com o artigo atualmente em exibição, a
 * partir do resultado já filtrado/ordenado de
 * `similar-data.js#buildSimilarArticles`.
 *
 * Links de artigo usam `kernel/router.js#serializeRoute({ alias, id, slug })`
 * — mesmo padrão de `modules/mod_menu/menu-view.js`/
 * `modules/mod_breadcrumbs/breadcrumbs-view.js`. Como não há uma rota fixa
 * de "artigo" no kernel (o alias depende do item de menu que expõe o
 * artigo), usa-se `alias: ""` (rota raiz) com `id`/`slug` do artigo — mesma
 * limitação assumida por outros módulos desta Wave até existir uma rota
 * dedicada de artigo.
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function articleHref(artigo) {
  return serializeRoute({ alias: "", id: artigo.id, slug: artigo.slug || undefined });
}

/**
 * @param {{
 *   root: Element,
 *   articles: Array<object>,
 *   noResultsText?: string
 * }} options `articles` é o resultado de `buildSimilarArticles`.
 * @returns {() => void} função de limpeza.
 */
export function createSimilarArticlesView({ root, articles, noResultsText = "Nenhum artigo similar encontrado." } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(articles)) throw new TypeError("articles deve ser um array.");

  const document = root.ownerDocument;
  const wrapper = element(document, "div", "mse-module-tags-similar");

  if (!articles.length) {
    wrapper.append(element(document, "p", "mse-module-tags-similar__empty", noResultsText));
  } else {
    const list = element(document, "ul", "mse-module-tags-similar__list");
    for (const artigo of articles) {
      const item = element(document, "li", "mse-module-tags-similar__item");
      const link = element(document, "a", "mse-module-tags-similar__link", artigo.titulo ?? "");
      link.href = articleHref(artigo);
      item.append(link);
      list.append(item);
    }
    wrapper.append(list);
  }

  root.replaceChildren(wrapper);

  return () => {
    root.replaceChildren();
  };
}
