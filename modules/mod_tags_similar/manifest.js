export const TAGS_SIMILAR_MANIFEST = Object.freeze({
  id: "tags-similar",
  displayName: "Artigos similares (por tags)",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./tags-similar.css"],
  type: "module",
  positions: ["lateral"],
  dataSources: [
    // Nome lógico documental: o internalName real é resolvido em runtime por
    // fallback (`kernel/articles-data.js#resolveArticlesList`, mesma lista de
    // `CAMAPPublicacoes`/`MSEPublicacoes`/`Publicacoes`/`publicacoes`/
    // `publisher`) — `MSEPublicacoes` aqui é só a entrada principal para fins
    // de documentação do manifesto, não um nome fixo.
    { key: "articles", type: "list", internalName: "MSEPublicacoes", displayName: "Artigos" },
    { key: "tags", type: "list", internalName: "MSETags", displayName: "MSE Tags" }
  ],
  // Mesmo princípio de mod_menu/mod_breadcrumbs/mod_footer/mod_tags_popular:
  // renderModules (kernel/application.js) sempre monta módulos de posição
  // com entrypointKey "summary" — full e summary apontam para o mesmo
  // arquivo.
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default TAGS_SIMILAR_MANIFEST;
