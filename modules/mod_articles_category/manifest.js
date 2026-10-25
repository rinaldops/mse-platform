export const ARTICLES_CATEGORY_MANIFEST = Object.freeze({
  id: "articles-category",
  displayName: "Artigos — Categoria",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./articles-category.css"],
  type: "module",
  // Posição padrão "lateral" (ver templates/mse-default/template.json):
  // o uso típico real do mod_articles_category é "lista os artigos de UMA
  // categoria específica" num bloco lateral/complementar — nenhum caso
  // específico desta Wave justificou outra posição.
  positions: ["lateral"],
  dataSources: [
    { key: "articles", type: "list", internalName: "CAMAPPublicacoes", displayName: "MSE Publicações" },
    { key: "categories", type: "list", internalName: "MSECategories", displayName: "MSE Categorias" }
  ],
  // Mesmo princípio de mod_articles_latest/mod_articles_news: settings: true
  // (parâmetros reais — ver articles-category-settings-schema.js).
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default ARTICLES_CATEGORY_MANIFEST;
