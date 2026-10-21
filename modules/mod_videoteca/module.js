import { createVideotecaView } from "./videoteca-view.js";

function readService(services) {
  const service = services?.videoteca ?? services?.service;
  if (!service || typeof service.listCatalog !== "function") {
    throw new TypeError("O serviço de leitura da Videoteca é obrigatório.");
  }
  return service;
}

export function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const cleanup = createVideotecaView({
    root,
    service: readService(services),
    reducedMotion: config.accessibility?.reducedMotion,
    presenterSuffixes: config.videoteca?.presenterSuffixes
  });
  return Object.freeze({ dispose: () => cleanup?.() });
}

export function dispose() {}
