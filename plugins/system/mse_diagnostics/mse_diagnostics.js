import { validatePluginManifest } from "../_shared/plugin-contract.js";

/**
 * Cria o plugin de diagnósticos do grupo `system`.
 *
 * Contrato mínimo (fase atual):
 * - `register({ events, logger?, now? })` registra handlers no event bus.
 * - retorna `dispose()` para desregistrar.
 */
export function createPlugin() {
  return {
    register(ctx) {
      if (!ctx || typeof ctx !== "object") {
        throw new TypeError("ctx é obrigatório.");
      }
      const events = ctx.events;
      if (!events || typeof events.on !== "function" || typeof events.off !== "function") {
        throw new TypeError("ctx.events deve expor on/off.");
      }

      const logger = ctx.logger && typeof ctx.logger.info === "function" ? ctx.logger : console;
      const now = typeof ctx.now === "function" ? ctx.now : () => Date.now();

      const stats = {
        afterRoute: 0,
        beforeRender: 0,
        afterRender: 0,
        last: null
      };

      function onAfterRoute(payload) {
        stats.afterRoute += 1;
        stats.last = { event: "onAfterRoute", at: now(), payload };
        logger.info?.("mse:system:diagnostics:onAfterRoute", { count: stats.afterRoute });
      }

      function onBeforeRender(payload) {
        stats.beforeRender += 1;
        stats.last = { event: "onBeforeRender", at: now(), payload };
        logger.info?.("mse:system:diagnostics:onBeforeRender", { count: stats.beforeRender });
      }

      function onAfterRender(payload) {
        stats.afterRender += 1;
        stats.last = { event: "onAfterRender", at: now(), payload };
        logger.info?.("mse:system:diagnostics:onAfterRender", { count: stats.afterRender });
      }

      events.on("onAfterRoute", onAfterRoute);
      events.on("onBeforeRender", onBeforeRender);
      events.on("onAfterRender", onAfterRender);

      return Object.freeze({
        getStats: () => ({ ...stats, last: stats.last ? { ...stats.last } : null }),
        dispose: () => {
          events.off("onAfterRoute", onAfterRoute);
          events.off("onBeforeRender", onBeforeRender);
          events.off("onAfterRender", onAfterRender);
        }
      });
    }
  };
}

/**
 * Helper: carrega e valida o manifest no formato suportado por este plugin.
 * @param {any} manifestJson
 * @param {{ manifestPath: string }} opts
 */
export function loadManifest(manifestJson, opts) {
  const res = validatePluginManifest(manifestJson, opts);
  if (!res.ok) throw res.error;
  return res.value;
}
