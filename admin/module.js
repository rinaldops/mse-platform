import { mountAdminCenter } from "./admin-center.js";
import { createDefaultCatalog } from "./default-catalog.js";
import { generateMseSnippet } from "./snippet-generator.js";

export function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  if (!services?.configurationStore) throw new TypeError("services.configurationStore é obrigatório.");
  const center = mountAdminCenter({
    root,
    catalog: services.catalog ?? createDefaultCatalog(),
    configurationStore: services.configurationStore,
    installer: services.installer,
    diagnose: services.diagnose,
    provisionConfiguration: services.provisionConfiguration,
    preview: services.preview,
    generateSnippet: ({ moduleId, instanceId, view }) => generateMseSnippet({
      moduleId,
      instanceId,
      view,
      releaseBase: config.admin?.releaseBase,
      coreVersion: config.admin?.coreVersion ?? "0.8.0"
    })
  });
  return Object.freeze({ dispose: center.dispose });
}

export function dispose() {}
