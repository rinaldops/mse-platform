export const FORUM_MANIFEST = Object.freeze({
  id: "forum",
  displayName: "Fórum",
  version: "0.5.1",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 6,
  settingsSchemaVersion: 2,
  permissions: ["read", "write", "manage-lists", "send-mail"],
  locales: ["pt-BR"],
  styles: ["./forum.css"],
  dataSources: [
    { key: "taxonomy", type: "list", internalName: "ForumTaxonomia", displayName: "Fórum - Taxonomia" },
    { key: "topics", type: "list", internalName: "ForumTopicos", displayName: "Fórum - Tópicos" },
    { key: "answers", type: "list", internalName: "ForumRespostas", displayName: "Fórum - Respostas" },
    { key: "reactions", type: "list", internalName: "ForumReacoes", displayName: "Fórum - Reações" },
    { key: "preferences", type: "list", internalName: "ForumPreferencias", displayName: "Fórum - Preferências" },
    { key: "media", type: "library", internalName: "ForumMidia", displayName: "Fórum - Mídia" }
  ],
  capabilities: { full: true, summary: true, settings: true, provisioning: true },
  entrypoints: { full: "./module.js", summary: "./summary/module.js" }
});

export default FORUM_MANIFEST;
