import assert from "node:assert/strict";
import { createSiteApplication } from "../application.js";

// --- FakeElement/document/window mínimos (mesmo padrão de
// core/test/navigation.test.js e kernel/test/layout.test.js) --------------

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.parentNode = null;
    this.dataset = {};
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  dispatch(type, event = {}) { this.listeners.get(type)?.(event); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...children);
  }
  get firstChild() { return this.children[0] ?? null; }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
}

const document = {
  createElement(tag) {
    const node = new FakeElement(tag);
    node.ownerDocument = document;
    return node;
  },
  getElementById() { return null; }
};

function createRoot() {
  const root = new FakeElement("div");
  root.ownerDocument = document;
  return root;
}

function createWindow(initialHash = "#/") {
  return {
    location: { hash: initialHash },
    document,
    listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); },
    matchMedia: () => ({ matches: false })
  };
}

function dispatchHashChange(window, hash) {
  window.location.hash = hash;
  window.listeners.get("hashchange")?.();
}

// --- fixtures de dados (shape cru MSEMenu/MSEExtensions/MSEModules*) --------

function fixtureMenuItems() {
  return [
    { Id: 1, Title: "Início", Alias: "", ParentId: 0, Component: null, View: null, ParamsJson: null, Default: true, Published: "Published" },
    { Id: 2, Title: "Blog", Alias: "blog", ParentId: 0, Component: "blog", View: "lista", ParamsJson: null, Default: false, Published: "Published" },
    { Id: 3, Title: "Quebrado", Alias: "quebrado", ParentId: 0, Component: "quebrado", View: null, ParamsJson: null, Default: false, Published: "Published" }
  ];
}

function fixtureExtensions() {
  return [
    { Title: "Blog", Type: "Component", Element: "blog", Version: "1.0.0", Enabled: true, Protected: false },
    { Title: "Quebrado", Type: "Component", Element: "quebrado", Version: "1.0.0", Enabled: true, Protected: false },
    { Title: "SD", Type: "Module", Element: "sd", Version: "1.0.0", Enabled: true, Protected: false }
  ];
}

function fixtureModulos() {
  return [
    { Id: 10, Title: "SD", Module: "sd", Position: "topo", Ordering: 1, Published: "Published", MenuAssignment: "All", ShowTitle: true }
  ];
}

function fixtureModulosComParams() {
  return [
    {
      Id: 11,
      Title: "sd-principal",
      Module: "sd",
      Position: "topo",
      Ordering: 1,
      Published: "Published",
      MenuAssignment: "All",
      ShowTitle: true,
      ParamsJson: JSON.stringify({ title: "Comece por aqui", limit: 3 })
    }
  ];
}

function fixtureModulosComParamsInvalido() {
  return [
    {
      Id: 12,
      Title: "sd-quebrado",
      Module: "sd",
      Position: "topo",
      Ordering: 1,
      Published: "Published",
      MenuAssignment: "All",
      ShowTitle: false,
      ParamsJson: "{ isto não é json válido"
    }
  ];
}

// --- registro de módulos "instalados" (manifesto + entrypoints) ----------
//
// resolveManifestUrl aponta sempre para "<elemento>/manifest.js"; os
// entrypoints são resolvidos como URL relativa a essa manifest URL (mesmo
// contrato de host-adapters/modern-script-editor/bootstrap.js).

