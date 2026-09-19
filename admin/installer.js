import { inspectLists, provisionLists, verifyLists } from "../core/list-provisioning.js";

export function createModuleInstaller({ schemasByModule, client, webUrl, fetchImpl } = {}) {
  if (!schemasByModule || typeof schemasByModule !== "object") throw new TypeError("schemasByModule é obrigatório.");
  const options = (moduleId) => {
    const schemas = schemasByModule[moduleId];
    if (!Array.isArray(schemas) || !schemas.length) throw new TypeError(`Schemas não registrados para ${moduleId}.`);
    return { schemas, client, webUrl, fetchImpl };
  };
  return Object.freeze({
    has: (moduleId) => Array.isArray(schemasByModule[moduleId]) && schemasByModule[moduleId].length > 0,
    inspect: (moduleId) => inspectLists(options(moduleId)),
    apply: (moduleId, confirm) => provisionLists({ ...options(moduleId), confirm }),
    verify: (moduleId) => verifyLists(options(moduleId))
  });
}
