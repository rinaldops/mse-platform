export const RECURSOS_MANIFEST = Object.freeze({
  id: "explore-mais",
  displayName: "Explore Mais",
  version: "0.5.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 3,
  settingsSchemaVersion: 1,
  permissions: ["read", "write", "manage-lists"],
  locales: ["pt-BR"],
  styles: ["./recursos.css"],
  dataSources: [
    { key: "links", type: "list", internalName: "RecursosLinks", displayName: "Explore Mais - Links" }
  ],
  capabilities: { full: true, summary: true, settings: true, provisioning: true },
  entrypoints: { full: "./module.js", summary: "./summary/module.js" }
});

export default RECURSOS_MANIFEST;
