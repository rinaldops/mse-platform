import { INSTALLER_PLUGIN_MANIFEST, createInstallerPlugin } from "./manifest.js";

export { INSTALLER_PLUGIN_MANIFEST, createInstallerPlugin };

/**
 * Validates the minimal installer contract without touching SharePoint.
 * Runtime integration may register the returned plugin with the host event bus.
 */
export function validateInstallerContract(plugin) {
  if (!plugin || typeof plugin !== "object") throw new TypeError("plugin é obrigatório.");
  if (plugin.manifest?.id !== INSTALLER_PLUGIN_MANIFEST.id) {
    throw new TypeError("plugin.manifest.id inválido.");
  }
  for (const event of INSTALLER_PLUGIN_MANIFEST.events) {
    if (typeof plugin[`on${event.slice(2)}`] !== "function") {
      throw new TypeError(`plugin não implementa ${event}.`);
    }
  }
  return true;
}
