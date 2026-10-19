import assert from "node:assert/strict";
import {
  buildAdministratorServices,
  createTemplateResolver,
  createTemplateLayoutResolver
} from "../site-boot.js";

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
    resolvedListIds: { MSEMenu: "menu-guid", MSEExtensoes: "extensions-guid", MSEConfiguracoes: "config-guid" },
    services
  });
  assert.equal(result.adminClient, customAdminClient, "adapter administrativo customizado deve ser preservado");
  assert.equal(result.sanitizeHtml, services.sanitizeHtml, "serviços adicionais devem ser preservados");
  assert.deepEqual(result.listIds, {
    MSEMenu: { listId: "menu-guid" },
    MSEExtensoes: { listId: "extensions-guid" },
    MSEConfiguracoes: { listId: "config-guid" },
    CAMAPPublicacoes: { listId: "camap-list" }
  });
  assert.equal(typeof result.kernelInstaller?.inspect, "function");
  assert.equal(typeof result.kernelInstaller?.verify, "function");
  assert.equal(typeof result.kernelInstaller?.apply, "function");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.listIds), true);
  console.log("site-boot.test.js: buildAdministratorServices preserva serviços e injeta listIds como { listId } ok.");
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

// --- createTemplateLayoutResolver: theme.name ausente/vazio rejeita (não
// decide o fallback para o layout neutro — isso é responsabilidade de
// kernel/application.js, conforme o contrato definido para resolveLayout) --

{
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async () => { throw new Error("importModule não deveria ser chamado sem theme.name."); }
  });

  await assert.rejects(
    resolveLayout({ root: {}, positions: [], componentPosition: "conteudo-principal", theme: undefined })
  );
  await assert.rejects(
    resolveLayout({ root: {}, positions: [], componentPosition: "conteudo-principal", theme: {} })
  );
  await assert.rejects(
    resolveLayout({ root: {}, positions: [], componentPosition: "conteudo-principal", theme: { name: "" } })
  );

  console.log("site-boot.test.js: createTemplateLayoutResolver rejeita quando theme.name está ausente/vazio (sem decidir fallback) ok.");
}

// --- createTemplateLayoutResolver: módulo importado sem createTemplate()
// rejeita com mensagem clara (isolado por kernel/application.js, que cai
// para o layout neutro — não testado aqui, já coberto por
// kernel/test/application.test.js) -----------------------------------------

{
  const resolveLayout = createTemplateLayoutResolver({
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    importModule: async () => ({ /* sem createTemplate */ })
  });

  await assert.rejects(
    resolveLayout({ root: {}, positions: [], componentPosition: "conteudo-principal", theme: { name: "tema-quebrado" } }),
    /createTemplate/
  );

  console.log("site-boot.test.js: createTemplateLayoutResolver rejeita quando o pacote não exporta createTemplate() ok.");
}

// --- buildAdministratorServices: loader read-only usado pelo diagnóstico ---
{
  const reads = [];
  const result = buildAdministratorServices({
    client: {
      async getListItems(list, options) {
        reads.push({ list, options });
        return [{ Id: reads.length }];
      }
    },
    resolvedListIds: { MSEMenu: "menu-guid", MSEModulos: "modules-guid", MSEExtensoes: "extensions-guid" }
  });
  const structure = await result.loadAdministratorStructure();
  assert.deepEqual(structure.menus, [{ Id: 1 }]);
  assert.deepEqual(structure.modules, [{ Id: 2 }]);
  assert.deepEqual(structure.extensions, [{ Id: 3 }]);
  assert.equal(structure.routes, structure.menus);
  assert.deepEqual(reads.map((entry) => entry.list), [
    { listId: "menu-guid" },
    { listId: "modules-guid" },
    { listId: "extensions-guid" }
  ]);
  assert.deepEqual(reads.map((entry) => entry.options.top), [5000, 5000, 5000]);
  console.log("site-boot.test.js: loadAdministratorStructure consulta as três listas estruturais ok.");
}

console.log("site-boot.test.js (host-adapters): verificações concluídas com sucesso.");
