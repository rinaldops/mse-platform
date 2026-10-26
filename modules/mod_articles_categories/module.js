import { settingsDefaults } from "../../core/module-contract.js";
import { ARTICLES_CATEGORIES_SETTINGS_SCHEMA } from "./articles-categories-settings-schema.js";
import { createArticlesCategoriesReadService, resolveCategoriesTree } from "./articles-categories-data.js";
import { createArticlesCategoriesView } from "./articles-categories-view.js";

const DEFAULTS = settingsDefaults(ARTICLES_CATEGORIES_SETTINGS_SCHEMA);

function readCategoriesService(services) {
  const client = services?.adminClient;
  const list = services?.listIds?.MSECategories;
  const repository = services?.repositories?.mseCategories;
  if (repository) return createArticlesCategoriesReadService({ repository });
  if (!client || !list) {
    throw new TypeError("services.adminClient e services.listIds.MSECategories são obrigatórios para o módulo de Artigos — Lista de Categorias.");
  }
  return createArticlesCategoriesReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-articles-categories__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readCategoriesService(services);

  const parent = config.parent ?? DEFAULTS.parent ?? null;
  const showDescription = config.showDescription ?? DEFAULTS.showDescription;
  const showChildren = config.showChildren ?? DEFAULTS.showChildren;
  const count = config.count ?? DEFAULTS.count;
  const maxlevel = config.maxlevel ?? DEFAULTS.maxlevel;

  let disposed = false;
  let disposeView = null;

  try {
    const categories = await service.listCategories();
    const tree = resolveCategoriesTree(categories, { parent, maxlevel, showChildren, count });

    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createArticlesCategoriesView({ root, tree, showDescription });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar as categorias."));
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
