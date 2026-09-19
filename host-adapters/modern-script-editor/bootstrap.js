import { defineModuleManifest } from "../../core/module-contract.js";

const mounted = new WeakMap();
const loadedStyles = new Map();

function loadStyle(document, url) {
  if (!document?.head?.append || !document.createElement) return Promise.resolve();
  if (loadedStyles.has(url)) return loadedStyles.get(url);
  const promise = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", () => reject(new Error(`Não foi possível carregar ${url}.`)), { once: true });
    document.head.append(link);
  }).catch((error) => {
    loadedStyles.delete(url);
    throw error;
  });
  loadedStyles.set(url, promise);
  return promise;
}

function parseVersion(value) {
  return value.split(".").slice(0, 3).map((part) => Number.parseInt(part, 10));
}

function compare(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function supportsCore(range, coreVersion) {
  const match = /^>=(\d+\.\d+\.\d+)\s+<(\d+\.\d+\.\d+)$/.exec(range);
  return Boolean(match && compare(coreVersion, match[1]) >= 0 && compare(coreVersion, match[2]) < 0);
}

export async function mountMseModule(root, {
  coreVersion,
  importModule = (url) => import(url),
  services = {},
  config = {},
  configurationStore,
  manifestResolver
} = {}) {
  if (!root?.dataset) throw new TypeError("root deve ser um elemento com dataset.");
  if (mounted.has(root)) await unmountMseModule(root);
  const manifestPath = root.dataset.mseManifest;
  if (!manifestPath) throw new TypeError("data-mse-manifest é obrigatório.");
  const manifestUrl = new URL(manifestPath, root.ownerDocument?.baseURI ?? globalThis.location?.href).href;

  const manifestModule = await importModule(manifestUrl);
  const manifest = defineModuleManifest(manifestModule.default ?? manifestModule.manifest);
  if (manifest.id !== root.dataset.mseModule) throw new Error("O módulo não corresponde ao manifesto informado.");
  if (!supportsCore(manifest.coreCompatibility, coreVersion)) {
    throw new Error(`${manifest.displayName} ${manifest.version} não é compatível com Core ${coreVersion}.`);
  }

  await Promise.all(manifest.styles.map((style) => loadStyle(root.ownerDocument, new URL(style, manifestUrl).href)));

  const view = root.dataset.mseView || "full";
  if (!new Set(["full", "summary"]).has(view) || !manifest.capabilities[view]) {
    throw new Error(`${manifest.displayName} não oferece a visualização ${view}.`);
  }
  const entrypointUrl = new URL(manifest.entrypoints[view], manifestUrl).href;
  const module = await importModule(entrypointUrl);
  if (typeof module.mount !== "function") throw new TypeError(`${manifest.id} não exporta mount().`);
  const context = Object.freeze({
    host: "modern-script-editor",
    instanceId: root.dataset.mseInstance || manifest.id,
    webUrl: globalThis._spPageContextInfo?.webServerRelativeUrl ?? ""
  });
  const storedConfig = manifest.capabilities.settings && typeof configurationStore?.load === "function"
    ? await configurationStore.load({ moduleId: manifest.id, instanceId: context.instanceId, view })
    : {};
  const hostServices = {
    ...services,
    host: {
      ...services.host,
      async mountSummary({ root: summaryRoot, moduleId, instanceId }) {
        if (typeof manifestResolver !== "function") throw new TypeError("manifestResolver é obrigatório para summaries dinâmicos.");
        summaryRoot.dataset.mseModule = moduleId;
        summaryRoot.dataset.mseInstance = instanceId;
        summaryRoot.dataset.mseView = "summary";
        summaryRoot.dataset.mseManifest = await manifestResolver(moduleId);
        return mountMseModule(summaryRoot, {
          coreVersion,
          importModule,
          services,
          configurationStore,
          manifestResolver
        });
      }
    }
  };
  const mountedModule = await module.mount({ root, config: { ...config, ...storedConfig }, services: hostServices, context });
  mounted.set(root, typeof mountedModule?.dispose === "function" ? mountedModule.dispose : module.dispose);
  return Object.freeze({ manifest, context });
}

export async function mountAllMseModules({ document = globalThis.document, ...options } = {}) {
  if (!document?.querySelectorAll) throw new TypeError("document deve permitir querySelectorAll.");
  const roots = [...document.querySelectorAll("[data-mse-module][data-mse-manifest]")];
  return Promise.allSettled(roots.map((root) => mountMseModule(root, options)));
}

export async function unmountMseModule(root) {
  const dispose = mounted.get(root);
  if (typeof dispose === "function") await dispose();
  mounted.delete(root);
  root.replaceChildren();
}
