import assert from "node:assert/strict";
import { createEventBus } from "../../../kernel/events.js";

import { CONTENT_PLUGIN_CONTRACT_VERSION, defineContentPlugin } from "../_shared/plugin-contract.js";
import sanitizePlugin from "../sanitize/plg-content-sanitize.js";
import sanitizeManifest from "../sanitize/manifest.js";

// --- Contrato --------------------------------------------------------------
assert.equal(CONTENT_PLUGIN_CONTRACT_VERSION, 1);

assert.throws(
  () => defineContentPlugin({}),
  /plugin\.id/i,
  "defineContentPlugin deve validar shape mínimo"
);

// --- Manifesto do plugin (Joomla-like) ------------------------------------
assert.equal(sanitizeManifest.type, "plugin");
assert.ok(Array.isArray(sanitizeManifest.events) && sanitizeManifest.events.length > 0);
assert.ok(sanitizeManifest.entrypoints?.full);

// --- Execução isolada via event bus ---------------------------------------
{
  const bus = createEventBus();
  const context = {
    content: {
      summaryHtml: "<p>Hi</p>",
      bodyHtml: "<p><script>alert(1)</script>OK</p>"
    },
    // Sanitizador fake (determinístico, sem DOM)
    sanitizeRichText: (html) => String(html).replace(/<script[\s\S]*?<\/script>/gi, "")
  };

  sanitizePlugin.register(bus, context);
  bus.emit("onBeforeRender", context);

  assert.equal(context.content.summaryHtml, "<p>Hi</p>");
  assert.equal(context.content.bodyHtml, "<p>OK</p>");
}

console.log("plugins/content: verificações concluídas com sucesso.");
