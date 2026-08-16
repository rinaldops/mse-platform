import { createSharePointThemeConfig } from "./theme-adapter.js";

export const CORE_VERSION = "0.13.6";

const CONFIG_LIST_TITLE = "MSEConfiguracoes";

const CORE_DEFAULTS = {
  layout: { mode: "contained" },
  theme: {
    tokens: {
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontSizeBody: "1rem",
      colorPrimary: "#0f6cbd",
      colorPrimaryHover: "#115ea3",
      colorPrimarySoft: "#eef6fc",
      colorOnPrimary: "#ffffff",
      colorSurface: "#ffffff",
      colorSubtleBackground: "#f3f2f1",
      colorText: "#242424",
      colorMuted: "#616161",
      colorBorder: "#d1d1d1",
      colorInputBackground: "#ffffff",
      colorDanger: "#a4262c",
      colorDangerBackground: "#fde7e9",
      colorSuccess: "#107c10",
      colorSuccessBackground: "#dff6dd",
      space1: "0.25rem",
      space2: "0.5rem",
      space3: "1rem",
      radius: "0.5rem",
      shadow: "0 0.25rem 1rem rgb(0 0 0 / 12%)"
    }
  }
};

const TOKEN_PROPERTIES = {
  fontFamily: "--mse-font-family",
  fontSizeBody: "--mse-font-size-body",
  colorPrimary: "--mse-color-primary",
  colorPrimaryHover: "--mse-color-primary-hover",
  colorPrimarySoft: "--mse-color-primary-soft",
  colorOnPrimary: "--mse-color-on-primary",
  colorSurface: "--mse-color-surface",
  colorSubtleBackground: "--mse-color-subtle-background",
  colorText: "--mse-color-text",
  colorMuted: "--mse-color-muted",
  colorBorder: "--mse-color-border",
  colorInputBackground: "--mse-color-input-background",
  colorDanger: "--mse-color-danger",
  colorDangerBackground: "--mse-color-danger-background",
  colorSuccess: "--mse-color-success",
  colorSuccessBackground: "--mse-color-success-background",
  space1: "--mse-space-1",
  space2: "--mse-space-2",
  space3: "--mse-space-3",
  radius: "--mse-radius",
  shadow: "--mse-shadow"
};

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const mountedRoots = new Map();
const configurationRequests = new Map();

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) return mergeObjects({}, value);
  if (value !== null && typeof value === "object") {
    throw new TypeError("A configuração aceita somente valores JSON.");
  }
  return value;
}

function mergeObjects(target, source) {
  if (!isPlainObject(source)) {
    throw new TypeError("Cada camada de configuração deve ser um objeto.");
  }

  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new TypeError(`Chave de configuração proibida: ${key}`);
    }

    const incoming = source[key];
    result[key] = isPlainObject(incoming)
      ? mergeObjects(isPlainObject(result[key]) ? result[key] : {}, incoming)
      : cloneValue(incoming);
  }

  return result;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function validateToken(name, value) {
  if (!Object.hasOwn(TOKEN_PROPERTIES, name)) {
    throw new TypeError(`Token de tema desconhecido: ${name}`);
  }
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new TypeError(`Valor inválido para o token ${name}.`);
  }
  if (/[;{}]|url\s*\(|expression\s*\(/i.test(value)) {
    throw new TypeError(`Valor inseguro para o token ${name}.`);
  }
}

function validateConfig(config) {
  if (!new Set(["contained", "fullBleed"]).has(config.layout?.mode)) {
    throw new TypeError("layout.mode deve ser contained ou fullBleed.");
  }

  const tokens = config.theme?.tokens;
  if (!isPlainObject(tokens)) {
    throw new TypeError("theme.tokens deve ser um objeto.");
  }
  Object.entries(tokens).forEach(([name, value]) => validateToken(name, value));
}

export function resolveConfig({
  hostConfig = {},
  globalConfig = {},
  moduleDefaults = {},
  instanceConfig = {}
} = {}) {
  const config = [CORE_DEFAULTS, hostConfig, globalConfig, moduleDefaults, instanceConfig]
    .reduce((result, layer) => mergeObjects(result, layer), {});

  validateConfig(config);
  return deepFreeze(config);
}

export class ConfigurationLoadError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ConfigurationLoadError";
    this.code = code;
    if (details.key) this.configKey = details.key;
    if (details.cause) this.cause = details.cause;
  }
}

function configurationError(code, message, details) {
  return new ConfigurationLoadError(code, message, details);
}

function normalizeWebUrl(webUrl) {
  const value = webUrl ?? globalThis._spPageContextInfo?.webServerRelativeUrl;
  if (typeof value !== "string" || value.trim() === "") {
    throw configurationError(
      "context-unavailable",
      "Não foi possível identificar a URL do site SharePoint."
    );
  }

  const normalized = value.trim().replace(/\/+$/, "");
  return normalized === "" || normalized === "/" ? "" : normalized;
}

