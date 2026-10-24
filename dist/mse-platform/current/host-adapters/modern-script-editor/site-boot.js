/**
 * Camada de integraÃ§Ã£o REST do Site Kernel para o host Modern Script Editor
 * (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seÃ§Ã£o 4: "host-adapters/modern-script-editor/
 * site-runner.js NOVO: Ãºnico script do snippet de site"; seÃ§Ã£o 4.1, item "Carga":
 * "um `$batch` REST no boot (extensÃµes + menu + mÃ³dulos + config), cache em
 * memÃ³ria por sessÃ£o, fallback para Ãºltimo estado vÃ¡lido se uma lista falhar").
 *
 * Este mÃ³dulo Ã© o Ãºnico lugar, no host atual, que sabe transformar os nomes
 * de campo interno das listas MSE* (ver `kernel/schemas/*.js`) em chamadas
 * REST via `core/rest.js`, e empacota os `load*` que `kernel/application.js`
 * espera receber por injeÃ§Ã£o. `kernel/application.js` em si permanece sem
 * rede (ver seu prÃ³prio cabeÃ§alho) â€” toda esta ponte Ã© responsabilidade do
 * host, nÃ£o do kernel (mesmo princÃ­pio de neutralidade da seÃ§Ã£o 3 do plano:
 * "o kernel nÃ£o conhece CAMAP-AGP").
 *
 * `$batch` real (Fase 3): as 4 listas MSE* (`MSEMenu`, `MSEExtensions`,
 * `MSEModules`, `MSEModulesMenu`) sÃ£o carregadas com uma Ãºnica chamada
 * `batchGet` (`core/rest.js`), memoizada em `createKernelListLoaders` â€” a
 * promise do batch Ã© disparada sÃ³ na primeira das 4 funÃ§Ãµes a ser chamada e
 * compartilhada pelas outras 3. `MSEConfiguracoes` (config global) fica DE
 * FORA do batch: continua uma chamada HTTP separada via
 * `core/configuration-store.js`, sem mudanÃ§a nesta fase. Esta troca Ã©
 * isolada a este arquivo â€” `kernel/application.js` sÃ³ depende do contrato
 * `() => Promise<Array<object>>` por lista, e continua recebendo 4 funÃ§Ãµes
 * independentes nesse sentido (rejeiÃ§Ã£o de uma nÃ£o impede as outras 3 de
 * resolver, mesmo todas compartilhando a mesma chamada de rede por baixo).
 *
 * `bootSiteKernel` Ã© a funÃ§Ã£o testÃ¡vel (ESM, importÃ¡vel em Node); o arquivo
 * irmÃ£o `site-runner.js` Ã© o script vanilla executado pelo MSE (mesmo motivo
 * de `runner.js` existir separado de `bootstrap.js`: alguns MSE nÃ£o executam
 * `<script>` inline de forma confiÃ¡vel â€” ver cabeÃ§alho de `runner.js`) e
 * delega a esta funÃ§Ã£o depois de ler os atributos `data-*` do prÃ³prio
 * `<script>` e localizar o `[data-mse-site]`.
 */

import { createSiteApplication } from "../../kernel/application.js";
import { createSharePointRestClient, buildListItemsRequest, unwrapPage, batchGet } from "../../core/rest.js";
import { createSharePointConfigurationStore } from "../../core/configuration-store.js";
import { createKernelInstaller } from "../../kernel/installer.js";
import { resolveActiveTemplateName, resolveTemplateNameForMenuItem } from "../../kernel/template-registry.js";

const TEMPLATE_STYLES_FIELDS = Object.freeze(["Id", "Title", "Template", "ClientId", "Home"]);

const MENU_FIELDS = Object.freeze([
  "Id", "Title", "Alias", "MenuType", "ParentId", "Path", "Level", "Ordering",
  "Component", "View", "ParamsJson", "Default", "Target", "Published", "TemplateStyleId"
]);
const EXTENSIONS_FIELDS = Object.freeze([
  "Id", "Title", "Type", "Element", "ClientId", "Version", "Enabled", "Protected", "Ordering", "ParamsJson"
]);
const MODULES_FIELDS = Object.freeze([
  "Id", "Title", "Module", "Position", "Ordering", "Published", "PublishUp", "PublishDown",
  "ShowTitle", "Style", "MenuAssignment", "ParamsJson", "SchemaVersion"
]);
const MODULES_MENU_FIELDS = Object.freeze(["Id", "Title", "ModuleId", "MenuId"]);

