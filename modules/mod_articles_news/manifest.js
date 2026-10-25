export const ARTICLES_NEWS_MANIFEST = Object.freeze({
  id: "articles-news",
  displayName: "Artigos — Destaques (News Flash)",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./articles-news.css"],
  type: "module",
  // Posição padrão "lateral" (ver templates/mse-default/template.json):
  // mesmo princípio de mod_articles_latest — nenhum caso específico desta
  // Wave justificou outra posição para o equivalente do "News Flash".
  positions: ["lateral"],
  dataSources: [
    { key: "articles", type: "list", internalName: "CAMAPPublicacoes", displayName: "MSE Publicações" }
  ],
  // Mesmo princípio de mod_articles_latest: settings: true (este módulo tem
  // parâmetros reais — ver articles-news-settings-schema.js).
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default ARTICLES_NEWS_MANIFEST;
