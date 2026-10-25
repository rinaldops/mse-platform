/**
 * View pura (sem rede) do módulo de posição `mod_related_items`: lista de
 * artigos relacionados ao artigo atualmente em exibição, a partir do
 * resultado já filtrado/ordenado de `related-data.js#buildRelatedArticles`.
 *
 * Links de artigo usam `kernel/router.js#serializeRoute({ alias, id, slug })`
 * — mesmo padrão de `modules/mod_tags_similar/similar-view.js`. Como não há
 * uma rota fixa de "artigo" no kernel (o alias depende do item de menu que
 * expõe o artigo), usa-se `alias: ""` (rota raiz) com `id`/`slug` do
 * artigo — mesma limitação assumida por outros módulos desta família até
 * existir uma rota dedicada de artigo.
 *
 * `showDate` (Joomla! real): quando habilitado, exibe `criadoEm` formatado
 * (`toLocaleDateString`) ao lado do título de cada artigo.
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

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
}

/**
 * @param {{
 *   root: Element,
 *   articles: Array<object>,
 *   showDate?: boolean,
 *   noResultsText?: string
 * }} options `articles` é o resultado de `buildRelatedArticles`.
 * @returns {() => void} função de limpeza.
 */
export function createRelatedArticlesView({ root, articles, showDate = false, noResultsText = "Nenhum artigo relacionado encontrado." } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!Array.isArray(articles)) throw new TypeError("articles deve ser um array.");

  const document = root.ownerDocument;
  const wrapper = element(document, "div", "mse-module-related-items");

  if (!articles.length) {
    wrapper.append(element(document, "p", "mse-module-related-items__empty", noResultsText));
  } else {
    const list = element(document, "ul", "mse-module-related-items__list");
    for (const artigo of articles) {
      const item = element(document, "li", "mse-module-related-items__item");
      const link = element(document, "a", "mse-module-related-items__link", artigo.titulo ?? "");
      link.href = articleHref(artigo);
      item.append(link);
      if (showDate) {
        const date = formatDate(artigo.criadoEm);
        if (date) item.append(element(document, "span", "mse-module-related-items__date", date));
      }
      list.append(item);
    }
    wrapper.append(list);
  }

  root.replaceChildren(wrapper);

  return () => {
    root.replaceChildren();
  };
}