function fixtureRegistry({ onComponentMount, onModuleMount, failComponent = false } = {}) {
  const manifestUrl = (elemento) => `https://example.invalid/${elemento}/manifest.js`;
  const disposed = [];

  const registryModules = new Map([
    [manifestUrl("blog"), {
      default: {
        id: "blog",
        type: "component",
        views: { lista: true, destaques: true },
        routeParams: ["id", "slug"],
        entrypoints: { full: "./full.js" }
      }
    }],
    ["https://example.invalid/blog/full.js", {
      async mount({ root, config, context }) {
        onComponentMount?.({ root, config, context });
        if (failComponent) throw new Error("falha proposital no mount do Componente.");
        root.setAttribute("data-mounted", "blog");
        return { dispose: () => disposed.push("blog") };
      }
    }],
    [manifestUrl("quebrado"), {
      default: { id: "quebrado", type: "component", entrypoints: { full: "./full.js" } }
    }],
    ["https://example.invalid/quebrado/full.js", {
      async mount() {
        throw new Error("Componente quebrado sempre falha.");
      }
    }],
    [manifestUrl("sd"), {
      default: {
        id: "sd",
        type: "module",
        positions: ["topo"],
        entrypoints: { summary: "./summary.js" }
      }
    }],
    ["https://example.invalid/sd/summary.js", {
      async mount({ root, context }) {
        onModuleMount?.({ root, context });
        root.setAttribute("data-mounted", "sd");
        return { dispose: () => disposed.push("sd") };
      }
    }]
  ]);

  async function importModule(url) {
    const found = registryModules.get(url);
    if (!found) throw new Error(`Módulo de teste não registrado: ${url}`);
    return found;
  }

  return { importModule, resolveManifestUrl: manifestUrl, disposed };
}

// --- boot na raiz ("Início", modules-only): módulo de posição monta,
// Componente permanece vazio com motivo registrado ---------------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const { importModule, resolveManifestUrl } = fixtureRegistry();
  const moduleErrors = [];

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule,
    onModuleError: (error, info) => moduleErrors.push({ error, info })
  });

  assert.deepEqual(moduleErrors, []);
  assert.equal(root.children.length, 2, "componentElement + 1 posição");
  const [componentElement, positionElement] = root.children;
  assert.equal(componentElement.getAttribute("data-mse-component"), "");
  assert.equal(componentElement.getAttribute("data-mse-dispatch-reason"), null);
  assert.equal(componentElement.dataset.mseDispatchReason, "modules-only");
  assert.equal(positionElement.getAttribute("data-mse-position"), "topo");
  assert.equal(positionElement.children.length, 1, "um módulo instanciado na posição");
  assert.equal(positionElement.children[0].getAttribute("data-mounted"), "sd");

  await app.dispose();
  assert.equal(root.children.length, 0, "dispose limpa o layout inteiro");

  console.log("application.test.js: boot na raiz (modules-only) com módulo em posição ok.");
}

// --- navegação para rota com Componente habilitado: Componente monta,
// módulo "Todas" permanece em toda rota -----------------------------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const mountedContexts = [];
  const { importModule, resolveManifestUrl } = fixtureRegistry({
    onComponentMount: (info) => mountedContexts.push(info)
  });

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule
  });

  const events = [];
  app.events.on("onAfterRoute", (payload) => events.push(["onAfterRoute", payload.route.alias]));
  app.events.on("onBeforeRender", (payload) => events.push(["onBeforeRender", payload.dispatch.found]));
  app.events.on("onAfterRender", (payload) => events.push(["onAfterRender", payload.route.alias]));

  // app.navigate() delega a navigateTo (core/navigation.js), que apenas
  // ajusta window.location.hash — em um browser real isso disparar
  // "hashchange" automaticamente; o stub de teste não o faz, então
  // disparamos manualmente (mesmo padrão de dispatchHashChange acima).
  app.navigate({ alias: "blog" });
  window.listeners.get("hashchange")?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const [componentElement] = root.children;
  assert.equal(componentElement.getAttribute("data-mounted"), "blog");
  assert.equal(mountedContexts.length, 1);
  assert.equal(mountedContexts[0].context.view, "lista");
  assert.deepEqual(events, [["onAfterRoute", "blog"], ["onBeforeRender", true], ["onAfterRender", "blog"]]);

  await app.dispose();

  console.log("application.test.js: navegação para Componente habilitado ok.");
}

// --- Componente cujo mount lança: isolado, não derruba o boot nem os
// módulos de posição; onModuleError é notificado --------------------------

{
  const root = createRoot();
  const window = createWindow("#/quebrado");
  const moduleErrors = [];
  const { importModule, resolveManifestUrl } = fixtureRegistry({ failComponent: false });

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule,
    onModuleError: (error, info) => moduleErrors.push({ message: error.message, info })
  });

  assert.equal(moduleErrors.length, 1);
  assert.equal(moduleErrors[0].info.elemento, "quebrado");
  assert.equal(moduleErrors[0].info.kind, "component");

  const [componentElement, positionElement] = root.children;
  assert.equal(componentElement.dataset.mseDispatchReason, "error");
  // módulo da posição continua montado normalmente, apesar do Componente ter falhado.
  assert.equal(positionElement.children[0]?.getAttribute("data-mounted"), "sd");

  await app.dispose();

  console.log("application.test.js: Componente com erro isolado, módulos de posição intactos ok.");
}

