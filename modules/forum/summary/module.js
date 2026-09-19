import { createForumSummaryView } from "../forum-view.js";

export function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const service = services?.forum ?? services?.service;
  if (!service || typeof service.listTopics !== "function") {
    throw new TypeError("O serviço de dados do Fórum é obrigatório.");
  }
  const cleanup = createForumSummaryView({
    root,
    service,
    pageHref: config.forumSummary?.pageHref,
    limit: config.forumSummary?.limit ?? 6
  });
  return Object.freeze({ dispose: () => cleanup?.() });
}

export function dispose() {}
