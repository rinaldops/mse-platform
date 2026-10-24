/**
 * View pura (sem rede) do módulo de posição `mod_search`: `<form>` com
 * `<input type="search">` + `<ul>` de resultados — equivalente MVP ao
 * `mod_finder` real do Joomla! (caixa de busca; ver cabeçalho de
 * `search-data.js`/`README.md` sobre a decisão de escopo).
 *
 * Filtra em memória a lista de artigos já carregada no mount (ver
 * `module.js`) a cada tecla digitada/submit — SEM nova chamada de rede por
 * tecla, mesma regra do escopo desta rodada. Sem rota de resultados
 * dedicada: os resultados aparecem na própria área do módulo.
 *
 * Links de resultado usam `kernel/router.js#serializeRoute` para montar o
 * `href` SEF, mesmo princípio de `modules/mod_menu/menu-view.js`/
 * `modules/mod_breadcrumbs/breadcrumbs-view.js`.
 */

import { serializeRoute } from "../../kernel/router.js";
import { filterArticles } from "./search-data.js";

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function resultHref(artigo) {
  return serializeRoute({ alias: "artigo", id: artigo?.id ?? null, slug: artigo?.slug ?? null });
}

/**
 * @param {{
 *   root: Element,
 *   articles: Array<object>,
 *   placeholder?: string,
 *   maxResults?: number
 * }} options `articles` é a lista completa já carregada (shape de domínio
 *   de `kernel/article-mapper.js`) — a view nunca busca em rede, só filtra
 *   o array recebido.
 * @returns {() => void} função de limpeza.
 */
export function createSearchView({ root, articles = [], placeholder = "Buscar...", maxResults = 10 } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");

  const document = root.ownerDocument;
  const container = element(document, "div", "mse-module-search");

  const form = element(document, "form", "mse-module-search__form");
  const input = document.createElement("input");
  input.type = "search";
  input.className = "mse-module-search__input";
  input.placeholder = placeholder;
  form.append(input);

  const resultsList = element(document, "ul", "mse-module-search__results");
  const emptyState = element(document, "p", "mse-module-search__empty", "Nenhum resultado encontrado.");
  emptyState.hidden = true;

  function renderResults(term) {
    resultsList.replaceChildren();
    const matched = filterArticles(articles, term).slice(0, maxResults);
    const hasTerm = String(term ?? "").trim() !== "";
    emptyState.hidden = !hasTerm || matched.length > 0;
    for (const artigo of matched) {
      const item = element(document, "li", "mse-module-search__result");
      const link = element(document, "a", "mse-module-search__result-link", artigo.titulo || "");
      link.href = resultHref(artigo);
      item.append(link);
      resultsList.append(item);
    }
  }

  function handleInput() {
    renderResults(input.value);
  }
  function handleSubmit(event) {
    event?.preventDefault?.();
    renderResults(input.value);
  }

  if (typeof input.addEventListener === "function") input.addEventListener("input", handleInput);
  else input.oninput = handleInput;
  if (typeof form.addEventListener === "function") form.addEventListener("submit", handleSubmit);
  else form.onsubmit = handleSubmit;

  container.append(form, resultsList, emptyState);
  root.replaceChildren(container);

  return () => {
    root.replaceChildren();
  };
}
