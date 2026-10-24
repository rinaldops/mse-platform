import assert from "node:assert/strict";
import { createPlugin } from "../manifest-validator.js";

function validManifest() {
  return {
    id: "test-extension",
    displayName: "Test Extension",
    version: "0.1.0",
    coreCompatibility: ">=0.8.0 <2.0.0",
    stability: "preview",
    dataSchemaVersion: 1,
    settingsSchemaVersion: 1,
    permissions: ["read"],
    locales: ["pt-BR"],
    styles: [],
    dataSources: [],
    capabilities: { full: true, summary: false, settings: true, provisioning: false },
    entrypoints: { full: "./component.js" },
    type: "component",
    views: { full: true }
  };
}

// --- collect mode (default) -------------------------------------------------
{
  const plugin = createPlugin();
  const payload = {
    manifests: [
      { elemento: "ok", manifest: validManifest(), manifestUrl: "https://example/ok/manifest.js" },
      { elemento: "bad", manifest: { nope: true }, manifestUrl: "https://example/bad/manifest.js" }
    ],
    errors: [],
    warnCalls: [],
    warn(message, meta) {
      this.warnCalls.push({ message, meta });
    }
  };

  plugin.onAfterRoute(payload);

  assert.equal(payload.errors.length, 1);
  assert.equal(payload.errors[0].meta.elemento, "bad");
  assert.equal(payload.warnCalls.length, 1);
  assert.match(payload.warnCalls[0].message, /manifest-validator/);
}

// --- throw mode -------------------------------------------------------------
{
  const plugin = createPlugin({ mode: "throw" });
  const payload = {
    manifests: [{ elemento: "bad", manifest: { nope: true }, manifestUrl: "https://example/bad/manifest.js" }]
  };

  assert.throws(() => plugin.onAfterRoute(payload), (err) => {
    assert.match(String(err.message), /manifest-validator/);
    assert.ok(err.cause);
    assert.equal(err.meta.elemento, "bad");
    return true;
  });
}

console.log("manifest-validator.test.js: ok");
