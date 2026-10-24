/**
 * plugins/extension/manifest-validator
 *
 * Plugin de grupo `extension` inspirado no Joomla (plugins/extension/*):
 * executa validações transversais sobre manifestos de extensões carregadas.
 *
 * Escopo deliberadamente mínimo:
 * - Não altera kernel nem adiciona novos hooks no runtime.
 * - Apenas exporta um `createPlugin()` que devolve handlers para eventos.
 * - Usa `defineModuleManifest` (core/module-contract.js) como validação.
 *
 * Integração esperada (futura): o host/kernel chamará `plugin.onAfterRoute`
 * para validar manifestos já carregados no boot.
 */

import { defineModuleManifest } from "../../../core/module-contract.js";

/**
 * @typedef {{
 *   elemento: string,
 *   manifest: unknown,
 *   manifestUrl?: string
 * }} LoadedManifest
 */

/**
 * @typedef {{
 *   manifests?: LoadedManifest[],
 *   errors?: any[],
 *   warn?: (message: string, meta?: any) => void
 * }} AfterRoutePayload
 */

/**
 * Cria instância do plugin.
 *
 * @param {{ mode?: "throw"|"collect" }} [options]
 * - throw: lança no primeiro manifesto inválido (útil em testes/CI)
 * - collect: acumula erros em `payload.errors` (default)
 */
export function createPlugin(options = {}) {
  const mode = options.mode === "throw" ? "throw" : "collect";

  function onAfterRoute(payload) {
    const manifests = payload?.manifests;
    if (!Array.isArray(manifests) || manifests.length === 0) return;

    for (const entry of manifests) {
      try {
        // valida e normaliza o objeto manifest (lança se inválido)
        defineModuleManifest(entry?.manifest);
      } catch (error) {
        const meta = {
          elemento: entry?.elemento ?? null,
          manifestUrl: entry?.manifestUrl ?? null
        };
        if (mode === "throw") {
          // reempacota com contexto sem perder o erro original.
          const e = new Error(`manifest-validator: manifesto inválido${meta.elemento ? ` (elemento=${meta.elemento})` : ""}`);
          e.cause = error;
          e.meta = meta;
          throw e;
        }
        if (Array.isArray(payload.errors)) payload.errors.push({ error, meta });
        else payload.errors = [{ error, meta }];
        payload.warn?.("manifest-validator: manifesto inválido", meta);
      }
    }
  }

  return Object.freeze({ onAfterRoute });
}

export default { createPlugin };
