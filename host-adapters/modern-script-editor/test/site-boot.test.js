import assert from "node:assert/strict";
import {
  buildAdministratorServices,
  createTemplateResolver,
  createTemplateLayoutResolver,
  resolveKernelListIds,
  resolveRestClientFactory
} from "../site-boot.js";
import { createSharePointRestClient } from "../../../core/rest.js";
import { createSpmiddleRestClient } from "../spmiddle-rest-adapter.js";

// --- resolveRestClientFactory: "spmiddle" seleciona o adapter sobre o
// SPMIDDLE; qualquer outro valor (inclusive ausente) preserva
// core/rest.js#createSharePointRestClient — nenhum site existente (sem
// data-rest-adapter) é afetado ----------------------------------------------
{
  assert.equal(resolveRestClientFactory("spmiddle"), createSpmiddleRestClient);
  assert.equal(resolveRestClientFactory(undefined), createSharePointRestClient);
  assert.equal(resolveRestClientFactory("outro-valor-qualquer"), createSharePointRestClient);
  console.log("site-boot.test.js: resolveRestClientFactory seleciona o client REST certo ok.");
}

// --- resolveKernelListIds: MSECategories/MSETags/MSEMedia/MSESearchFilters
// entram no mapa resolvido (regressão 25/10/2026 - gap encontrado antes da
// Wave 2: estas listas eram provisionadas por kernel/installer.js e lidas
// por `services.listIds.MSECategories`/`MSETags`/`MSEMedia`/
// `MSESearchFilters` (com_categories/com_tags/com_media/com_finder), mas
// nunca entravam em CONTENT_LIST_INTERNAL_NAMES - em produção, chegavam
// sempre `undefined`) --
{
  const catalog = [
    { Id: "menu-guid", RootFolder: { Name: "MSEMenu" } },
    { Id: "extensions-guid", RootFolder: { Name: "MSEExtensions" } },
    { Id: "modules-guid", RootFolder: { Name: "MSEModules" } },
    { Id: "modules-menu-guid", RootFolder: { Name: "MSEModulesMenu" } },
    { Id: "categories-guid", RootFolder: { Name: "MSECategories" } },
    { Id: "tags-guid", RootFolder: { Name: "MSETags" } },
    { Id: "media-guid", RootFolder: { Name: "MSEMedia" } },
    { Id: "search-filters-guid", RootFolder: { Name: "MSESearchFilters" } }
  ];
  const client = { request: async () => ({ data: { value: catalog } }) };
  const resolved = await resolveKernelListIds(client);
  assert.equal(resolved.MSECategories, "categories-guid");
  assert.equal(resolved.MSETags, "tags-guid");
  assert.equal(resolved.MSEMedia, "media-guid");
  assert.equal(resolved.MSESearchFilters, "search-filters-guid");
  console.log("site-boot.test.js: resolveKernelListIds resolve MSECategories/MSETags/MSEMedia/MSESearchFilters ok.");
}

// --- resolveKernelListIds: ausência de uma lista de conteúdo opcional (ex.:
// site que ainda não rodou a migração do kernel) não lança — o mapa
// simplesmente não traz a chave ausente (mesmo tratamento já existente de
// MSETemplateStyles) ---------------------------------------------------------
{
  const catalog = [
    { Id: "menu-guid", RootFolder: { Name: "MSEMenu" } },
    { Id: "extensions-guid", RootFolder: { Name: "MSEExtensions" } },
    { Id: "modules-guid", RootFolder: { Name: "MSEModules" } },
    { Id: "modules-menu-guid", RootFolder: { Name: "MSEModulesMenu" } }
  ];
  const client = { request: async () => ({ data: { value: catalog } }) };
  const resolved = await resolveKernelListIds(client);
  assert.equal(resolved.MSECategories, undefined);
  assert.equal(resolved.MSETags, undefined);
  assert.equal(resolved.MSEMedia, undefined);
  assert.equal(resolved.MSESearchFilters, undefined);
  console.log("site-boot.test.js: resolveKernelListIds tolera ausência de listas de conteúdo opcionais ok.");
}