// --- hashchange real do window re-renderiza a rota (ciclo completo
// router -> dispatcher -> render) ------------------------------------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const { importModule, resolveManifestUrl } = fixtureRegistry();

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule
  });

  dispatchHashChange(window, "#/blog");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const [componentElement] = root.children;
  assert.equal(componentElement.getAttribute("data-mounted"), "blog");

  await app.dispose();

  console.log("application.test.js: hashchange do window dispara nova renderização ok.");
}

// --- loadMenu falhando no boot: aplica fallback (lista vazia) em vez de
// lançar; dispatcher resolve "not-found" normalmente -----------------------

{
  const root = createRoot();
  const window = createWindow("#/blog");
  const { importModule, resolveManifestUrl } = fixtureRegistry();
  const loadErrors = [];

  const app = await createSiteApplication({
    root,
    window,
    positions: [],
    loadMenu: async () => { throw new Error("lista MSEMenu indisponível."); },
    loadExtensions: async () => fixtureExtensions(),
    resolveManifestUrl,
    importModule,
    onLoadError: (error, chave) => loadErrors.push(chave)
  });

  assert.deepEqual(loadErrors, ["menuItems"]);
  const [componentElement] = root.children;
  assert.equal(componentElement.dataset.mseDispatchReason, "not-found");

  await app.dispose();

  console.log("application.test.js: falha ao carregar MSEMenu degrada para fallback (not-found) ok.");
}

// --- MSEModules.ParamsJson válido chega ao config/context.modulo do
// módulo (C3: gap de threading de ParamsJson por instância) --------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const mountedContexts = [];
  const { importModule, resolveManifestUrl } = fixtureRegistry({
    onModuleMount: (info) => mountedContexts.push(info)
  });

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulosComParams(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule
  });

  assert.equal(mountedContexts.length, 1);
  assert.equal(mountedContexts[0].context.modulo.id, 11);
  assert.equal(mountedContexts[0].context.modulo.title, "sd-principal");
  assert.deepEqual(mountedContexts[0].context.modulo.params, { title: "Comece por aqui", limit: 3 });

  await app.dispose();

  console.log("application.test.js: ParamsJson válido chega a context.modulo.params ok.");
}

// --- MSEModules.ParamsJson ausente/invalido nunca quebra o boot: degrada
// para {} (mesma tolerância de parseJsonParams/dispatcher.js) ------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const mountedContexts = [];
  const moduleErrors = [];
  const { importModule, resolveManifestUrl } = fixtureRegistry({
    onModuleMount: (info) => mountedContexts.push(info)
  });

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulosComParamsInvalido(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule,
    onModuleError: (error, info) => moduleErrors.push({ error, info })
  });

  assert.deepEqual(moduleErrors, []);
  assert.equal(mountedContexts.length, 1);
  assert.deepEqual(mountedContexts[0].context.modulo.params, {});

  await app.dispose();

  console.log("application.test.js: ParamsJson invalido degrada para {} sem quebrar o boot ok.");
}

// --- manifest.routeParams (ex.: ["id","slug"]) chega nomeado em
// context.params, mesclado com dispatch.params (query + ParamsJson); o
// nomeado vence em caso de colisão de chave (mesmo princípio de "mais
// específico vence" já usado por dispatcher.js) ---------------------------

{
  const root = createRoot();
  const window = createWindow("#/blog/42-um-titulo?id=999&extra=1");
  const mountedContexts = [];
  const { importModule, resolveManifestUrl } = fixtureRegistry({
    onComponentMount: (info) => mountedContexts.push(info)
  });

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule
  });

  const [componentElement] = root.children;
  assert.equal(componentElement.getAttribute("data-mounted"), "blog");
  assert.equal(mountedContexts.length, 1);
  // "id" nomeado da rota (42, number) vence sobre "id" da query ("999",
  // string); "slug" nomeado vem da rota; "extra" segue vindo de dispatch.params.
  assert.deepEqual(mountedContexts[0].context.params, { id: 42, slug: "um-titulo", extra: "1" });

  await app.dispose();

  console.log("application.test.js: manifest.routeParams nomeado mescla em context.params (nomeado vence) ok.");
}

