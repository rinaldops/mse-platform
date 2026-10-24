export const SEARCH_MANIFEST = Object.freeze({
  id: "search",
  displayName: "Busca",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./search.css"],
  type: "module",
  positions: ["lateral"],
  // Reaproveita a lista de artigos já lida por `kernel/articles-data.js`
  // (mesmo serviço usado pela família mod_articles_*) — nenhum
  // `dataSources` próprio: o nome interno da lista de artigos não é fixo
  // no kernel (ver `kernel/articles-data.js#resolveArticlesList`), então
  // não há um `internalName` único e estável para declarar aqui.
  dataSources: [],
  // Mesmo princípio de mod_menu/mod_breadcrumbs: renderModules
  // (kernel/application.js) sempre monta módulos de posição com
  // entrypointKey "summary" — full e summary apontam para o mesmo
  // arquivo porque não há uma versão "resumida" distinta deste módulo.
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default SEARCH_MANIFEST;