// Este arquivo cobre só a parte NOVA de site-boot.js (Templates:
// createTemplateResolver + o resolveLayout adaptado para o shape de
// kernel/application.js), sem precisar simular toda a cadeia REST de
// bootSiteKernel — isso já está coberto por core/test/site-boot.test.js
// (createManifestResolver + bootSiteKernel ponta a ponta).

// --- buildAdministratorServices: contrato de GUIDs para telas administrativas
// preserva adapters customizados injetados pelo host ------------------------
{
  const client = { name: "client-fake" };
  const customAdminClient = { name: "custom-admin" };
  const services = {
    adminClient: customAdminClient,
    sanitizeHtml: () => "sanitized",
    listIds: { CAMAPPublicacoes: { listId: "camap-list" } }
  };
  const result = buildAdministratorServices({
    client,
    resolvedListIds: { MSEMenu: "menu-guid", MSEExtensions: "extensions-guid" },
    services
  });
  assert.equal(result.adminClient, customAdminClient, "adapter administrativo customizado deve ser preservado");
  assert.equal(result.sanitizeHtml, services.sanitizeHtml, "serviços adicionais devem ser preservados");
  assert.deepEqual(result.listIds, {
    MSEMenu: { listId: "menu-guid" },
    MSEExtensions: { listId: "extensions-guid" },
    CAMAPPublicacoes: { listId: "camap-list" }
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.listIds), true);
  console.log("site-boot.test.js: buildAdministratorServices preserva serviços e injeta listIds como { listId } ok.");
}

// --- buildAdministratorServices: expõe kernelInstaller por padrão (criado a
// partir do client), preservando um kernelInstaller customizado injetado ---
{
  const client = { name: "client-fake" };
  const result = buildAdministratorServices({ client, resolvedListIds: {}, services: {} });
  assert.equal(typeof result.kernelInstaller?.inspect, "function");
  assert.equal(typeof result.kernelInstaller?.verify, "function");
  assert.equal(typeof result.kernelInstaller?.apply, "function");

  const customInstaller = { inspect() {}, verify() {}, apply() {} };
  const withCustom = buildAdministratorServices({
    client,
    resolvedListIds: {},
    services: { kernelInstaller: customInstaller }
  });
  assert.equal(withCustom.kernelInstaller, customInstaller, "kernelInstaller customizado deve ser preservado");
  console.log("site-boot.test.js: buildAdministratorServices expõe kernelInstaller (default e customizado) ok.");
}

// --- buildAdministratorServices: MSEConfiguracoes resolvido pelo boot chega
// a listIds no mesmo formato { listId } das demais listas administrativas --
{
  const client = { name: "client-fake" };
  const result = buildAdministratorServices({
    client,
    resolvedListIds: { MSEMenu: "menu-guid", MSEConfiguracoes: "config-guid" },
    services: {}
  });
  assert.deepEqual(result.listIds.MSEConfiguracoes, { listId: "config-guid" });
  console.log("site-boot.test.js: buildAdministratorServices expõe listIds.MSEConfiguracoes ok.");
}

// --- createTemplateResolver: mesmo padrão de createManifestResolver,
// convenção de pasta fixa (templates/<nome>/index.js) + override pontual ---

{
  const resolve = createTemplateResolver("/sites/demo/SiteAssets/mse-platform/current");
  assert.equal(
    resolve("camap-tema-01"),
    "/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"
  );

  const resolveWithOverride = createTemplateResolver(
    "/sites/demo/SiteAssets/mse-platform/current/",
    { "tema-1": "templates/camap-tema-01/index.js" }
  );
  assert.equal(
    resolveWithOverride("tema-1"),
    "/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"
  );
  assert.equal(
    resolveWithOverride("camap-tema-01"),
    "/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"
  );

  const resolveAbsolute = createTemplateResolver("/sites/demo/SiteAssets/mse-platform/current", {
    "tema-externo": "https://example.invalid/camap/templates/tema-externo/index.js"
  });
  assert.equal(
    resolveAbsolute("tema-externo"),
    "https://example.invalid/camap/templates/tema-externo/index.js"
  );

  assert.throws(() => createTemplateResolver(""), /releaseBase/);
  assert.throws(() => createTemplateResolver("   "), /releaseBase/);

  console.log("site-boot.test.js: createTemplateResolver (convenção + override) ok.");
}

