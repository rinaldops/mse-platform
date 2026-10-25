export const ARTICLES_ARCHIVE_MANIFEST = Object.freeze({
  id: "articles-archive",
  displayName: "Artigos — Arquivo",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./articles-archive.css"],
  type: "module",
  // Posição padrão "lateral" (ver templates/mse-default/template.json):
  // mesmo princípio dos demais módulos desta Wave.
  positions: ["lateral"],
  dataSources: [
    { key: "articles", type: "list", internalName: "CAMAPPublicacoes", displayName: "MSE Publicações" }
  ],
  // Mesmo princípio dos demais módulos desta Wave: settings: true.
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default ARTICLES_ARCHIVE_MANIFEST;
