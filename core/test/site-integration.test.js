import assert from "node:assert/strict";
import { createSiteIntegration } from "../../host-adapters/modern-script-editor/site-integration.js";

await assert.rejects(
  createSiteIntegration({ webUrl: "/sites/demo", releaseBase: "/sites/demo/SiteAssets/mse-platform/releases/0.8.1", enabledModules: ["unknown"] }),
  /Módulo desconhecido/
);

const integration = await createSiteIntegration({
  webUrl: "/",
  releaseBase: "/SiteAssets/mse-platform/releases/0.8.1",
  enabledModules: ["mse-admin"],
  fetchImpl: async () => { throw new Error("A integração não deve consultar listas durante esta criação."); }
});
assert.equal(integration.services.installer.has("home"), false);
assert.equal(integration.services.installer.has("forum"), true);
assert.equal(
  integration.manifestResolver("mse-admin"),
  "/SiteAssets/mse-platform/releases/0.8.1/admin/manifest.js"
);
await assert.rejects(
  createSiteIntegration({ webUrl: "/sites/demo", enabledModules: [] }),
  /releaseBase/
);

console.log("site-integration.test.js: verificações concluídas com sucesso.");
