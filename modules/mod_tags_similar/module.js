import { settingsDefaults } from "../../core/module-contract.js";
import { readArticlesService, findActiveArticle, buildSimilarArticles } from "./similar-data.js";
import { createSimilarArticlesView } from "./similar-view.js";
import { TAGS_SIMILAR_SETTINGS_SCHEMA } from "./similar-settings-schema.js";

const DEFAULTS = settingsDefaults(TAGS_SIMILAR_SETTINGS_SCHEMA);

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-tags-similar__status";
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
    const similares = buildSimilarArticles(artigos, artigoAtivo, {
      maximum: config.maximum ?? DEFAULTS.maximum,
      ordering: config.ordering ?? DEFAULTS.ordering
    });

    disposeView = createSimilarArticlesView({
      root,
      articles: similares,
      noResultsText: config.noResultsText ?? DEFAULTS.noResultsText
    });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar os artigos similares."));
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