function validateConfigurationKey(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(value)) {
    throw configurationError(
      "invalid-config",
      `${label} inválido na lista ${CONFIG_LIST_TITLE}.`
    );
  }
  return value;
}

function parseRecordConfig(item) {
  const key = item.Title || "sem-chave";
  let jsonConfig = {};

  if (item.ConfiguracaoJson) {
    try {
      jsonConfig = JSON.parse(item.ConfiguracaoJson);
    } catch (cause) {
      throw configurationError(
        "invalid-config",
        `JSON inválido na configuração ${key}.`,
        { key, cause }
      );
    }
  }

  if (!isPlainObject(jsonConfig)) {
    throw configurationError(
      "invalid-config",
      `A configuração ${key} deve conter um objeto JSON.`,
      { key }
    );
  }

  const columns = {};
  const layout = String(item.Layout || "Herdar").toLowerCase();
  if (layout === "contained") columns.layout = { mode: "contained" };
  else if (layout === "fullbleed") columns.layout = { mode: "fullBleed" };
  else if (layout !== "herdar") {
    throw configurationError(
      "invalid-config",
      `Layout inválido na configuração ${key}.`,
      { key }
    );
  }

  if (item.Tema) {
    const themeName = validateConfigurationKey(item.Tema, "Tema").toLowerCase();
    columns.theme = { name: themeName };
  }

  return mergeObjects(jsonConfig, columns);
}

function mapConfigurationItems(items) {
  let globalConfig = {};
  let globalFound = false;
  const instancesByModule = {};
  const instanceKeys = new Set();

  for (const item of items) {
    if (item.Ativo === false || item.Ativo === 0) continue;

    const scope = String(item.Escopo || "").toLowerCase();
    const key = validateConfigurationKey(item.Title, "Chave");
    const config = parseRecordConfig(item);

    if (scope === "global") {
      if (key.toLowerCase() !== "global" || globalFound) {
        throw configurationError(
          "invalid-config",
          `A lista ${CONFIG_LIST_TITLE} deve possuir no máximo um registro global ativo.`,
          { key }
        );
      }
      globalConfig = config;
      globalFound = true;
      continue;
    }

    if (scope !== "instancia") {
      throw configurationError(
        "invalid-config",
        `Escopo inválido na configuração ${key}.`,
        { key }
      );
    }

    const moduleName = validateConfigurationKey(item.Modulo, "Módulo").toLowerCase();
    if (instanceKeys.has(key)) {
      throw configurationError(
        "invalid-config",
        `Chave de instância duplicada: ${key}.`,
        { key }
      );
    }

    instanceKeys.add(key);
    instancesByModule[moduleName] ||= {};
    instancesByModule[moduleName][key] = config;
  }

  return deepFreeze({ globalConfig, instancesByModule });
}

