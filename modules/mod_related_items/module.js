import { settingsDefaults } from "../../core/module-contract.js";
import { readArticlesService, findActiveArticle, buildRelatedArticles } from "./related-data.js";
import { createRelatedArticlesView } from "./related-view.js";
import { RELATED_ITEMS_SETTINGS_SCHEMA } from "./related-settings-schema.js";

const DEFAULTS = settingsDefaults(RELATED_ITEMS_SETTINGS_SCHEMA);

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-related-items__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesService(services);

  let disposed = false;
  let disposeView = null;

  try {
    const artigos = await service.listArticles();
    if (disposed) return Object.freeze({ dispose() {} });

    // Sem artigo ativo identificável na rota atual (ex.: página inicial):
    // estado vazio/"sem sugestões", nunca erro.
    const artigoAtivo = findActiveArticle(artigos, context.route);
    const relacionados = buildRelatedArticles(artigos, artigoAtivo, {
      maximum: config.maximum ?? DEFAULTS.maximum
    });

    disposeView = createRelatedArticlesView({
      root,
      articles: relacionados,
      showDate: config.showDate ?? DEFAULTS.showDate,
      noResultsText: config.noResultsText ?? DEFAULTS.noResultsText
    });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar os artigos relacionados."));
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
