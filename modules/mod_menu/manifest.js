export const MENU_MANIFEST = Object.freeze({
  id: "menu",
  displayName: "Menu",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./menu.css"],
  type: "module",
  positions: ["menu-principal"],
  dataSources: [
    { key: "items", type: "list", internalName: "MSEMenu", displayName: "MSE Itens de menu" }
  ],
  // `renderModules` (kernel/application.js) sempre monta módulos de posição
  // com entrypointKey "summary" — nunca "full". Por isso full/summary
  // apontam para o mesmo arquivo: não há uma "versão resumida" distinta
  // deste módulo (ver docs/JOOMLA-CONVENCOES-E-MIGRACAO.md e mod_home, que
  // é montado como Componente, não se aplica aqui).
  capabilities: { full: true, summary: true, settings: false, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default MENU_MANIFEST;
