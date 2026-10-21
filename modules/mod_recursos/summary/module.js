import { createRecursosSummaryView } from "../recursos-view.js";

function readService(services) {
  const service = services?.["explore-mais"] ?? services?.recursos ?? services?.service;
  if (!service || typeof service.listGroupedLinks !== "function") {
    throw new TypeError("O serviço de leitura do Explore Mais é obrigatório.");
  }
  return service;
}

export function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const cleanup = createRecursosSummaryView({
    root,
    service: readService(services),
    pageHref: config.recursosSummary?.pageHref,
    limit: config.recursosSummary?.limit ?? 4
  });
  return Object.freeze({ dispose: () => cleanup?.() });
}

export function dispose() {}
