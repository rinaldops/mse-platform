export const ARTICLES_CATEGORIES_MANIFEST = Object.freeze({
  id: "articles-categories",
  displayName: "Artigos — Lista de Categorias",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./articles-categories.css"],
  type: "module",
  // Posição padrão "lateral" (ver templates/mse-default/template.json):
  // mesmo princípio dos demais módulos desta Wave — uma lista de
  // categorias é tipicamente um bloco lateral de navegação complementar.
  positions: ["lateral"],
  dataSources: [
    { key: "categories", type: "list", internalName: "MSECategories", displayName: "MSE Categorias" }
  ],
  // Mesmo princípio dos demais módulos desta Wave: settings: true.
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default ARTICLES_CATEGORIES_MANIFEST;
