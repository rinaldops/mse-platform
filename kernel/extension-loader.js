/**
 * Opt-in loader for kernel extensions based on MSEExtensions rows.
 *
 * This module is intentionally NOT integrated into kernel/application.js.
 * Callers must opt-in by explicitly creating and using this loader.
 *
 * Responsibilities:
 * - Resolve which extensions are enabled for a given client (Site/Admin).
 * - Provide helper to import manifests/entrypoints with host-provided import.
 * - Enforce minimal compatibility (coreCompatibility) before loading.
 * - Provide plugin event execution (opt-in) over kernel event bus.
 *
 * Non-goals:
 * - No global activation.
 * - No network / no SharePoint access.
 * - No changes to existing extension-registry.js.
 */

import { defineModuleManifest } from "../core/module-contract.js";
import { listByClientId, listByType, sortPlugins } from "./extension-registry.js";
import { isManifestCompatibleWithCore, parseExtensionParams } from "./extension-compatibility.js";

function toArray(items) {
  return Array.isArray(items) ? items : [];
}

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeClientId(value) {
  const text = safeText(value);
  if (!text) return "Site";
  if (text === "Administrator" || text === "Site") return text;
  return "Site";
}

function parseClientOverrides(params) {
  const clientId = normalizeClientId(params?.clientId ?? params?.ClientId);
  const manifestUrl = safeText(params?.manifestUrl ?? params?.ManifestUrl);
  const entrypointUrl = safeText(params?.entrypointUrl ?? params?.EntrypointUrl);
  const pluginUrl = safeText(params?.pluginUrl ?? params?.PluginUrl);
  const view = safeText(params?.view ?? params?.View);
  return Object.freeze({ clientId, manifestUrl, entrypointUrl, pluginUrl, view });
}

/**
 * @typedef {object} LoaderOptions
 * @property {string} coreVersion The running mse-core version.
 * @property {Array<object>} extensionsItems Rows from MSEExtensions list.
 * @property {"Site"|"Administrator"} [clientId]
 * @property {(element: string, type: "Component"|"Module"|"Plugin"|"Template", clientId: "Site"|"Administrator") => string} [resolveManifestUrl]
 * @property {(element: string, type: "Component"|"Module"|"Plugin"|"Template", clientId: "Site"|"Administrator") => string} [resolveEntrypointUrl]
 * @property {(url: string) => Promise<any>} importModule Host-provided dynamic import.
 */

/**
 * Creates an opt-in loader instance.
 *
 * @param {LoaderOptions} options
 */
