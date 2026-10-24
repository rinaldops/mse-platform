import { sanitizeRichText } from "../../../core/rich-text.js";
import { defineContentPlugin } from "../_shared/plugin-contract.js";

function safeString(value) {
  return value == null ? "" : String(value);
}

function ensureContent(context) {
  if (!context.content || typeof context.content !== "object") {
    context.content = {};
  }
  return context.content;
}

function resolveSanitizer(context) {
  if (typeof context?.sanitizeRichText === "function") return context.sanitizeRichText;
  return (html, options) => sanitizeRichText(String(html ?? ""), options);
}

/**
 * Plugin: sanitiza `content.summaryHtml` e `content.bodyHtml`.
 *
 * - Não muta outros campos.
 * - Não lança quando não há conteúdo; apenas normaliza para string.
 */
export default defineContentPlugin({
  id: "plg-content-sanitize",
  group: "content",
  version: "0.1.0",
  register(bus, context) {
    const sanitize = resolveSanitizer(context);

    const handler = (payload) => {
      const ctx = payload ?? context;
      if (!ctx || typeof ctx !== "object") return;
      const content = ensureContent(ctx);
      const options = {
        documentImpl: ctx.documentImpl,
        baseUrl: ctx.baseUrl
      };

      if (content.summaryHtml !== undefined) {
        content.summaryHtml = sanitize(safeString(content.summaryHtml), options);
      }
      if (content.bodyHtml !== undefined) {
        content.bodyHtml = sanitize(safeString(content.bodyHtml), options);
      }
    };

    // Assinatura em ambos eventos para acomodar diferentes estágios do pipeline.
    bus.on("onAfterRoute", handler);
    bus.on("onBeforeRender", handler);
  }
});

