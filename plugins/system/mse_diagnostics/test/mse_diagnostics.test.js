import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEventBus } from "../../../../kernel/events.js";
import { createPlugin, loadManifest } from "../mse_diagnostics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- manifest -------------------------------------------------------------
{
  const manifestPath = path.join(__dirname, "..", "manifest.json");
  const json = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const normalized = loadManifest(json, { manifestPath });

  assert.equal(normalized.group, "system");
  assert.equal(normalized.element, "mse_diagnostics");
  assert.ok(Array.isArray(normalized.events));
  assert.deepEqual(normalized.events, ["onAfterRoute", "onBeforeRender", "onAfterRender"]);

  console.log("mse_diagnostics.test.js: manifest ok.");
}

// --- register/dispose -----------------------------------------------------
{
  const bus = createEventBus();
  const messages = [];
  const logger = {
    info: (msg, payload) => messages.push([msg, payload])
  };

  const plugin = createPlugin();
  const instance = plugin.register({ events: bus, logger, now: () => 123 });

  bus.emit("onAfterRoute", { alias: "home" });
  bus.emit("onBeforeRender", { route: "#/" });
  bus.emit("onAfterRender", { ok: true });

  const stats = instance.getStats();
  assert.equal(stats.afterRoute, 1);
  assert.equal(stats.beforeRender, 1);
  assert.equal(stats.afterRender, 1);
  assert.deepEqual(stats.last, { event: "onAfterRender", at: 123, payload: { ok: true } });

  assert.equal(messages.length, 3);
  assert.deepEqual(messages[0][0], "mse:system:diagnostics:onAfterRoute");

  instance.dispose();

  // após dispose, não deve mais incrementar
  bus.emit("onAfterRoute", { alias: "home2" });
  const afterDispose = instance.getStats();
  assert.equal(afterDispose.afterRoute, 1);

  console.log("mse_diagnostics.test.js: register/dispose ok.");
}

console.log("mse_diagnostics.test.js: concluído com sucesso.");