export function createExtensionLoader(options = {}) {
  const coreVersion = safeText(options.coreVersion);
  if (!coreVersion) throw new TypeError("coreVersion é obrigatório.");
  if (typeof options.importModule !== "function") throw new TypeError("importModule é obrigatório.");

  const defaultClientId = normalizeClientId(options.clientId);
  const items = toArray(options.extensionsItems);

  const resolveManifestUrl = typeof options.resolveManifestUrl === "function"
    ? options.resolveManifestUrl
    : (element, type, clientId) => {
        throw new Error(`resolveManifestUrl ausente (element=${element}, type=${type}, client=${clientId}).`);
      };

  const resolveEntrypointUrl = typeof options.resolveEntrypointUrl === "function"
    ? options.resolveEntrypointUrl
    : (element, type, clientId) => {
        // Default heuristic aligned with host-adapters/site-boot.js conventions.
        if (type === "Component") return resolveManifestUrl(element, type, clientId).replace(/\/manifest\.js$/, "/component.js");
        if (type === "Module") return resolveManifestUrl(element, type, clientId).replace(/\/manifest\.js$/, "/module.js");
        if (type === "Plugin") return resolveManifestUrl(element, type, clientId).replace(/\/manifest\.js$/, "/plugin.js");
        return resolveManifestUrl(element, type, clientId);
      };

  function listEnabledByType(type, clientId = defaultClientId) {
    const scoped = listByClientId(items, clientId);
    const typed = listByType(scoped, type);
    return typed.filter((item) => item && item.Enabled === true);
  }

  async function loadManifestForExtension(row) {
    const element = safeText(row?.Element);
    const type = safeText(row?.Type);
    const clientId = normalizeClientId(row?.ClientId ?? defaultClientId);
    if (!element) throw new TypeError("Elemento ausente em extensão.");
    if (!type) throw new TypeError(`Type ausente em extensão (${element}).`);

    const params = parseExtensionParams(row?.ParamsJson);
    const overrides = parseClientOverrides(params);
    const effectiveClientId = overrides.clientId || clientId;

    const manifestUrl = overrides.manifestUrl || resolveManifestUrl(element, type, effectiveClientId);
    const module = await options.importModule(manifestUrl);
    const manifestCandidate = module?.default ?? module?.manifest;
    const manifest = defineModuleManifest(manifestCandidate);

    if (!isManifestCompatibleWithCore(manifest, coreVersion)) {
      const compat = safeText(manifest.coreCompatibility);
      throw new Error(`Extensão "${manifest.id}" incompatível com mse-core ${coreVersion} (coreCompatibility=${compat}).`);
    }

    return Object.freeze({
      row,
      element,
      type,
      clientId: effectiveClientId,
      params,
      overrides,
      manifest,
      manifestUrl
    });
  }

  async function loadEntrypointForExtension(loaded, kind) {
    // kind: "component" | "module" | "plugin"
    const { element, type, clientId, overrides, manifestUrl, manifest } = loaded;

    if (kind === "component") {
      const url = overrides.entrypointUrl || resolveEntrypointUrl(element, "Component", clientId);
      const entryModule = await options.importModule(url);
      return Object.freeze({ url, module: entryModule, manifest });
    }

    if (kind === "module") {
      const url = overrides.entrypointUrl || resolveEntrypointUrl(element, "Module", clientId);
      const entryModule = await options.importModule(url);
      return Object.freeze({ url, module: entryModule, manifest });
    }

    if (kind === "plugin") {
      const url = overrides.pluginUrl || resolveEntrypointUrl(element, "Plugin", clientId);
      const entryModule = await options.importModule(url);
      return Object.freeze({ url, module: entryModule, manifest });
    }

    // fallback
    const url = overrides.entrypointUrl || manifestUrl;
    const entryModule = await options.importModule(url);
    return Object.freeze({ url, module: entryModule, manifest });
  }

  async function loadEnabledPlugins(clientId = defaultClientId) {
    const enabled = listEnabledByType("Plugin", clientId);
    const ordered = sortPlugins(enabled);
    const loaded = [];
    for (const row of ordered) {
      loaded.push(await loadManifestForExtension(row));
    }
    return loaded;
  }

  /**
   * Register plugin handlers on an existing event bus.
   *
   * Expected plugin module shape (opt-in):
   * - export default function register({ events, services, params, manifest })
   *   where register may call events.on(name, fn)
   */
  async function registerPlugins({ eventBus, services = {}, clientId = defaultClientId } = {}) {
    if (!eventBus || typeof eventBus.on !== "function") throw new TypeError("eventBus.on é obrigatório.");
    const plugins = await loadEnabledPlugins(clientId);
    const registrations = [];
    for (const plugin of plugins) {
      const entry = await loadEntrypointForExtension(plugin, "plugin");
      const register = entry.module?.default ?? entry.module?.register;
      if (typeof register !== "function") {
        throw new Error(`Plugin "${plugin.element}" não exporta default/register().`);
      }
      const params = plugin.params;
      const context = Object.freeze({
        events: eventBus,
        services,
        params,
        manifest: plugin.manifest,
        extension: Object.freeze({ element: plugin.element, clientId: plugin.clientId, type: plugin.type })
      });
      registrations.push(await register(context));
    }
    return Object.freeze({ plugins, registrations });
  }

  return Object.freeze({
    coreVersion,
    listEnabledByType,
    loadManifestForExtension,
    loadEntrypointForExtension,
    loadEnabledPlugins,
    registerPlugins
  });
}
