// Barrel (conveniência) do grupo `plugins/content`.
// Mantém importações legíveis em consumidores e testes isolados.

export { CONTENT_PLUGIN_GROUP } from "./manifest.js";
export { CONTENT_PLUGIN_CONTRACT_VERSION, defineContentPlugin } from "./_shared/plugin-contract.js";

export { default as plgContentSanitizeManifest } from "./sanitize/manifest.js";
export { default as plgContentSanitize } from "./sanitize/plg-content-sanitize.js";
