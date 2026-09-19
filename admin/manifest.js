import { defineModuleManifest } from "../core/module-contract.js";

export default defineModuleManifest({
  id: "mse-admin",
  displayName: "MSE Platform Admin",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <1.0.0",
  stability: "preview",
  dataSchemaVersion: 2,
  settingsSchemaVersion: 1,
  permissions: ["read", "write", "manage-lists"],
  locales: ["pt-BR"],
  styles: ["./admin.css"],
  dataSources: [
    { key: "configuration", type: "list", internalName: "MSEConfiguracoes", displayName: "MSE Configurações" }
  ],
  capabilities: { full: true, summary: false, settings: false, provisioning: true },
  entrypoints: { full: "./module.js" }
});
