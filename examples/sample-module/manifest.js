import { defineModuleManifest } from "../../core/module-contract.js";

export default defineModuleManifest({
  id: "sample",
  displayName: "Módulo de exemplo",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <1.0.0",
  stability: "experimental",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR", "en-US"],
  styles: [],
  dataSources: [],
  capabilities: { full: true, summary: false, settings: true, provisioning: false },
  entrypoints: { full: "./module.js" }
});
