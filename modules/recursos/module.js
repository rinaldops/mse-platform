import { createRecursosView } from "./recursos-view.js";

function readService(services) {
  const service = services?.["explore-mais"] ?? services?.recursos ?? services?.service;
  if (!service || typeof service.listGroupedLinks !== "function") {
    throw new TypeError("O serviço de leitura do Explore Mais é obrigatório.");
  }
  return service;
}

export function mount({ root, services } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const cleanup = createRecursosView({ root, service: readService(services) });
  return Object.freeze({ dispose: () => cleanup?.() });
}

export function dispose() {}
