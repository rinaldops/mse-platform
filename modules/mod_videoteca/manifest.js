export const VIDEOTECA_MANIFEST = Object.freeze({
  id: "videoteca",
  displayName: "Videoteca",
  version: "0.9.1",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 7,
  settingsSchemaVersion: 2,
  permissions: ["read", "write", "manage-lists"],
  locales: ["pt-BR"],
  styles: ["./videoteca.css"],
  dataSources: [
    { key: "taxonomy", type: "list", internalName: "VideotecaTaxonomia", displayName: "Videoteca - Taxonomia" },
    { key: "videos", type: "library", internalName: "VideotecaVideos", displayName: "Videoteca - Vídeos" },
    { key: "video-tags", type: "list", internalName: "VideotecaVideoTags", displayName: "Videoteca - Tags dos vídeos" }
  ],
  capabilities: { full: true, summary: true, settings: true, provisioning: true },
  entrypoints: { full: "./module.js", summary: "./summary/module.js" }
});

export default VIDEOTECA_MANIFEST;
