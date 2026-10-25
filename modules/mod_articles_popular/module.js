import { resolveArticlesList } from "../../kernel/articles-data.js";
import { settingsDefaults } from "../../core/module-contract.js";
import { ARTICLES_POPULAR_SETTINGS_SCHEMA } from "./articles-popular-settings-schema.js";
import { createArticlesPopularReadService } from "./articles-popular-data.js";
import { createArticlesPopularView } from "./articles-popular-view.js";

const DEFAULTS = settingsDefaults(ARTICLES_POPULAR_SETTINGS_SCHEMA);

function readArticlesPopularService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError("services.adminClient e a lista de artigos (resolveArticlesList) são obrigatórios para o módulo de Artigos — Mais acessados.");
  }
  return createArticlesPopularReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-articles-popular__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesPopularService(services);

  const options = {
    categoriaId: config.categoriaId ?? DEFAULTS.categoriaId ?? null,
    count: config.count ?? DEFAULTS.count,
    showFront: config.showFront ?? DEFAULTS.showFront,
    dateFiltering: config.dateFiltering ?? DEFAULTS.dateFiltering,
    dateField: config.dateField ?? DEFAULTS.dateField,
    startDateRange: config.startDateRange ?? DEFAULTS.startDateRange ?? null,
    endDateRange: config.endDateRange ?? DEFAULTS.endDateRange ?? null,
    relativeDate: config.relativeDate ?? DEFAULTS.relativeDate
  };

  let disposed = false;
  let disposeView = null;

  try {
    const categoriesList = services?.listIds?.MSECategories;
    const categories = categoriesList
      ? await services.adminClient.getListItems(categoriesList, { select: ["Id", "Title", "Alias", "Published"] })
      : [];
    const articles = await service.listPopularArticles({ ...options, categories });
    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createArticlesPopularView({ root, articles, routeAlias: context.route?.alias ?? "" });
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
