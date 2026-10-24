export const FOOTER_MANIFEST = Object.freeze({
  id: "footer",
  displayName: "Rodapé",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./footer.css"],
  type: "module",
  positions: ["rodape"],
  dataSources: [],
  // Mesmo princípio de mod_menu/mod_breadcrumbs: renderModules
  // (kernel/application.js) sempre monta módulos de posição com
  // entrypointKey "summary" — full e summary apontam para o mesmo arquivo.
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default FOOTER_MANIFEST;
