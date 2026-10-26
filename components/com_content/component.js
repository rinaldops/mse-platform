/**
 * Componente PÚBLICO `com_content` (ver manifest.js) — monta uma das 4
 * visões (list/featured/category/article) a partir de `context.view`
 * (resolvido por `kernel/dispatcher.js`, repassado por
 * `kernel/application.js` — ver seu cabeçalho: "`view` nomeado é passado
 * ao Componente via `context`/`params` para que ELE decida internamente
 * qual sub-renderização mostrar").
 *
 * `MSE_CONTENT_FIELD_MAP`: ÚNICO lugar onde a tradução entre os campos
 * oficiais do Joomla! em `MSEContent` (`Title`/`Alias`/`Introtext`/
 * `Fulltext`/`State`/`CatId`/`Featured`/`Ordering`/`PublishUp`/
 * `PublishDown` — ver `kernel/schemas/mse-content.js`) e o shape interno
 * em português que `kernel/content-services.js`/`kernel/article-mapper.js`
 * já esperam (`titulo`/`estado`/`categoriaId`/`destaque`/`ordemDestaque`/
 * `publicarDe`/`publicarAte`) vive — mecanismo `fieldMap` já existente em
 * `kernel/articles-data.js#createArticlesReadService`, nenhuma lógica nova.
 */

import { resolveArticlesList } from "../../kernel/articles-data.js";
import { createContentReadService, listCategories } from "./content-data.js";
import { createContentView } from "./content-view.js";

const MSE_CONTENT_FIELD_MAP = Object.freeze({
  titulo: "Title",
  slug: "Alias",
  resumo: "Introtext",
  corpoHtml: "Fulltext",
  estadoEditorial: "State",
  categoria: "CatId",
  destaque: "Featured",
  ordemDestaque: "Ordering",
  publicarDe: "PublishUp",
  publicarAte: "PublishDown"
});

function statusElement(document, text) {
  const node = document.createElement("p");
  node.className = "com-content__status";
  node.textContent = text;
  return node;
}

export async function mount({ root, services, context = {}, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  const client = services?.adminClient;
  const list = resolveArticlesList(services?.listIds);
  if (!client || !list) {
    throw new TypeError("services.adminClient e a lista de conteúdo (resolveArticlesList) são obrigatórios para o Componente com_content.");
  }

  const view = context.view || config.view || "list";
  const routeAlias = context.route?.alias ?? "";
  const service = createContentReadService({ client, list, fieldMap: MSE_CONTENT_FIELD_MAP });

  let disposeView = null;
  try {
    let articles = [];
    let article = null;
    if (view === "article") {
      article = await service.findArticle(context.params?.id);
    } else if (view === "featured") {
      articles = await service.listFeatured();
    } else if (view === "category") {
      const categories = await listCategories({ client, listIds: services?.listIds });
      articles = await service.listByCategory(categories, context.params?.catid ?? null);
    } else {
      articles = await service.listPublished();
    }
    disposeView = createContentView({ root, view, articles, article, routeAlias });
  } catch {
    root.replaceChildren(statusElement(document, "Não foi possível carregar o conteúdo."));
  }

  return Object.freeze({
    dispose() {
      disposeView?.();
      root.replaceChildren();
    }
  });
}

export function dispose() {}
