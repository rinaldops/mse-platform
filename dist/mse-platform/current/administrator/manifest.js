import { defineModuleManifest } from "../core/module-contract.js";
export default defineModuleManifest({
  id: "administrator",
  displayName: "Administrator",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 1,
  settingsSchemaVersion: 1,
  permissions: ["read", "write", "manage-lists"],
  locales: ["pt-BR"],
  styles: ["./administrator.css"],
  dataSources: [
    { key: "menu", type: "list", internalName: "MSEMenu", displayName: "MSE Menu" },
    { key: "modules", type: "list", internalName: "MSEModulos", displayName: "MSE Módulos" },
    { key: "extensions", type: "list", internalName: "MSEExtensoes", displayName: "MSE Extensões" },
    { key: "configuration", type: "list", internalName: "MSEConfiguracoes", displayName: "MSE Configurações" },
    { key: "publications", type: "list", internalName: "CAMAPPublicacoes", displayName: "MSE Publicacoes" }
  ],
  capabilities: { full: true, summary: false, settings: true, provisioning: true, publishing: true },
  entrypoints: { full: "./component.js" },
  views: { controlpanel: true, installer: true, config: true, diagnostics: true, content: true, publisher: true, menus: true, modules: true, extensions: true },
  routeParams: ["option", "view", "task", "id"]
});
