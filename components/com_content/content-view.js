/**
 * View pura (sem rede) do Componente público `com_content` — 4 visões
 * (`list`/`featured`/`category`/`article`), todas recebendo dados já
 * resolvidos/filtrados por `content-data.js` e devolvendo uma função de
 * limpeza — mesmo padrão de `modules/mod_articles_latest/articles-latest-view.js`.
 *
 * Classes semânticas (`com-content__*`) propositalmente sem estilo embutido
 * aqui: o visual vem do template ativo (ex. `templates/minijoomla-classic/`),
 * nunca deste arquivo — mesmo princípio de qualquer Componente/Módulo do
 * kernel (ver `templates/mse-default/index.js`).
 */

import { serializeRoute } from "../../kernel/router.js";

function element(document, tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function articleHref(article, routeAlias) {
  return serializeRoute({ alias: routeAlias ?? "", id: article?.id ?? null, slug: article?.slug ?? null });
}

function renderList(document, articles, routeAlias, emptyMessage) {
  const section = element(document, "div", "com-content__list");
  if (!articles.length) {
    section.append(element(document, "p", "com-content__empty", emptyMessage));
    return section;
  }
  const list = element(document, "ul", "com-content__items");
  for (const article of articles) {
    const item = element(document, "li", "com-content__item");
    const link = document.createElement("a");
    link.className = "com-content__link";
    link.href = articleHref(article, routeAlias);
    link.textContent = article.titulo ?? "";
    item.append(link);
    if (article.resumo) item.append(element(document, "p", "com-content__summary", article.resumo));
    list.append(item);
  }
  section.append(list);
  return section;
}

function renderArticle(document, article) {
  if (!article) {
    return element(document, "p", "com-content__empty", "Artigo não encontrado.");
  }
  const section = element(document, "article", "com-content__article");
  const title = document.createElement("h1");
  title.className = "com-content__title";
  title.textContent = article.titulo ?? "";
  section.append(title);
  if (article.resumo) section.append(element(document, "div", "com-content__intro", article.resumo));
  if (article.corpoHtml) section.append(element(document, "div", "com-content__fulltext", article.corpoHtml));
  return section;
}

/**
 * @param {{
 *   root: Element,
 *   view: "list"|"featured"|"category"|"article",
 *   articles: Array<object>,
 *   article?: object|null,
 *   routeAlias?: string
 * }} options `articles` já filtradas/ordenadas pela visão pedida (ver
 *   `component.js`); `article` só é usado na visão "article".
 * @returns {() => void} função de limpeza.
 */
export function createContentView({ root, view, articles = [], article = null, routeAlias = "" } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  const document = root.ownerDocument;

  const rendered = view === "article"
    ? renderArticle(document, article)
    : renderList(document, articles, routeAlias, view === "featured"
      ? "Nenhum artigo em destaque."
      : view === "category"
        ? "Nenhum artigo nesta categoria."
        : "Nenhum artigo publicado.");

  root.replaceChildren(rendered);
  return () => { root.replaceChildren(); };
}
