export const BREADCRUMBS_MANIFEST = Object.freeze({
  id: "breadcrumbs",
  displayName: "Trilha de navegação",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./breadcrumbs.css"],
  type: "module",
  positions: ["breadcrumbs"],
  dataSources: [
    { key: "items", type: "list", internalName: "MSEMenu", displayName: "MSE Itens de menu" }
  ],
  // Mesmo princípio de mod_menu: renderModules (kernel/application.js)
  // sempre monta módulos de posição com entrypointKey "summary" — full e
  // summary apontam para o mesmo arquivo porque não há uma versão
  // "resumida" distinta deste módulo.
  capabilities: { full: true, summary: true, settings: false, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default BREADCRUMBS_MANIFEST;
