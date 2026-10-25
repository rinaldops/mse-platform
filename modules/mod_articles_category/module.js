import { resolveArticlesList } from "../../kernel/articles-data.js";
import { settingsDefaults } from "../../core/module-contract.js";
import { ARTICLES_CATEGORY_SETTINGS_SCHEMA } from "./articles-category-settings-schema.js";
import { createArticlesCategoryReadService } from "./articles-category-data.js";
import { createArticlesCategoryView } from "./articles-category-view.js";

const DEFAULTS = settingsDefaults(ARTICLES_CATEGORY_SETTINGS_SCHEMA);

function readArticlesCategoryService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError("services.adminClient e a lista de artigos (resolveArticlesList) são obrigatórios para o módulo de Artigos — Categoria.");
  }
  return createArticlesCategoryReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-articles-category__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesCategoryService(services);

  const options = {
    categoriaId: config.categoriaId ?? DEFAULTS.categoriaId ?? null,
    filterTag: config.filterTag ?? DEFAULTS.filterTag ?? null,
    count: config.count ?? DEFAULTS.count,
    showFront: config.showFront ?? DEFAULTS.showFront,
    dateFiltering: config.dateFiltering ?? DEFAULTS.dateFiltering,
    dateField: config.dateField ?? DEFAULTS.dateField,
    startDateRange: config.startDateRange ?? DEFAULTS.startDateRange ?? null,
    endDateRange: config.endDateRange ?? DEFAULTS.endDateRange ?? null,
    relativeDate: config.relativeDate ?? DEFAULTS.relativeDate,
    articleOrdering: config.articleOrdering ?? DEFAULTS.articleOrdering,
    articleOrderingDirection: config.articleOrderingDirection ?? DEFAULTS.articleOrderingDirection
  };
  const showIntrotext = config.showIntrotext ?? DEFAULTS.showIntrotext;

  let disposed = false;
  let disposeView = null;

  try {
    const categoriesList = services?.listIds?.MSECategories;
    const categories = categoriesList
      ? await services.adminClient.getListItems(categoriesList, { select: ["Id", "Title", "Alias", "Published"] })
      : [];
    const articles = await service.listCategoryArticles({ ...options, categories });
    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createArticlesCategoryView({ root, articles, routeAlias: context.route?.alias ?? "", showIntrotext });
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
