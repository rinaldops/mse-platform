import { resolveArticlesList } from "../../kernel/articles-data.js";
import { settingsDefaults } from "../../core/module-contract.js";
import { ARTICLES_LATEST_SETTINGS_SCHEMA } from "./articles-latest-settings-schema.js";
import { createArticlesLatestReadService } from "./articles-latest-data.js";
import { createArticlesLatestView } from "./articles-latest-view.js";

const DEFAULTS = settingsDefaults(ARTICLES_LATEST_SETTINGS_SCHEMA);

function readArticlesLatestService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError("services.adminClient e a lista de artigos (resolveArticlesList) são obrigatórios para o módulo de Artigos — Mais recentes.");
  }
  return createArticlesLatestReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-articles-latest__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesLatestService(services);

  const categoriaId = config.categoriaId ?? DEFAULTS.categoriaId ?? null;
  const count = config.count ?? DEFAULTS.count;
  const showFeatured = config.showFeatured ?? DEFAULTS.showFeatured;
  const ordering = config.ordering ?? DEFAULTS.ordering;

  let disposed = false;
  let disposeView = null;

  try {
    const categoriesList = services?.listIds?.MSECategories;
    const categories = categoriesList
      ? await services.adminClient.getListItems(categoriesList, { select: ["Id", "Title", "Alias", "Published"] })
      : [];
    const articles = await service.listLatestArticles({ categories, categoriaId, count, showFeatured, ordering });
    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createArticlesLatestView({ root, articles, routeAlias: context.route?.alias ?? "" });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar os artigos."));
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
