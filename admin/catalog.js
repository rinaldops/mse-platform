import { defineModuleManifest, defineSettingsSchema } from "../core/module-contract.js";

export function createModuleCatalog(entries = []) {
  const modules = new Map();
  entries.forEach(({ manifest, settingsSchema }) => {
    const normalizedManifest = defineModuleManifest(manifest);
    if (modules.has(normalizedManifest.id)) throw new TypeError(`Módulo duplicado: ${normalizedManifest.id}.`);
    modules.set(normalizedManifest.id, Object.freeze({
      manifest: normalizedManifest,
      settingsSchema: defineSettingsSchema(settingsSchema)
    }));
  });
  return Object.freeze({
    list: () => Object.freeze([...modules.values()]),
    get: (id) => modules.get(id) ?? null
  });
}