// --- id FIXO via MSEMenu.ParamsJson (ex.: página institucional "quem-somos",
// plano C4/D2: aponta sempre para o mesmo artigo do BLOG) não pode ser
// sobrescrito por um `id` nomeado ausente da rota. Antes da correção,
// `namedRouteParams` sempre incluía `{ id: null, slug: null }` quando o
// manifesto declara `routeParams`, e esse `null` vencia por cima do `id`
// fixo (routeParams nomeado sempre sobrescrevia dispatch.params) — exatamente
// o caso que esta rota sem segmento `<id>-<slug>` expõe. -------------------

{
  const root = createRoot();
  const window = createWindow("#/quem-somos");
  const mountedContexts = [];
  const { importModule, resolveManifestUrl } = fixtureRegistry({
    onComponentMount: (info) => mountedContexts.push(info)
  });

  const menuItems = [
    ...fixtureMenuItems(),
    {
      Id: 4, Title: "Quem somos", Alias: "quem-somos", ParentId: 0,
      Component: "blog", View: "article", ParamsJson: JSON.stringify({ id: 99 }),
      Default: false, Published: "Published"
    }
  ];

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => menuItems,
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule
  });

  assert.equal(mountedContexts.length, 1);
  // id fixo (99, de ParamsJson) preservado: a rota não tem segmento
  // <id>-<slug>, então namedRouteParams não deve incluir "id"/"slug" aqui.
  assert.deepEqual(mountedContexts[0].context.params, { id: 99 });

  await app.dispose();

  console.log("application.test.js: id fixo via MSEMenu.ParamsJson não é sobrescrito por routeParams ausente ok.");
}

// --- resolveLayout (hook de Templates, kernel/application.js): quando NÃO
// informado, o comportamento é idêntico ao kernel sem noção de Template —
// layout neutro (kernel/layout.js) montado diretamente em root, sem
// nenhuma chamada extra. Este caso serve de regressão explícita (os casos
// acima, que já não passam resolveLayout, cobrem o mesmo caminho) ----------

{
  const root = createRoot();
  const window = createWindow("#/");
  const { importModule, resolveManifestUrl } = fixtureRegistry();

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule
  });

  // Mesmo shape/ordem documentados em kernel/layout.js: componentElement
  // primeiro, depois uma posição por nome em `positions`.
  assert.equal(root.children.length, 2, "componentElement + 1 posição, igual ao layout neutro padrão");
  const [componentElement, positionElement] = root.children;
  assert.equal(componentElement.getAttribute("data-mse-component"), "");
  assert.equal(positionElement.getAttribute("data-mse-position"), "topo");
  assert.equal(positionElement.children[0]?.getAttribute("data-mounted"), "sd");

  await app.dispose();
  assert.equal(root.children.length, 0, "dispose limpa o layout neutro inteiro");

  console.log("application.test.js: sem resolveLayout, comportamento idêntico ao layout neutro padrão (regressão) ok.");
}