// --- createTemplateLayoutResolver: adapta o shape real de
// CAMAP-AGP/templates/camap-tema-01/index.js#createTemplate
// ({ root, shell, regions: Map, component, position(nome), dispose() })
// para o shape LayoutLike esperado por kernel/application.js
// ({ root, positionElements: Map (sem a entrada de componentPosition),
// componentElement, dispose() }). createTemplate aqui é um fake sintético,
// sem DOM real (objetos simples), só para validar a adaptação de shape. ---

{
  const root = { id: "root-fake" };
  const componentRegion = { id: "component-region" };
  const topoRegion = { id: "topo-region" };
  const menuRegion = { id: "menu-region" };
  let disposed = false;

  const regions = new Map([
    ["conteudo-principal", componentRegion], // mesma posição de componentPosition
    ["topo", topoRegion],
    ["menu-principal", menuRegion]
  ]);

  const fakeTemplateModule = {
    async createTemplate({ root: receivedRoot, positions, componentPosition }) {
      assert.equal(receivedRoot, root);
      assert.deepEqual(positions, ["topo", "menu-principal"]);
      assert.equal(componentPosition, "conteudo-principal");
      return {
        root,
        shell: { id: "shell-fake" },
        regions,
        component: componentRegion,
        position(nome) { return regions.get(nome) ?? null; },
        dispose() { disposed = true; }
      };
    }
  };

  const importModuleCalls = [];
  async function importModule(url) {
    importModuleCalls.push(url);
    return fakeTemplateModule;
  }

  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule
  });

  const layout = await resolveLayout({
    root,
    positions: ["topo", "menu-principal"],
    componentPosition: "conteudo-principal",
    theme: { name: "camap-tema-01" }
  });

  assert.deepEqual(importModuleCalls, [
    "/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"
  ]);
  assert.equal(layout.root, root);
  assert.equal(layout.componentElement, componentRegion);
  // positionElements NÃO deve conter a entrada de componentPosition —
  // só posições de módulo (ver JSDoc de adaptTemplateToLayout em
  // site-boot.js e de kernel/layout.js sobre componentElement ser separado
  // de positionElements).
  assert.equal(layout.positionElements.has("conteudo-principal"), false);
  assert.equal(layout.positionElements.get("topo"), topoRegion);
  assert.equal(layout.positionElements.get("menu-principal"), menuRegion);
  assert.equal(layout.positionElements.size, 2);

  await layout.dispose();
  assert.equal(disposed, true, "dispose() do layout adaptado chama dispose() do template real");

  console.log("site-boot.test.js: createTemplateLayoutResolver adapta regions/component do template para positionElements/componentElement ok.");
}

// --- adaptTemplateToLayout: viewOverrides do template (se declarado) é
// repassado ao LayoutLike sem alteração (23/10/2026 — overrides de view por
// template, ver docs/AUDITORIA-JOOMLA-PENTE-FINO.md §3) --------------------

{
  const root = { id: "root-fake-overrides" };
  const viewOverrides = { blog: { lista: "https://example.invalid/blog/lista-override.js" } };

  const fakeTemplateModule = {
    async createTemplate({ root: receivedRoot }) {
      return {
        root: receivedRoot,
        regions: new Map(),
        component: { id: "component-region-overrides" },
        dispose() {},
        viewOverrides
      };
    }
  };

  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async () => fakeTemplateModule
  });

  const layout = await resolveLayout({
    root,
    positions: [],
    componentPosition: "conteudo-principal",
    theme: { name: "camap-tema-01" }
  });

  assert.deepEqual(layout.viewOverrides, viewOverrides);
  console.log("site-boot.test.js: adaptTemplateToLayout repassa viewOverrides do template ao LayoutLike ok.");
}

// --- adaptTemplateToLayout: template sem viewOverrides -> layout.viewOverrides
// é undefined (comportamento idêntico ao de antes desta feature) -----------