// Nomes internos tÃ©cnicos das 4 listas MSE* carregadas no boot (ver
// `kernel/installer.js#KERNEL_LIST_SCHEMAS`). Deliberadamente duplicados
// aqui como strings, em vez de importar os schemas de `kernel/schemas/*`:
// este arquivo Ã© publicado no bundle do navegador por
// `tools/prepare-site-kernel.js`, que exclui tudo que Ã© Node-only
// (installer/seed/schemas â€” ver cabeÃ§alho daquele script), entÃ£o o host nÃ£o
// pode depender desses mÃ³dulos em tempo de execuÃ§Ã£o.
const KERNEL_LIST_INTERNAL_NAMES = Object.freeze(["MSEMenu", "MSEExtensions", "MSEModules", "MSEModulesMenu"]);
// MSEConfiguracoes (config global/por instância/por extensão, nome em
// português deliberadamente — ver components/com_config/README.md) não faz
// parte do batch acima: continua resolvida aqui só para expor seu listId a
// `services.listIds.MSEConfiguracoes` (consumido por
// components/com_config/config-editor.js), sem mudar como
// core/configuration-store.js é lido (ele resolve seu próprio listId por
// Title, de forma independente).
const CONTENT_LIST_INTERNAL_NAMES = Object.freeze(["CAMAPPublicacoes", "CAMAPCategorias", "CAMAPTags", "CAMAPPublicacaoTags", "MSEConfiguracoes", "MSETemplateStyles"]);
// MSETemplateStyles (22/10/2026, ampliação de escopo — Templates
// instaláveis/registro ≈ #__template_styles) entra na lista OPCIONAL por
// propósito: sites que ainda não rodaram a migração
// `tools/migrate-create-template-styles.js` simplesmente não têm esta
// lista, e isso não pode quebrar o boot — ver `resolveActiveSiteTemplateName`
// abaixo, que trata ausência/erro como "nenhum estilo resolvido", caindo no
// fallback de compatibilidade (`MSEConfiguracoes.Tema`, via
// `core/configuration-store.js`).

/**
 * Resolve o `listId` (GUID) real de cada lista MSE* a partir do catÃ¡logo de
 * listas do site (`RootFolder/Name`), nunca pelo `Title` atual.
 *
 * Motivo: `core/list-provisioning.js#applyList()` cria a lista com
 * `Title = internalName` e, no mesmo `apply()`, renomeia `Title` para o
 * `displayName` amigÃ¡vel (ex. "MSEMenu" -> "Itens de menu") sempre que
 * `configureDisplayName` estÃ¡ pendente â€” o que Ã© o caso logo apÃ³s a
 * criaÃ§Ã£o. Isso quebra `core/rest.js#listApiPath()` quando `list` Ã© passado
 * como string crua: aquele caminho resolve via
 * `/_api/web/lists/getbytitle(nomeInterno)`, que casa pelo `Title` ATUAL da
 * lista, nÃ£o pelo nome interno fixo â€” e passa a devolver 404 depois do
 * `apply()` (confirmado contra o tenant real). Esta funÃ§Ã£o usa o mesmo
 * filtro imune ao bug que `core/list-provisioning.js#discoverListId()` jÃ¡
 * usa: `RootFolder/Name`, que nunca Ã© renomeado pelo provisionamento.
 *
 * @param {ReturnType<typeof createSharePointRestClient>} client
 * @returns {Promise<Record<string, string>>} mapa `internalName -> listId`
 */
