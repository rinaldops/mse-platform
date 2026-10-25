export const ARTICLES_LATEST_MANIFEST = Object.freeze({
  id: "articles-latest",
  displayName: "Artigos — Mais recentes",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./articles-latest.css"],
  type: "module",
  // Posição padrão "lateral" (ver templates/mse-default/template.json):
  // mesma posição típica do mod_articles_latest real do Joomla! (sidebar de
  // "últimas notícias"); nenhum caso específico desta Wave justificou outra.
  positions: ["lateral"],
  dataSources: [
    // Convenção documental (mesma de mod_menu/mod_breadcrumbs) — a resolução
    // de fato usa kernel/articles-data.js#resolveArticlesList, não este array.
    { key: "articles", type: "list", internalName: "CAMAPPublicacoes", displayName: "MSE Publicações" }
  ],
  // Mesmo princípio de mod_menu: renderModules (kernel/application.js)
  // sempre monta módulos de posição com entrypointKey "summary" — full e
  // summary apontam para o mesmo arquivo porque não há uma versão
  // "resumida" distinta deste módulo. settings: true (diferente de
  // mod_menu/mod_breadcrumbs) porque este módulo tem parâmetros reais
  // (catid/count/show_featured/ordering — ver articles-latest-settings-schema.js).
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default ARTICLES_LATEST_MANIFEST;
