/**
 * @typedef {Object} MsePlugin
 * @property {string} name
 * @property {string} group
 * @property {string} element
 * @property {string} version
 * @property {string[]} events
 * @property {(ctx: any) => void | Promise<void>} register
 */

/**
 * @typedef {Object} MsePluginLoadResult
 * @property {MsePlugin[]} plugins
 * @property {string[]} warnings
 */

/**
 * Valida e normaliza um Manifest de plugin.
 *
 * Regras mínimas nesta fase:
 * - `group` obrigatório (para este PR, suportamos apenas `system`).
 * - `element` obrigatório (nome da pasta do plugin).
 * - `entry` obrigatório e relativo ao root do repo.
 * - `events` obrigatório (strings).
 *
 * @param {any} manifest
 * @param {{ manifestPath: string }} opts
 * @returns {{ ok: true, value: any } | { ok: false, error: Error }}
 */
export function validatePluginManifest(manifest, { manifestPath }) {
  try {
    if (!manifest || typeof manifest !== "object") {
      throw new TypeError("Manifest deve ser um objeto.");
    }

    const group = String(manifest.group || "").trim();
    const element = String(manifest.element || "").trim();
    const entry = String(manifest.entry || "").trim();
    const events = manifest.events;

    if (!group) throw new TypeError("Manifest.group é obrigatório.");
    if (!element) throw new TypeError("Manifest.element é obrigatório.");
    if (!entry) throw new TypeError("Manifest.entry é obrigatório.");
    if (!Array.isArray(events) || events.length === 0 || !events.every((e) => typeof e === "string" && e.trim() !== "")) {
      throw new TypeError("Manifest.events deve ser um array não-vazio de strings.");
    }

    return {
      ok: true,
      value: {
        name: String(manifest.name || `plg_${group}_${element}`),
        group,
        element,
        version: String(manifest.version || "0.0.0"),
        title: String(manifest.title || manifest.name || element),
        description: String(manifest.description || ""),
        entry,
        events: events.map((e) => e.trim()),
        provides: manifest.provides || null
      }
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    error.message = `[${manifestPath}] ${error.message}`;
    return { ok: false, error };
  }
}
