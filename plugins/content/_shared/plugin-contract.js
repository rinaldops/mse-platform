/**
 * Contrato mínimo de plugin (Joomla-like) — grupo `content`.
 *
 * Este contrato é propositalmente simples para permitir:
 * - testes unitários isolados;
 * - execução via `kernel/events.js#createEventBus` (sem loader global);
 * - integração futura em um loader que leia `MSEExtensions`.
 *
 * Nota: NÃO altera `kernel/` nem impõe runtime global. Quem integra fornece
 * a função `register(bus, context)`.
 */

export const CONTENT_PLUGIN_CONTRACT_VERSION = 1;

/**
 * @typedef {{
 *   route?: unknown,
 *   menuItem?: unknown,
 *   dispatch?: unknown,
 *   // Valores que podem ser transformados por plugins:
 *   content?: {
 *     title?: string,
 *     summaryHtml?: string,
 *     bodyHtml?: string,
 *     [key: string]: unknown
 *   },
 *   // Utilidades opcionais do host:
 *   sanitizeRichText?: (html: string, options?: any) => string,
 *   documentImpl?: any,
 *   baseUrl?: string,
 * }} ContentPluginContext
 */

/**
 * @typedef {{
 *   id: string,
 *   group: "content",
 *   version: string,
 *   register: (bus: { on: Function }, context: ContentPluginContext) => void,
 * }} ContentPlugin
 */

/**
 * Validacao leve do shape do plugin.
 * @param {ContentPlugin} plugin
 * @returns {ContentPlugin}
 */
export function defineContentPlugin(plugin) {
  if (!plugin || typeof plugin !== "object") throw new TypeError("plugin deve ser objeto.");
  if (typeof plugin.id !== "string" || !plugin.id.trim()) throw new TypeError("plugin.id é obrigatório.");
  if (plugin.group !== "content") throw new TypeError("plugin.group deve ser 'content'.");
  if (typeof plugin.version !== "string" || !plugin.version.trim()) throw new TypeError("plugin.version é obrigatório.");
  if (typeof plugin.register !== "function") throw new TypeError("plugin.register deve ser uma função.");
  return Object.freeze(plugin);
}

