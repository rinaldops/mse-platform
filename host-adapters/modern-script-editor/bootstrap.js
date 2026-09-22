import { defineModuleManifest } from "../../core/module-contract.js";

const mounted = new WeakMap();
const loadedStyles = new Map();
const revealCoordinators = new WeakMap();
const coreStyleUrl = new URL("./layout.css", import.meta.url).href;

function isVisible(root) {
  if (!root?.isConnected) return false;
  const rect = root.getBoundingClientRect?.();
  if (!rect || rect.width <= 0) return false;
  const style = root.ownerDocument?.defaultView?.getComputedStyle?.(root);
  return style?.display !== "none" && style?.visibility !== "hidden";
}

function revealCoordinator(document) {
  if (revealCoordinators.has(document)) return revealCoordinators.get(document);
  const state = { roots: new Map(), open: false, timer: null };
  const reveal = (root, status) => {
    root.classList?.remove("mse-epub--pending");
    root.classList?.add("mse-epub--revealed");
    root.removeAttribute?.("aria-busy");
    root.dataset.mseRevealState = status;
  };
  const flush = () => {
    if (!state.open) return;
    const visible = [...state.roots.entries()]
      .filter(([root]) => isVisible(root))
      .sort(([left], [right]) => {
        const topDifference = left.getBoundingClientRect().top - right.getBoundingClientRect().top;
        if (Math.abs(topDifference) > 1) return topDifference;
        const position = left.compareDocumentPosition?.(right) ?? 0;
        return position & 4 ? -1 : position & 2 ? 1 : 0;
      });
    for (const [root, status] of visible) {
      if (status === "pending") break;
      reveal(root, status);
      state.roots.delete(root);
    }
  };
  const open = () => {
    state.open = true;
    flush();
  };
  const scheduleOpen = () => {
    globalThis.clearTimeout?.(state.timer);
    state.timer = globalThis.setTimeout?.(open, 250);
  };
  const coordinator = {
    prepare(root) {
      state.roots.set(root, "pending");
      root.classList?.remove("mse-epub--revealed");
      root.classList?.add("mse-epub--pending");
      root.setAttribute?.("aria-busy", "true");
      root.dataset.mseRevealState = "pending";
      if (document.readyState === "loading") {
        document.addEventListener?.("DOMContentLoaded", scheduleOpen, { once: true });
      } else {
        scheduleOpen();
      }
    },
    complete(root, status = "ready") {
      if (!state.roots.has(root)) return;
      state.roots.set(root, status);
      flush();
    }
  };
  revealCoordinators.set(document, coordinator);
  return coordinator;
}

export function prepareMseModule(root) {
  if (!root?.ownerDocument) return;
  revealCoordinator(root.ownerDocument).prepare(root);
}

export function completeMseModule(root, { failed = false } = {}) {
  if (!root?.ownerDocument) return;
  revealCoordinator(root.ownerDocument).complete(root, failed ? "failed" : "ready");
}

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
  const layoutHost = root.ownerDocument?.querySelector?.('[data-automation-id="contentScrollRegion"]')
    || root.ownerDocument?.getElementById?.("spPageChromeAppDiv");
  const update = () => {
    root.style?.removeProperty("--mse-full-bleed-margin-left");
    root.style?.removeProperty("--mse-full-bleed-margin-right");
    const rect = root.getBoundingClientRect();
    const hostRect = layoutHost?.getBoundingClientRect();
    const viewportRight = documentElement?.clientWidth || globalThis.innerWidth || rect.right;
    const targetLeft = (hostRect?.width > 0 ? Math.max(0, hostRect.left) : 0) + margins.left;
    const targetRight = (hostRect?.width > 0 ? Math.min(viewportRight, hostRect.right) : viewportRight) - margins.right;
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
  root.style?.setProperty("--mse-paragraph-spacing", `${pixels(config.typography?.paragraphSpacing ?? 6, 64)}px`);
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
    root.style?.removeProperty("--mse-paragraph-spacing");
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