async function resolveKernelListIds(client) {
  const result = await client.request(
    "/_api/web/lists?$select=Id,RootFolder/Name&$expand=RootFolder&$top=5000"
  );
  const lists = result.data?.value ?? result.data?.d?.results ?? [];
  const byInternalName = new Map(
    lists.map((list) => [String(list.RootFolder?.Name ?? "").toLowerCase(), list.Id])
  );
  const listIdByInternalName = {};
  for (const internalName of KERNEL_LIST_INTERNAL_NAMES) {
    const listId = byInternalName.get(internalName.toLowerCase());
    if (!listId) {
      throw new Error(`site-boot.js: lista "${internalName}" nÃ£o encontrada no catÃ¡logo do site (provisionamento pendente?).`);
    }
    listIdByInternalName[internalName] = listId;
  }
  for (const internalName of CONTENT_LIST_INTERNAL_NAMES) {
    const listId = byInternalName.get(internalName.toLowerCase());
    if (listId) listIdByInternalName[internalName] = listId;
  }
  return listIdByInternalName;
}

/**
 * Monta os 4 loaders que `kernel/application.js` espera (`loadMenu`,
 * `loadExtensions`, `loadModulos`, `loadModulosMenu`), cada um
 * `() => Promise<Array<object>>` independente no sentido do contrato (uma
 * rejeiÃ§Ã£o nÃ£o impede as outras 3 de resolver), mas internamente as 4
 * compartilham UMA Ãºnica chamada `$batch` (`core/rest.js`#`batchGet`),
 * disparada sÃ³ na primeira funÃ§Ã£o chamada e memoizada (`batchPromise`) para
 * as 3 seguintes â€” precedida por uma resoluÃ§Ã£o de `listId` por
 * `RootFolder/Name` (`resolveKernelListIds`), imune ao bug de
 * renomeaÃ§Ã£o de `Title` descrito ali.
 *
 * Cada sub-requisiÃ§Ã£o do batch usa o mesmo `path` relativo que
 * `client.getListItems` montaria internamente (via `buildListItemsRequest`,
 * reaproveitando a lÃ³gica de query string de `core/rest.js` em vez de
 * duplicÃ¡-la), agora com `{ listId }` em vez do nome interno bruto; a
 * resposta de cada uma Ã© desembrulhada com `unwrapPage` (o mesmo helper
 * usado por `getAll`/`getListItemPage`) para devolver um array de itens,
 * nÃ£o o envelope OData cru â€” mesmo formato que `getListItems` jÃ¡ devolve
 * hoje, preservando o contrato externo.
 *
 * `digest`: alguns tenants exigem `X-RequestDigest` mesmo num `$batch`
 * "flat" sÃ³ de GETs (confirmado contra o tenant real de produÃ§Ã£o: sem o
 * header, `POST {webUrl}/_api/$batch` responde HTTP 403 "The security
 * validation for this page is invalid..."; o `kernel/application.js`
 * silencia esse erro por lista via `onLoadError`, caindo para `[]`, o que
 * fazia os 4 loaders falharem juntos sem sintoma visÃ­vel alÃ©m de
 * `dispatchReason: "not-found"`/posiÃ§Ãµes vazias). Por isso `runBatch()`
 * sempre obtÃ©m o digest via `client.getDigest()` (memoizado/cacheado pelo
 * prÃ³prio `core/rest.js#createSharePointRestClient`, reaproveitado por
 * qualquer escrita futura do mesmo client) antes de chamar `batchGet`.
 *
 * @param {ReturnType<typeof createSharePointRestClient>} client
 * @param {typeof fetch} fetchImpl
 */
function createKernelListLoaders(client, fetchImpl, listIdsPromise) {
  const keys = ["loadMenu", "loadExtensions", "loadModulos", "loadModulosMenu"];

  let batchPromise = null;
  function runBatch() {
    if (!batchPromise) {
      batchPromise = (async () => {
        const [listIdByInternalName, digest] = await Promise.all([
          listIdsPromise || resolveKernelListIds(client),
          client.getDigest()
        ]);
        const requestsByKey = {
          loadMenu: buildListItemsRequest({ listId: listIdByInternalName.MSEMenu }, { select: MENU_FIELDS, orderBy: "Ordering", top: 2000 }),
          loadExtensions: buildListItemsRequest({ listId: listIdByInternalName.MSEExtensions }, { select: EXTENSIONS_FIELDS, top: 500 }),
          loadModulos: buildListItemsRequest({ listId: listIdByInternalName.MSEModules }, { select: MODULES_FIELDS, orderBy: "Ordering", top: 2000 }),
          loadModulosMenu: buildListItemsRequest({ listId: listIdByInternalName.MSEModulesMenu }, { select: MODULES_MENU_FIELDS, top: 5000 })
        };
        return batchGet(
          keys.map((key) => ({ key, path: requestsByKey[key].path })),
          { webUrl: client.webUrl, fetchImpl, digest }
        );
      })();
    }
    return batchPromise;
  }

  async function loadList(key) {
    const batch = await runBatch();
    const entry = batch[key];
    if (!entry || entry.status < 200 || entry.status >= 300) {
      throw new Error(`Falha ao carregar "${key}" via $batch (HTTP ${entry?.status ?? "desconhecido"}).`);
    }
    return unwrapPage(entry.data).items;
  }

  return {
    loadMenu: () => loadList("loadMenu"),
    loadExtensions: () => loadList("loadExtensions"),
    loadModulos: () => loadList("loadModulos"),
    loadModulosMenu: () => loadList("loadModulosMenu")
  };
}