{
  const root = { id: "root-fake-no-overrides" };

  const fakeTemplateModule = {
    async createTemplate({ root: receivedRoot }) {
      return {
        root: receivedRoot,
        regions: new Map(),
        component: { id: "component-region-no-overrides" },
        dispose() {}
      };
    }
  };

  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async () => fakeTemplateModule
  });

  const layout = await resolveLayout({
    root,
    positions: [],
    componentPosition: "conteudo-principal",
    theme: { name: "camap-tema-01" }
  });

  assert.equal(layout.viewOverrides, undefined);
  console.log("site-boot.test.js: adaptTemplateToLayout sem viewOverrides no template devolve undefined ok.");
}

// --- createTemplateLayoutResolver: sem tema configurado usa mse-default
// (2º nível do fallback de 3 níveis) antes de system (3º nível) -----------

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const fallbackTemplate = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => { calls.push(url); return fallbackTemplate; }
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: undefined });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/mse-default/index.js"]);
  console.log("site-boot.test.js: ausência de tema usa mse-default (2º nível) antes de system ok.");
}

// --- createTemplateLayoutResolver: template do site falha -> cai em
// mse-default; mse-default também falha -> cai em system (3 níveis) -------

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const systemTemplate = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => {
      calls.push(url);
      if (url.endsWith("/tema-quebrado/index.js")) return {};
      if (url.endsWith("/mse-default/index.js")) throw new Error("mse-default indisponível neste teste");
      return systemTemplate;
    }
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: { name: "tema-quebrado" } });
  assert.deepEqual(calls, [
    "/sites/demo/SiteAssets/mse-platform/current/templates/tema-quebrado/index.js",
    "/sites/demo/SiteAssets/mse-platform/current/templates/mse-default/index.js",
    "/sites/demo/SiteAssets/mse-platform/current/templates/system/index.js"
  ]);
  console.log("site-boot.test.js: template do site inválido cai em mse-default, e esse também falhando cai em system ok.");
}

// --- createTemplateLayoutResolver: template do site falha mas mse-default
// monta com sucesso -> system nem é tentado ---------------------------------

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const mseDefaultTemplate = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => {
      calls.push(url);
      if (url.endsWith("/tema-quebrado/index.js")) return {};
      return mseDefaultTemplate;
    }
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: { name: "tema-quebrado" } });
  assert.deepEqual(calls, [
    "/sites/demo/SiteAssets/mse-platform/current/templates/tema-quebrado/index.js",
    "/sites/demo/SiteAssets/mse-platform/current/templates/mse-default/index.js"
  ]);
  console.log("site-boot.test.js: mse-default montando com sucesso evita tentar system ok.");
}

// --- createTemplateResolver: platformTemplateBase resolve mse-default/system
// contra a base do mse-platform, mesmo com releaseBase diferente (pacote do
// site consumidor) — ver createTemplateLayoutResolver#platformTemplateNames -

{
  const resolve = createTemplateResolver(
    "/sites/demo/SiteAssets/camap-agp-modules/0.1.0",
    {},
    {
      platformTemplateBase: "/sites/demo/SiteAssets/mse-platform/current",
      platformTemplateNames: ["mse-default", "system"]
    }
  );
  assert.equal(
    resolve("camap-tema-01"),
    "/sites/demo/SiteAssets/camap-agp-modules/0.1.0/templates/camap-tema-01/index.js"
  );
  assert.equal(
    resolve("mse-default"),
    "/sites/demo/SiteAssets/mse-platform/current/templates/mse-default/index.js"
  );
  assert.equal(
    resolve("system"),
    "/sites/demo/SiteAssets/mse-platform/current/templates/system/index.js"
  );
  console.log("site-boot.test.js: createTemplateResolver com platformTemplateBase resolve mse-default/system contra a base da plataforma ok.");
}

// --- createTemplateLayoutResolver: template do site resolve contra
// releaseBase, mse-default/system resolvem contra platformTemplateBase -----

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const template = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/camap-agp-modules/0.1.0",
    platformTemplateBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => { calls.push(url); return template; }
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: { name: "camap-tema-01" } });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/camap-agp-modules/0.1.0/templates/camap-tema-01/index.js"]);
  console.log("site-boot.test.js: template do site com platformTemplateBase informado resolve contra releaseBase ok.");
}

