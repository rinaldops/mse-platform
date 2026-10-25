import { resolveArticlesList } from "../../kernel/articles-data.js";
import { settingsDefaults } from "../../core/module-contract.js";
import { ARTICLES_ARCHIVE_SETTINGS_SCHEMA } from "./articles-archive-settings-schema.js";
import { createArticlesArchiveReadService } from "./articles-archive-data.js";
import { createArticlesArchiveView } from "./articles-archive-view.js";

const DEFAULTS = settingsDefaults(ARTICLES_ARCHIVE_SETTINGS_SCHEMA);

function readArticlesArchiveService(services) {
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError("services.adminClient e a lista de artigos (resolveArticlesList) são obrigatórios para o módulo de Artigos — Arquivo.");
  }
  return createArticlesArchiveReadService({ client, list });
}

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-articles-archive__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesArchiveService(services);

  const count = config.count ?? DEFAULTS.count;

  let disposed = false;
  let disposeView = null;

  try {
    const articles = await service.listArchivedArticles({ count });
    if (disposed) return Object.freeze({ dispose() {} });
    disposeView = createArticlesArchiveView({ root, articles, routeAlias: context.route?.alias ?? "" });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar os artigos arquivados."));
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
