import { defineModuleManifest } from "../../core/module-contract.js";

const mounted = new WeakMap();
const loadedStyles = new Map();
const coreStyleUrl = new URL("./layout.css", import.meta.url).href;

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

function pixels(value, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

function applyLayout(root, layout = {}) {
  const mode = layout.mode === "fullBleed" ? "fullBleed" : "contained";
  const margins = {
    top: pixels(layout.marginTop, 240),
    right: pixels(layout.marginRight, 240),
    bottom: pixels(layout.marginBottom, 240),
    left: pixels(layout.marginLeft, 240)
  };
  root.classList.add("mse-app");
  root.classList.toggle("mse-app--contained", mode === "contained");
  root.classList.toggle("mse-app--full-bleed", mode === "fullBleed");
  root.style?.setProperty("--mse-epub-margin-top", `${margins.top}px`);
  root.style?.setProperty("--mse-epub-margin-right", `${margins.right}px`);
  root.style?.setProperty("--mse-epub-margin-bottom", `${margins.bottom}px`);
  root.style?.setProperty("--mse-epub-margin-left", `${margins.left}px`);
  const clean = () => ["--mse-epub-margin-top", "--mse-epub-margin-right", "--mse-epub-margin-bottom", "--mse-epub-margin-left",
    "--mse-full-bleed-margin-left", "--mse-full-bleed-margin-right"].forEach((property) => root.style?.removeProperty(property));
  if (mode !== "fullBleed") return clean;
  const documentElement = root.ownerDocument?.documentElement;
  const update = () => {
    root.style?.removeProperty("--mse-full-bleed-margin-left");
    root.style?.removeProperty("--mse-full-bleed-margin-right");
    const rect = root.getBoundingClientRect();
    const viewportRight = documentElement?.clientWidth || globalThis.innerWidth || rect.right;
    const targetLeft = margins.left;
    const targetRight = viewportRight - margins.right;
    root.style?.setProperty("--mse-full-bleed-margin-left", `${targetLeft - rect.left}px`);
    root.style?.setProperty("--mse-full-bleed-margin-right", `${rect.right - targetRight}px`);
  };
  update();
  globalThis.addEventListener?.("resize", update);
  return () => {
    globalThis.removeEventListener?.("resize", update);
    clean();
  };
}

function applyEpubPresentation(root, config, displayName) {
  const theme = config.theme?.name === "Lite" ? "Lite" : "Standard";
  root.dataset.mseTheme = theme;
  root.style?.setProperty("--mse-grid-gap", `${pixels(config.layout?.gridGap ?? 16, 120)}px`);
  let heading = null;
  let observer = null;
  if (config.title?.visible && root.ownerDocument?.createElement) {
    heading = root.ownerDocument.createElement("h2");
    heading.className = "mse-epub__title";
    heading.textContent = String(config.title.text || displayName).trim() || displayName;
    const ensureHeading = () => {
      if (root.firstElementChild !== heading) root.prepend(heading);
    };
    ensureHeading();
    const Observer = root.ownerDocument.defaultView?.MutationObserver ?? globalThis.MutationObserver;
    if (typeof Observer === "function") {
      observer = new Observer(ensureHeading);
      observer.observe(root, { childList: true });
    }
  }
  return () => {
    observer?.disconnect();
    heading?.remove();
    delete root.dataset.mseTheme;
    root.style?.removeProperty("--mse-grid-gap");
  };
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

  await Promise.all([
    loadStyle(root.ownerDocument, coreStyleUrl),
    ...manifest.styles.map((style) => loadStyle(root.ownerDocument, new URL(style, manifestUrl).href))
  ]);

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
  const resolvedConfig = { ...config, ...storedConfig };
  const disposeLayout = applyLayout(root, resolvedConfig.layout);
  root.dataset.mseCoreVersion = coreVersion;
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
  const mountedModule = await module.mount({ root, config: resolvedConfig, services: hostServices, context });
  const disposePresentation = applyEpubPresentation(root, resolvedConfig, manifest.displayName);
  const disposeModule = typeof mountedModule?.dispose === "function" ? mountedModule.dispose : module.dispose;
  mounted.set(root, async () => {
    if (typeof disposeModule === "function") await disposeModule();
    disposePresentation();
    disposeLayout();
    root.classList.remove("mse-app", "mse-app--contained", "mse-app--full-bleed");
    delete root.dataset.mseCoreVersion;
  });
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