/**
 * Resolve a URL do manifesto de um Componente/Módulo a partir da pasta fixa
 * `modules/mod_<elemento>/manifest.js` sob `releaseBase` — mesma convenção já
 * usada por `host-adapters/modern-script-editor/site-integration.js` para os
 * módulos do modelo legado (com a mesma ressalva de lá: quem tiver pasta de
 * código diferente do `Elemento`/`ModuloTipo` — ex.: "explore-mais" ->
 * pasta "mod_recursos", ou um `Elemento` que na verdade é um componente, não
 * um módulo (ex.: "blog" -> `components/com_content/manifest.js`) — deve
 * informar `manifestPathByElemento`).
 *
 * @param {string} releaseBase
 * @param {Record<string, string>} [manifestPathByElemento] Mapa opcional
 *   `elemento -> caminho relativo a releaseBase` (ex.:
 *   `{ "explore-mais": "modules/mod_recursos/manifest.js" }`), para os poucos
 *   casos em que o identificador técnico não é também o nome da pasta.
 * @returns {(elemento: string) => string}
 */
export function createManifestResolver(releaseBase, manifestPathByElemento = {}) {
  if (typeof releaseBase !== "string" || releaseBase.trim() === "") {
    throw new TypeError("releaseBase é obrigatório.");
  }
  const base = releaseBase.replace(/\/+$/, "");
  return function resolveManifestUrl(elemento) {
    const override = manifestPathByElemento[elemento];
    if (typeof override === "string" && override.trim() !== "") {
      const value = override.trim();
      if (/^https?:\/\//i.test(value)) return value;
      return `${base}/${value.replace(/^\/+/, "")}`;
    }
    return `${base}/modules/mod_${elemento}/manifest.js`;
  };
}

/**
 * Resolve a URL do pacote de Template a partir da pasta fixa
 * `templates/<nome>/index.js` sob `releaseBase` â€” mesmo padrÃ£o exato de
 * `createManifestResolver` acima (mesma validaÃ§Ã£o de `releaseBase`, mesmo
 * tratamento de override absoluto `https?://`, mesmo fallback de
 * convenÃ§Ã£o), aplicado ao outro eixo de extensibilidade do kernel trazido
 * ao escopo depois do kernel original: Templates. `templatePathByName`
 * existe pela mesma razÃ£o de `manifestPathByElemento`: poucos casos em que
 * o nome do Template nÃ£o Ã© tambÃ©m o nome exato da pasta do pacote.
 *
 * `platformTemplateBase`/`platformTemplateNames` (ampliação do mecanismo
 * mínimo original — ver `createTemplateLayoutResolver` abaixo, fallback de
 * 3 níveis): templates "da plataforma" (`mse-default`, `system`) não vivem
 * sob `releaseBase` do SITE consumidor — são shipped pelo próprio
 * `mse-platform` (`SiteAssets/mse-platform/current/templates/<nome>/`).
 * Qualquer nome presente em `platformTemplateNames` resolve contra
 * `platformTemplateBase` em vez de `releaseBase` (ainda sujeito a
 * `templatePathByName`/override absoluto, mesma precedência de sempre). Se
 * `platformTemplateBase` não for informado (compatibilidade com chamadores
 * antigos/testes), cai no comportamento anterior — tudo contra `releaseBase`.
 *
 * @param {string} releaseBase
 * @param {Record<string, string>} [templatePathByName] Mapa opcional
 *   `nome -> caminho relativo Ã  base correspondente` (ex.:
 *   `{ "tema-1": "templates/camap-tema-01/index.js" }`), ou URL absoluta
 *   (`https?://`) para pacotes publicados fora de qualquer base conhecida.
 * @param {{ platformTemplateBase?: string, platformTemplateNames?: string[] }} [platform]
 * @returns {(nome: string) => string}
 */
export function createTemplateResolver(releaseBase, templatePathByName = {}, platform = {}) {
  if (typeof releaseBase !== "string" || releaseBase.trim() === "") {
    throw new TypeError("releaseBase Ã© obrigatÃ³rio.");
  }
  const base = releaseBase.replace(/\/+$/, "");
  const platformBase = typeof platform?.platformTemplateBase === "string" && platform.platformTemplateBase.trim()
    ? platform.platformTemplateBase.replace(/\/+$/, "")
    : null;
  const platformNames = new Set(Array.isArray(platform?.platformTemplateNames) ? platform.platformTemplateNames : []);
  return function resolveTemplateUrl(nome) {
    const override = templatePathByName[nome];
    const effectiveBase = platformBase && platformNames.has(nome) ? platformBase : base;
    if (typeof override === "string" && override.trim() !== "") {
      const value = override.trim();
      if (/^https?:\/\//i.test(value)) return value;
      return `${effectiveBase}/${value.replace(/^\/+/, "")}`;
    }
    return `${effectiveBase}/templates/${nome}/index.js`;
  };
}

/**
 * Adapta o shape devolvido por um pacote de Template real
 * (`CAMAP-AGP/templates/camap-tema-01/index.js#createTemplate`:
 * `{ root, shell, regions: Map<string,Element>, component: Element,
 * position(nome), dispose() }`, confirmado lendo aquele arquivo â€” nÃ£o
 * assumido) para o shape `LayoutLike` que `kernel/application.js#resolveLayout`
 * espera (o mesmo shape de `kernel/layout.js#createSiteLayout`):
 * `{ root, positionElements: Map<string,Element>, componentElement: Element,
 * dispose(), viewOverrides?: Record<string,Record<string,string>> }`.
 *
 * `regions` do template inclui TAMBÃ‰M a entrada de `componentPosition` (o
 * prÃ³prio `createTemplate` cria essa regiÃ£o com `createRegion(document,
 * componentPosition, "main")` e a registra em `regions` via
 * `shell.querySelectorAll([data-template-region])`). Essa entrada NÃƒO pode
 * aparecer em `positionElements` (que, no contrato do kernel, Ã© sÃ³ posiÃ§Ãµes
 * de mÃ³dulo â€” ver JSDoc de `kernel/layout.js`) â€” por isso ela Ã© removida do
 * Map adaptado abaixo; `componentElement` vem de `template.component`
 * diretamente (equivalente a `template.regions.get(componentPosition)`,
 * mas sem depender de `componentPosition` estar definido no momento da
 * adaptaÃ§Ã£o).
 *
 * `viewOverrides` (23/10/2026 — overrides de view por template, ver
 * `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3): repassado tal qual vier de
 * `template.viewOverrides` (mapa opcional `{ "<componente>": { "<view>":
 * "<url absoluta>" } }`, já resolvido pelo pacote de Template — ver
 * `CAMAP-AGP/templates/<tema>/index.js#createTemplate`). Ausente/undefined
 * no template de origem resulta em `viewOverrides: undefined` no
 * `LayoutLike` adaptado — `kernel/application.js` trata ausência como
 * "nenhum override", comportamento idêntico a hoje.
 *
 * @param {{ root: Element, shell?: Element, regions: Map<string, Element>, component: Element, position?: (nome: string) => (Element|null), dispose: () => (void|Promise<void>), viewOverrides?: Record<string,Record<string,string>> }} template
 * @param {string} [componentPosition]
 * @returns {{ root: Element, positionElements: Map<string, Element>, componentElement: Element, dispose: () => (void|Promise<void>), viewOverrides?: Record<string,Record<string,string>> }}
 */
function adaptTemplateToLayout(template, componentPosition) {
  const positionElements = new Map(template.regions);
  positionElements.delete(componentPosition);
  return {
    root: template.root,
    positionElements,
    componentElement: template.component,
    dispose: () => template.dispose(),
    viewOverrides: template.viewOverrides
  };
}

/**
 * Monta os serviços consumidos pelo Administrator sem apagar extensões do host.
 * O contrato administrativo usa `{ listId }` para permitir que o client REST
 * resolva a lista por GUID, enquanto `services` continua podendo injetar
 * adapters específicos (inclusive em hosts e testes).
 *
 * @param {{ resolvedListIds: Record<string,string>, services?: Record<string,unknown>, client: object }} options
 * @returns {Readonly<Record<string,unknown>>}
 */
export function buildAdministratorServices({ resolvedListIds = {}, services = {}, client } = {}) {
  const administratorListIds = Object.fromEntries(
    Object.entries(resolvedListIds).map(([internalName, listId]) => [internalName, { listId }])
  );
  const adminClient = services.adminClient || client;
  const kernelInstaller = services.kernelInstaller || createKernelInstaller({ client });
  const listIds = Object.freeze({ ...administratorListIds, ...(services.listIds || {}) });
  const loadAdministratorStructure = services.loadAdministratorStructure || (async () => {
    const fieldsByList = { MSEMenu: MENU_FIELDS, MSEModules: MODULES_FIELDS, MSEExtensions: EXTENSIONS_FIELDS };
    const read = async (name) => {
      const list = listIds[name];
      if (!list || typeof adminClient?.getListItems !== "function") return [];
      return adminClient.getListItems(list, { select: fieldsByList[name], top: 5000 });
    };
    const [menus, modules, extensions] = await Promise.all([
      read("MSEMenu"), read("MSEModules"), read("MSEExtensions")
    ]);
    return { menus, modules, extensions, routes: menus };
  });
  return Object.freeze({ ...services, adminClient, listIds, kernelInstaller, loadAdministratorStructure });
}


/**
 * Monta o `resolveLayout` esperado por `kernel/application.js` (ver JSDoc
 * daquela funÃ§Ã£o: `({root, positions, componentPosition, theme}) =>
 * LayoutLike|Promise<LayoutLike>`), ligando o Template configurado
 * (`theme.name`, vindo de `MSETemplateStyles`/`MSEConfiguracoes.Tema` â€”
 * escopo Global) ao pacote real via `createTemplateResolver` + `importModule`
 * (reaproveitado, nÃ£o `import()` direto, para manter testÃ¡vel â€” mesmo
 * princÃ­pio de injeÃ§Ã£o de `resolveManifestUrl`/`importModule` jÃ¡ usado pelo
 * resto deste arquivo).
 *
 * Decisão de contrato (ver tarefa que introduziu Templates): esta função
 * NÃO decide o fallback para o layout neutro â€” isso é responsabilidade de
 * `kernel/application.js#createSiteApplication`, que já cai para
 * `createSiteLayout` quando `resolveLayout` lança/rejeita (mesmo princípio
 * de isolamento de falha de `loadSnapshot`). Por isso, quando TODOS os
 * níveis abaixo falham, esta função apenas REJEITA â€” ela nunca monta
 * `createSiteLayout` ela mesma, para nÃ£o duplicar essa decisÃ£o em dois
 * lugares.
 *
 * Fallback de 3 níveis (ver `templates/mse-default/`, shipped pelo
 * `mse-platform` como 2º nível, e `templates/system/`, shipped como 3º
 * nível técnico): `[requestedName (se configurado), "mse-default",
 * "system"]`, deduplicado preservando ordem — cada nome é tentado via
 * `importModule`/`createTemplate()` até o primeiro que montar com sucesso.
 * `requestedName` resolve contra `releaseBase` (pacote do SITE consumidor,
 * ex. `camap-agp-modules`); `"mse-default"`/`"system"` resolvem contra
 * `platformTemplateBase` (pacote do `mse-platform`, ex.
 * `SiteAssets/mse-platform/current/`) — ver `platform` em
 * `createTemplateResolver`. Quando `platformTemplateBase` não é informado
 * (compatibilidade com chamadores antigos/testes), os 3 níveis resolvem
 * contra `releaseBase`, igual ao comportamento anterior a este mecanismo.
 *
 * `requestedName` em si (qual Template o SITE pediu, antes do fallback):
 * resolvido nesta ordem (23/10/2026 — atribuição de template por item de
 * menu, ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3):
 *   1. `resolveTemplateNameForMenuItem(styles, menuItem, {clientId:"Site"})`
 *      — override do item de menu ATIVO da rota atual (`menuItem`, recebido
 *      de `kernel/application.js#ensureLayout`), via
 *      `MSEMenu.TemplateStyleId` apontando para um `MSETemplateStyles.Id`
 *      do mesmo `ClientId`;
 *   2. `kernel/template-registry.js#resolveActiveTemplateName` (`ClientId
 *      ="Site"`, `Home=true`) — Home do site, já existente;
 *   3. `theme?.name` recebido de `resolveLayout` (hoje `globalConfig.theme`,
 *      vindo de `MSEConfiguracoes.Tema` — ver `kernel/application.js`) —
 *      fallback de compatibilidade, migração suave, nenhum site existente
 *      quebra.
 * O primeiro nível que resolver para um nome não-vazio vence; `styles`
 * ausente/vazio ou `menuItem` sem `TemplateStyleId` fazem o nível 1 cair
 * silenciosamente no nível 2 (mesmo princípio de `resolveTemplateNameForMenuItem`:
 * nunca lança por dado de conteúdo).
 *
 * Exportada (embora `bootSiteKernel` seja o único chamador em produção)
 * para permitir um teste isolado da adaptação de shape (`adaptTemplateToLayout`,
 * interna) sem precisar simular toda a cadeia REST de `bootSiteKernel` —
 * basta um `importModule` fake devolvendo `{ createTemplate: fn }`.
 *
 * @param {{ releaseBase: string, templatePathByName?: Record<string, string>, importModule: (url: string) => Promise<any>, platformTemplateBase?: string, platformTemplateNames?: string[], loadTemplateStyles?: () => Promise<Array<object>|null|undefined> }} args
 * @returns {(resolveArgs: { root: Element, positions: string[], componentPosition?: string, theme?: { name?: string }, menuItem?: object|null }) => Promise<{ root: Element, positionElements: Map<string, Element>, componentElement: Element, dispose: () => (void|Promise<void>), viewOverrides?: Record<string,Record<string,string>> }>}
 */
export function createTemplateLayoutResolver({
  releaseBase,
  templatePathByName = {},
  importModule,
  platformTemplateBase,
  platformTemplateNames = ["mse-default", "system"],
  loadTemplateStyles
}) {
  const resolveTemplateUrl = createTemplateResolver(releaseBase, templatePathByName, {
    platformTemplateBase,
    platformTemplateNames
  });
  return async function resolveLayout({ root, positions, componentPosition, theme, menuItem }) {
    let styles = null;
    if (typeof loadTemplateStyles === "function") {
      try {
        styles = await loadTemplateStyles();
      } catch {
        styles = null;
      }
    }
    const menuItemStyleName = resolveTemplateNameForMenuItem(styles, menuItem, { clientId: "Site" });
    const activeStyleName = resolveActiveTemplateName(styles, { clientId: "Site" });
    const styleName = menuItemStyleName || activeStyleName;
    const requestedName = styleName
      || (typeof theme?.name === "string" && theme.name.trim() ? theme.name.trim() : null);
    const candidates = [...new Set([...(requestedName ? [requestedName] : []), ...platformTemplateNames])];
    let lastError;
    for (const name of candidates) {
      try {
        const templateUrl = resolveTemplateUrl(name);
        const templateModule = await importModule(templateUrl);
        if (typeof templateModule.createTemplate !== "function") {
          throw new TypeError(`Pacote de Template "${name}" (${templateUrl}) não exporta createTemplate().`);
        }
        const template = await templateModule.createTemplate({ root, positions, componentPosition });
        return adaptTemplateToLayout(template, componentPosition);
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Nenhum Template disponível; fallback neutro aplicado pelo kernel. Causa: ${lastError?.message ?? "desconhecida"}`);
  };
}

/**
 * Inicializa o Site Kernel sobre `root`, com todas as listas MSE* carregadas
 * via REST (`core/rest.js`) e a configuraÃ§Ã£o publicada via
 * `core/configuration-store.js` â€” a composiÃ§Ã£o completa que
 * `kernel/application.js` espera receber por injeÃ§Ã£o (ele nunca faz `fetch`
 * por conta prÃ³pria, ver seu cabeÃ§alho).
 *
 * `templatePathByName`/`platformTemplateBase`: habilitam o Template
 * configurado (via `MSEConfiguracoes.Tema` â€” escopo Global) a ser carregado
 * via `resolveLayout` (ver `createTemplateLayoutResolver` acima), com
 * fallback de 3 níveis (`[requestedName, "mse-default", "system"]`) e
 * fallback automÃ¡tico (dentro de `kernel/application.js`) para o layout
 * neutro (`kernel/layout.js`) quando TODOS os níveis falham ao carregar/
 * montar â€” nenhuma mudanÃ§a de comportamento para sites que nunca
 * configuraram um Template nem informaram `platformTemplateBase`.
 *
 * @param {{
 *   root: Element,
 *   window?: Window,
 *   webUrl?: string,
 *   releaseBase: string,
 *   positions?: string[],
 *   componentPosition?: string,
 *   defaultView?: string,
 *   manifestPathByElemento?: Record<string, string>,
 *   templatePathByName?: Record<string, string>,
 *   platformTemplateBase?: string,
 *   fetchImpl?: typeof fetch,
 *   services?: Record<string, unknown>,
 *   onLoadError?: (error: Error, chave: string) => void,
 *   onModuleError?: (error: Error, info: object) => void
 * }} options `root` e `releaseBase` sÃ£o obrigatÃ³rios; os demais tÃªm os
 *   mesmos padrÃµes de `kernel/application.js`/`core/rest.js`.
 * @returns {Promise<ReturnType<typeof createSiteApplication>>}
 */
export async function bootSiteKernel({
  root,
  window = globalThis,
  webUrl,
  releaseBase,
  positions = [],
  componentPosition,
  defaultView,
  manifestPathByElemento = {},
  templatePathByName = {},
  platformTemplateBase,
  fetchImpl = globalThis.fetch,
  services = {},
  onLoadError,
  onModuleError
} = {}) {
  const client = createSharePointRestClient({ webUrl, fetchImpl });
  const listIdsPromise = resolveKernelListIds(client);
  const resolvedListIds = await listIdsPromise;
  // O kernel usa GUIDs crus nos loaders; as telas administrativas recebem o
  // contrato de lista do REST (`{ listId }`), exigido por admin-data.js.
  const administratorServices = buildAdministratorServices({
    resolvedListIds,
    services,
    client
  });
  const configurationStore = createSharePointConfigurationStore({ webUrl: client.webUrl, fetchImpl });
  const importModule = (url) => import(url);
  // MSETemplateStyles é opcional (ver CONTENT_LIST_INTERNAL_NAMES acima):
  // só é lido se a lista já existir no site (migração ainda não aplicada ->
  // resolvedListIds.MSETemplateStyles undefined -> loadTemplateStyles nem
  // chega a tentar rede, resolveActiveTemplateName cai em `null` e
  // createTemplateLayoutResolver usa o fallback `theme?.name`).
  const templateStylesListId = resolvedListIds.MSETemplateStyles;
  const loadTemplateStyles = templateStylesListId
    ? () => client.getListItems({ listId: templateStylesListId }, { select: TEMPLATE_STYLES_FIELDS, top: 50 })
    : undefined;

  return createSiteApplication({
    root,
    window,
    positions,
    componentPosition,
    defaultView,
    ...createKernelListLoaders(client, fetchImpl, listIdsPromise),
    configurationStore,
    resolveManifestUrl: createManifestResolver(releaseBase, manifestPathByElemento),
    importModule,
    services: administratorServices,
    onLoadError,
    onModuleError,
    resolveLayout: createTemplateLayoutResolver({ releaseBase, templatePathByName, importModule, platformTemplateBase, loadTemplateStyles })
  });
}
