import assert from "node:assert/strict";
import { createEventBus } from "../../../kernel/events.js";
import plugin from "../plg-content-sanitize.js";

function createContext(overrides = {}) {
  return {
    content: {
      summaryHtml: "<p>OK</p>",
      bodyHtml: "<p><script>alert(1)</script>SAFE</p>"
    },
    sanitizeRichText: (html) => String(html).replace(/<script[\s\S]*?<\/script>/gi, ""),
    ...overrides
  };
}

// --- registra e sanitiza em onBeforeRender ---------------------------------
{
  const bus = createEventBus();
  const ctx = createContext();
  plugin.register(bus, ctx);

  bus.emit("onBeforeRender", ctx);

  assert.equal(ctx.content.summaryHtml, "<p>OK</p>");
  assert.equal(ctx.content.bodyHtml, "<p>SAFE</p>");

  console.log("plg-content-sanitize.test.js: sanitiza onBeforeRender ok.");
}

// --- não lança quando content ausente --------------------------------------
{
  const bus = createEventBus();
  const ctx = { sanitizeRichText: (html) => String(html) };
  plugin.register(bus, ctx);
  bus.emit("onAfterRoute", ctx);
  assert.ok(ctx.content && typeof ctx.content === "object");
  console.log("plg-content-sanitize.test.js: cria content quando ausente ok.");
}

// --- normaliza valores não-string ------------------------------------------
{
  const bus = createEventBus();
  const ctx = createContext({
    content: { summaryHtml: 123, bodyHtml: null },
    sanitizeRichText: (html) => `S:${String(html)}`
  });
  plugin.register(bus, ctx);
  bus.emit("onBeforeRender", ctx);
  assert.equal(ctx.content.summaryHtml, "S:123");
  assert.equal(ctx.content.bodyHtml, "S:");
  console.log("plg-content-sanitize.test.js: normaliza tipos ok.");
}

console.log("plg-content-sanitize.test.js: verificações concluídas com sucesso.");

