import { settingsDefaults } from "../../core/module-contract.js";
import { SEARCH_SETTINGS_SCHEMA } from "./search-settings-schema.js";
import { createSearchReadService } from "./search-data.js";
import { createSearchView } from "./search-view.js";

const DEFAULTS = settingsDefaults(SEARCH_SETTINGS_SCHEMA);

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-search__status";
  node.textContent = text;
  return node;
}

/**
 * Carrega a lista inteira de artigos UMA vez no mount (sem nova chamada de
 * rede por tecla — ver `search-data.js`) e monta a view, que filtra em
 * memória a cada interação.
 *
 * @param {{ root: Element, services?: object, config?: object }} options
 * @returns {Promise<{ dispose(): void }>}
 */
export async function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;

  const placeholder = config.placeholder ?? DEFAULTS.placeholder;
  const maxResults = config.maxResults ?? DEFAULTS.maxResults;

  const service = createSearchReadService({ client: services?.adminClient, listIds: services?.listIds });
  if (!service) {
    root.replaceChildren(statusElement(document, "Busca indisponível: nenhuma lista de artigos configurada."));
    return Object.freeze({ dispose() { root.replaceChildren(); } });
  }

  let disposed = false;
  let disposeView = null;

  try {
    const articles = await service.listArticles();
    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createSearchView({ root, articles, placeholder, maxResults });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar os artigos para busca."));
  }

  return Object.freeze({
    dispose() {
      disposed = true;
      disposeView?.();
      root.replaceChildren();
    }
  });
}

export function dispose() {}
