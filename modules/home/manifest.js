export const HOME_MANIFEST = Object.freeze({
  id: "home",
  displayName: "Home",
  version: "0.5.0",
  coreCompatibility: ">=0.8.0 <2.0.0",
  stability: "preview",
  dataSchemaVersion: 0,
  settingsSchemaVersion: 1,
  permissions: ["read"],
  locales: ["pt-BR"],
  styles: ["./home.css"],
  dataSources: [],
  capabilities: { full: true, summary: false, settings: true, provisioning: false },
  entrypoints: { full: "./module.js" }
});

export default HOME_MANIFEST;