// --- resolveLayout informado (síncrono): chamado depois do primeiro
// refreshSnapshot(), com theme === undefined quando não há
// configurationStore; os elementos devolvidos por ele são efetivamente os
// populados por renderComponent/renderModules --------------------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const { importModule, resolveManifestUrl } = fixtureRegistry();
  const resolveLayoutCalls = [];

  const templateRoot = createRoot();
  const templateComponentElement = templateRoot.ownerDocument.createElement("div");
  const templatePositionElement = templateRoot.ownerDocument.createElement("div");
  templateComponentElement.setAttribute("data-mse-component", "");
  templatePositionElement.setAttribute("data-mse-position", "topo");
  templateRoot.append(templateComponentElement, templatePositionElement);
  let templateDisposed = false;

  function resolveLayout(args) {
    resolveLayoutCalls.push(args);
    return {
      root: templateRoot,
      positionElements: new Map([["topo", templatePositionElement]]),
      componentElement: templateComponentElement,
      dispose: () => { templateDisposed = true; }
    };
  }

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    componentPosition: "conteudo-principal",
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule,
    resolveLayout
  });

  assert.equal(resolveLayoutCalls.length, 1);
  assert.equal(resolveLayoutCalls[0].root, root);
  assert.deepEqual(resolveLayoutCalls[0].positions, ["topo"]);
  assert.equal(resolveLayoutCalls[0].componentPosition, "conteudo-principal");
  assert.equal(resolveLayoutCalls[0].theme, undefined, "sem configurationStore, theme é undefined");

  // root original (layout neutro) nunca é tocado: o layout veio inteiro do
  // template fake, montado sobre templateRoot.
  assert.equal(root.children.length, 0);
  assert.equal(templatePositionElement.children[0]?.getAttribute("data-mounted"), "sd");
  assert.equal(templateComponentElement.getAttribute("data-mse-dispatch-reason"), null);
  assert.equal(templateComponentElement.dataset.mseDispatchReason, "modules-only");

  await app.dispose();
  assert.equal(templateDisposed, true, "dispose() do kernel chama dispose() do layout devolvido por resolveLayout");

  console.log("application.test.js: resolveLayout síncrono monta o layout do template e recebe theme=undefined sem configurationStore ok.");
}

// --- resolveLayout informado (assíncrono) + configurationStore fake: theme
// chega como globalConfig.theme carregado via store.loadGlobal() ----------

{
  const root = createRoot();
  const window = createWindow("#/");
  const { importModule, resolveManifestUrl } = fixtureRegistry();
  const resolveLayoutCalls = [];

  const configurationStore = {
    loadGlobal: async () => ({ theme: { name: "camap-tema-01" } }),
    loadExtension: async () => ({}),
    load: async () => ({})
  };

  async function resolveLayout(args) {
    resolveLayoutCalls.push(args);
    await Promise.resolve();
    return {
      root,
      positionElements: new Map(),
      componentElement: root.ownerDocument.createElement("div"),
      dispose() {}
    };
  }

  const app = await createSiteApplication({
    root,
    window,
    positions: [],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => [],
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule,
    configurationStore,
    resolveLayout
  });

  assert.equal(resolveLayoutCalls.length, 1);
  assert.deepEqual(resolveLayoutCalls[0].theme, { name: "camap-tema-01" });

  await app.dispose();

  console.log("application.test.js: resolveLayout assíncrono recebe theme vindo de configurationStore.loadGlobal() ok.");
}

// --- resolveLayout que lança: kernel isola o erro e cai para o layout
// neutro padrão (createSiteLayout), sem abortar o boot — rota resolve,
// módulos montam normalmente -----------------------------------------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const { importModule, resolveManifestUrl } = fixtureRegistry();
  const loadErrors = [];

  function resolveLayout() {
    throw new Error("template configurado não encontrado (proposital).");
  }

  const app = await createSiteApplication({
    root,
    window,
    positions: ["topo"],
    loadMenu: async () => fixtureMenuItems(),
    loadExtensions: async () => fixtureExtensions(),
    loadModulos: async () => fixtureModulos(),
    loadModulosMenu: async () => [],
    resolveManifestUrl,
    importModule,
    resolveLayout,
    onLoadError: (error, chave) => loadErrors.push(chave)
  });

  assert.deepEqual(loadErrors, ["resolveLayout"]);
  // Layout neutro padrão montado normalmente em root (mesmo shape de
  // createSiteLayout): componentElement + 1 posição.
  assert.equal(root.children.length, 2);
  const [componentElement, positionElement] = root.children;
  assert.equal(componentElement.getAttribute("data-mse-component"), "");
  assert.equal(positionElement.children[0]?.getAttribute("data-mounted"), "sd");

  // Boot continua funcional: navegação para outra rota resolve normalmente.
  app.navigate({ alias: "blog" });
  window.listeners.get("hashchange")?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(componentElement.getAttribute("data-mounted"), "blog");

  await app.dispose();
  assert.equal(root.children.length, 0);

  console.log("application.test.js: resolveLayout que lança cai para o layout neutro padrão, boot continua ok.");
}

console.log("application.test.js: verificações concluídas com sucesso.");
