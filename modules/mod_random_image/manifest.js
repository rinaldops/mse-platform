export const RANDOM_IMAGE_MANIFEST = Object.freeze({
  id: "random-image",
  displayName: "Imagem aleatória",
  version: "0.1.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./random-image.css"],
  type: "module",
  positions: ["lateral"],
  dataSources: [
    // MSEMedia é o internalName FIXO desta lista (ao contrário de MSEPublicacoes):
    // ver kernel/schemas/mse-media.js e components/com_media/, já consumido do
    // mesmo jeito direto (sem lista de fallback) por
    // components/com_media/media-editor.js (`services.listIds?.MSEMedia`).
    { key: "media", type: "list", internalName: "MSEMedia", displayName: "MSE Media" }
  ],
  // Mesmo princípio de mod_menu/mod_breadcrumbs/mod_footer/mod_tags_popular/
  // mod_tags_similar/mod_related_items: renderModules (kernel/application.js)
  // sempre monta módulos de posição com entrypointKey "summary" — full e
  // summary apontam para o mesmo arquivo.
  capabilities: { full: true, summary: true, settings: true, provisioning: false },
  entrypoints: { full: "./module.js", summary: "./module.js" }
});

export default RANDOM_IMAGE_MANIFEST;
