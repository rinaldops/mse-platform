import { resolveArticlesList } from "../../kernel/articles-data.js";
import { settingsDefaults } from "../../core/module-contract.js";
import { ARTICLES_NEWS_SETTINGS_SCHEMA } from "./articles-news-settings-schema.js";
import { createArticlesNewsReadService } from "./articles-news-data.js";
import { createArticlesNewsView } from "./articles-news-view.js";

const DEFAULTS = settingsDefaults(ARTICLES_NEWS_SETTINGS_SCHEMA);

function readArticlesNewsService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError("services.adminClient e a lista de artigos (resolveArticlesList) são obrigatórios para o módulo de Artigos — Destaques (News Flash).");
  }
  return createArticlesNewsReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-articles-news__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesNewsService(services);

  const categoriaId = config.categoriaId ?? DEFAULTS.categoriaId ?? null;
  const tag = config.tag ?? DEFAULTS.tag ?? null;
  const count = config.count ?? DEFAULTS.count;
  const showFeatured = config.showFeatured ?? DEFAULTS.showFeatured;
  const excludeCurrent = config.excludeCurrent ?? DEFAULTS.excludeCurrent;
  const showIntrotext = config.showIntrotext ?? DEFAULTS.showIntrotext;
  const ordering = config.ordering ?? DEFAULTS.ordering;
  const direction = config.direction ?? DEFAULTS.direction;

  let disposed = false;
  let disposeView = null;

  try {
    const categoriesList = services?.listIds?.MSECategories;
    const categories = categoriesList
      ? await services.adminClient.getListItems(categoriesList, { select: ["Id", "Title", "Alias", "Published"] })
      : [];
    const articles = await service.listNewsArticles({
      categories,
      categoriaId,
      tag,
      count,
      showFeatured,
      excludeCurrent,
      currentArticleId: context.route?.id ?? null,
      ordering,
      direction
    });
    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createArticlesNewsView({ root, articles, routeAlias: context.route?.alias ?? "", showIntrotext });
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
