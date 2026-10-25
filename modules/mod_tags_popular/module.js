import { settingsDefaults } from "../../core/module-contract.js";
import { readArticlesService, buildPopularTags } from "./popular-data.js";
import { createPopularTagsView } from "./popular-view.js";
import { TAGS_POPULAR_SETTINGS_SCHEMA } from "./popular-settings-schema.js";

const DEFAULTS = settingsDefaults(TAGS_POPULAR_SETTINGS_SCHEMA);

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "mse-module-tags-popular__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const service = readArticlesService(services);

  let disposed = false;
  let disposeView = null;

  try {
    const artigos = await service.listArticles();
    if (disposed) return Object.freeze({ dispose() {} });

    const tags = buildPopularTags(artigos, {
      maximum: config.maximum ?? DEFAULTS.maximum,
      timeframe: config.timeframe ?? DEFAULTS.timeframe,
      orderValue: config.orderValue ?? DEFAULTS.orderValue,
      orderDirection: config.orderDirection ?? DEFAULTS.orderDirection
    });

    disposeView = createPopularTagsView({
      root,
      tags,
      cloud: config.cloud ?? DEFAULTS.cloud,
      displayCount: config.displayCount ?? DEFAULTS.displayCount,
      noResultsText: config.noResultsText ?? DEFAULTS.noResultsText
    });
  } catch {
    if (!disposed) root.replaceChildren(statusElement(document, "Não foi possível carregar as tags populares."));
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
