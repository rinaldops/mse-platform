import { defineModuleManifest } from "../../core/module-contract.js";

/** Declarative manifest for the installer plugin. */
export const INSTALLER_PLUGIN_MANIFEST = defineModuleManifest({
  id: "installer-core",
  type: "plugin",
  displayName: "Installer lifecycle plugin",
  version: "1.0.0",
  coreCompatibility: ">=1.0.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 1,
  settingsSchemaVersion: 1,
  permissions: ["read", "write", "manage-lists"],
  dataSources: [],
  locales: ["pt-BR"],
  capabilities: { full: true, summary: false, settings: false, provisioning: true },
  entrypoints: { full: "./plugin.js" },
  events: ["onInstallerInspect", "onInstallerVerify", "onInstallerApply"]
});

function requireHandler(handler, name) {
  if (typeof handler !== "function") throw new TypeError(`${name} deve ser uma função.`);
  return handler;
}

/**
 * Creates the installer plugin adapter. The plugin is deliberately side-effect
 * free: callers decide when an inspect, verify or apply operation is allowed.
 * `apply` receives an explicit confirmation callback and never writes itself.
 */
export function createInstallerPlugin({ inspect, verify, apply } = {}) {
  requireHandler(inspect, "inspect");
  requireHandler(verify, "verify");
  requireHandler(apply, "apply");

  return Object.freeze({
    manifest: INSTALLER_PLUGIN_MANIFEST,
    async onInstallerInspect(context = {}) { return inspect(context); },
    async onInstallerVerify(context = {}) { return verify(context); },
    async onInstallerApply(context = {}, confirm) {
      requireHandler(confirm, "confirm");
      return apply(context, confirm);
    }
  });
}