async function requestConfiguration({ webUrl, listTitle, fetchImpl }) {
  const escapedTitle = listTitle.replaceAll("'", "''");
  const fields = "Title,Escopo,Modulo,Layout,Tema,ConfiguracaoJson,VersaoConfiguracao,Ativo";
  const url = `${webUrl}/_api/web/lists/getbytitle('${escapedTitle}')/items` +
    `?$select=${fields}&$filter=Ativo eq 1&$top=5000`;

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json;odata=nometadata" }
    });
  } catch (cause) {
    throw configurationError(
      "network-error",
      `Falha de rede ao carregar a lista ${listTitle}.`,
      { cause }
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw configurationError("list-not-found", `A lista ${listTitle} não existe neste site.`);
    }
    if (response.status === 401 || response.status === 403) {
      throw configurationError(
        "access-denied",
        `O usuário atual não pode ler a lista ${listTitle}.`
      );
    }
    throw configurationError(
      "request-failed",
      `Não foi possível carregar a lista ${listTitle} (HTTP ${response.status}).`
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (cause) {
    throw configurationError(
      "invalid-response",
      `A lista ${listTitle} retornou uma resposta inválida.`,
      { cause }
    );
  }

  if (!Array.isArray(payload?.value)) {
    throw configurationError(
      "invalid-response",
      `A lista ${listTitle} retornou um formato inesperado.`
    );
  }

  return mapConfigurationItems(payload.value);
}

export function loadSharePointConfiguration({
  webUrl,
  listTitle = CONFIG_LIST_TITLE,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  if (typeof listTitle !== "string" || listTitle.trim() === "") {
    throw new TypeError("listTitle deve ser um texto não vazio.");
  }
  if (typeof fetchImpl !== "function") {
    throw configurationError("fetch-unavailable", "A API fetch não está disponível.");
  }

  const normalizedTitle = listTitle.trim();
  const cacheKey = `${normalizedWebUrl}|${normalizedTitle}`;
  if (configurationRequests.has(cacheKey)) {
    return configurationRequests.get(cacheKey);
  }

  const request = requestConfiguration({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    fetchImpl
  }).catch((error) => {
    if (configurationRequests.get(cacheKey) === request) {
      configurationRequests.delete(cacheKey);
    }
    throw error;
  });

  configurationRequests.set(cacheKey, request);
  return request;
}

function applyPresentation(root, config) {
  root.classList.add("mse-app");
  root.classList.toggle("mse-app--contained", config.layout.mode === "contained");
  root.classList.toggle("mse-app--full-bleed", config.layout.mode === "fullBleed");
  root.dataset.mseCoreVersion = CORE_VERSION;

  const properties = [];
  let cleanup = null;
  let update = null;
  for (const [name, value] of Object.entries(config.theme.tokens)) {
    const property = TOKEN_PROPERTIES[name];
    root.style.setProperty(property, value);
    properties.push(property);
  }

  const documentElement = root.ownerDocument?.documentElement || globalThis.document?.documentElement;
  if (config.layout.mode === "fullBleed" && documentElement?.clientWidth) {
    const layoutHost = root.ownerDocument?.querySelector?.('[data-automation-id="contentScrollRegion"]')
      || root.ownerDocument?.getElementById?.("spPageChromeAppDiv");
    update = () => {
      root.style.setProperty("--mse-full-bleed-margin-left", "0px");
      root.style.setProperty("--mse-full-bleed-margin-right", "0px");
      const rect = root.getBoundingClientRect();
      const viewportRight = documentElement.clientWidth;
      const hostRect = layoutHost?.getBoundingClientRect();
      const hostIsVisible = hostRect?.width > 0 && hostRect.right > hostRect.left;
      const targetLeft = hostIsVisible
        ? Math.max(0, Math.min(viewportRight, hostRect.left))
        : 0;
      const targetRight = hostIsVisible
        ? Math.max(targetLeft, Math.min(viewportRight, hostRect.right))
        : viewportRight;
      root.style.setProperty("--mse-full-bleed-margin-left", `${targetLeft - rect.left}px`);
      root.style.setProperty("--mse-full-bleed-margin-right", `${rect.right - targetRight}px`);
    };

    update();
    properties.push("--mse-full-bleed-margin-left", "--mse-full-bleed-margin-right");

    const cleanups = [];
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("resize", update);
      cleanups.push(() => globalThis.removeEventListener("resize", update));
    }
    if (typeof globalThis.ResizeObserver === "function") {
      const observer = new globalThis.ResizeObserver(update);
      observer.observe(documentElement);
      if (layoutHost) observer.observe(layoutHost);
      cleanups.push(() => observer.disconnect());
    }
    cleanup = () => cleanups.forEach((dispose) => dispose());
  }

  return { cleanup, properties, update };
}

function renderError(root) {
  const message = document.createElement("p");
  message.className = "mse-core__error";
  message.setAttribute("role", "alert");
  message.textContent = "Não foi possível carregar este módulo.";
  root.replaceChildren(message);
}

export async function mountModule({
  name,
  selector,
  moduleDefaults = {},
  globalConfig = {},
  instances = {},
  render
}) {
  if (!name || !selector || typeof render !== "function") {
    throw new TypeError("name, selector e render são obrigatórios.");
  }

  const result = { mounted: [], skipped: [], failed: [] };

  for (const root of document.querySelectorAll(selector)) {
    if (root.dataset.mseInitialized === "true" || mountedRoots.has(root)) {
      result.skipped.push(root);
      continue;
    }

    root.dataset.mseInitialized = "true";
    root.dataset.mseModule = name;
    root.dataset.mseState = "loading";
    root.setAttribute("aria-busy", "true");

    let presentation = { cleanup: null, properties: [] };
    try {
      const key = root.dataset.configKey || root.id;
      const config = resolveConfig({
        hostConfig: createSharePointThemeConfig(),
        globalConfig,
        moduleDefaults,
        instanceConfig: instances[key] || {}
      });
      presentation = applyPresentation(root, config);
      const cleanup = await render({ root, config });
      presentation.update?.();

      mountedRoots.set(root, {
        cleanup: typeof cleanup === "function" ? cleanup : null,
        presentation
      });
      root.dataset.mseState = "ready";
      result.mounted.push(root);
    } catch (error) {
      mountedRoots.set(root, { cleanup: null, presentation });
      root.dataset.mseState = "error";
      renderError(root);
      result.failed.push({ root, error });
    } finally {
      root.removeAttribute("aria-busy");
    }
  }

  return result;
}

async function disposeRoot(root) {
  const registration = mountedRoots.get(root);

  try {
    await registration?.cleanup?.();
  } finally {
    registration?.presentation?.cleanup?.();
    for (const property of registration?.presentation?.properties || []) {
      root.style.removeProperty(property);
    }
    root.replaceChildren();
    root.classList.remove("mse-app", "mse-app--contained", "mse-app--full-bleed");
    delete root.dataset.mseInitialized;
    delete root.dataset.mseCoreVersion;
    delete root.dataset.mseState;
    root.removeAttribute("aria-busy");
    mountedRoots.delete(root);
  }
}

export async function disposeModule(target) {
  const roots = typeof target === "string"
    ? [...document.querySelectorAll(target)]
    : [target];

  await Promise.all(roots.filter(Boolean).map(disposeRoot));
}