// --- createTemplateLayoutResolver: loadTemplateStyles (MSETemplateStyles,
// ClientId="Site", Home=true) tem precedência sobre theme.name (fallback de
// compatibilidade, MSEConfiguracoes.Tema) --------------------------------

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const template = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => { calls.push(url); return template; },
    loadTemplateStyles: async () => [
      { Template: "camap-tema-01", ClientId: "Site", Home: true },
      { Template: "admin-formal", ClientId: "Administrator", Home: true }
    ]
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: { name: "tema-legado-ignorado" } });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"]);
  console.log("site-boot.test.js: loadTemplateStyles (MSETemplateStyles) tem precedência sobre theme.name ok.");
}

// --- createTemplateLayoutResolver: loadTemplateStyles sem linha Home=true
// (ou ausente/rejeitando) cai no fallback de compatibilidade theme.name ----

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const template = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => { calls.push(url); return template; },
    loadTemplateStyles: async () => { throw new Error("MSETemplateStyles ainda não provisionada neste site"); }
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: { name: "camap-tema-01" } });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"]);
  console.log("site-boot.test.js: loadTemplateStyles indisponível cai no fallback de compatibilidade theme.name ok.");
}

// --- createTemplateLayoutResolver: menuItem.TemplateStyleId (override do
// item de menu ATIVO) tem precedência sobre o Home do site (23/10/2026 —
// atribuição de template por item de menu, ver
// docs/AUDITORIA-JOOMLA-PENTE-FINO.md §3) -----------------------------------

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const template = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const styles = [
    { Id: 1, Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Template: "mse-default", ClientId: "Site", Home: false },
    { Id: 3, Template: "admin-formal", ClientId: "Administrator", Home: true }
  ];
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async (url) => { calls.push(url); return template; },
    loadTemplateStyles: async () => styles
  });

  // Item de menu com override (estilo Id:2, diferente do Home Id:1) vence o
  // Home do site.
  await resolveLayout({
    root: fallbackRoot,
    positions: [],
    componentPosition: "conteudo-principal",
    theme: { name: "tema-legado-ignorado" },
    menuItem: { TemplateStyleId: 2 }
  });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/mse-default/index.js"]);

  // Sem menuItem (ou sem TemplateStyleId) cai de volta no Home do site.
  calls.length = 0;
  await resolveLayout({
    root: fallbackRoot,
    positions: [],
    componentPosition: "conteudo-principal",
    theme: { name: "tema-legado-ignorado" },
    menuItem: null
  });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"]);

  // TemplateStyleId referenciando um estilo inexistente/de outro ClientId cai
  // no Home do site, sem lançar.
  calls.length = 0;
  await resolveLayout({
    root: fallbackRoot,
    positions: [],
    componentPosition: "conteudo-principal",
    theme: { name: "tema-legado-ignorado" },
    menuItem: { TemplateStyleId: 3 }
  });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/camap-tema-01/index.js"]);

  console.log("site-boot.test.js: menuItem.TemplateStyleId tem precedência sobre o Home do site (fallback quando ausente/inválido) ok.");
}

// --- createTemplateLayoutResolver: platformTemplateNames customizado
// (ex. "minijoomla-classic", template que também vive no pacote do
// mse-platform) resolve contra platformTemplateBase, igual a
// mse-default/system — sem o override, cairia contra releaseBase ---------

{
  const calls = [];
  const fallbackRoot = { id: "fallback-root" };
  const template = {
    async createTemplate({ root: receivedRoot }) {
      return { root: receivedRoot, regions: new Map(), component: {}, dispose() {} };
    }
  };
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/minijoomla-modules/0.1.0",
    platformTemplateBase: "/sites/demo/SiteAssets/mse-platform/current",
    platformTemplateNames: ["mse-default", "system", "minijoomla-classic"],
    importModule: async (url) => { calls.push(url); return template; }
  });
  await resolveLayout({ root: fallbackRoot, positions: [], componentPosition: "conteudo-principal", theme: { name: "minijoomla-classic" } });
  assert.deepEqual(calls, ["/sites/demo/SiteAssets/mse-platform/current/templates/minijoomla-classic/index.js"]);
  console.log("site-boot.test.js: platformTemplateNames customizado resolve nome adicional contra platformTemplateBase ok.");
}

console.log("site-boot.test.js (host-adapters): verificações concluídas com sucesso.");
