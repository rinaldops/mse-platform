/**
 * Integração de ponta a ponta do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4, `kernel/application.js`: "boot, ciclo da requisição, unmount"; seção 8,
 * Fase 2: "Kernel mínimo + host local").
 *
 * Este é o único arquivo do kernel que:
 *   - decide QUANDO fazer `import()` dinâmico de manifesto/entrypoint de
 *     Componentes e Módulos (todas as outras peças do kernel são funções
 *     puras, sem rede nem import lazy — ver cabeçalhos de `dispatcher.js`,
 *     `positions.js`, `layout.js`);
 *   - mantém estado mutável em memória (snapshot de menu/extensões/módulos
 *     carregado no boot, instâncias atualmente montadas) e orquestra o
 *     ciclo de vida completo de uma navegação: `router` → `dispatcher` →
 *     (`layout` já criado) → montar Componente + Módulos por posição →
 *     eventos `onAfterRoute`/`onBeforeRender`/`onAfterRender` (convenção
 *     Joomla! `on<Área><Momento>`).
 *
 * Fronteira com o host (ex.: `host-adapters/modern-script-editor/site-runner.js`,
 * ainda não escrito): este módulo NÃO sabe o que é um MSE, não lê
 * `_spPageContextInfo`, não monta URLs de manifesto a partir de convenções de
 * pasta de release. Tudo isso é injetado pelo host via `resolveManifestUrl` e
 * `importModule` — o kernel permanece neutro (seção 3: "o kernel não conhece
 * CAMAP-AGP"). Mesmo princípio de injeção de dependência já usado em
 * `host-adapters/modern-script-editor/bootstrap.js` (`importModule`,
 * `manifestResolver`) e em `kernel/site-config.js` (`store` injetado).
 *
 * Carregamento de dados: a seção 4.1 do plano descreve "um `$batch` REST no
 * boot (...), cache em memória por sessão, fallback para último estado
 * válido se uma lista falhar". Este módulo não implementa `$batch` (isso é
 * `core/rest.js`/host): ele recebe até 5 funções de carga independentes
 * (`loadMenu`, `loadExtensions`, `loadModulos`, `loadModulosMenu`,
 * `loadGlobalConfig`), roda todas em paralelo e aplica o fallback por lista —
 * se uma falhar, mantém o último snapshot válido daquela lista específica
 * (ou lista vazia, na primeira carga) em vez de abortar o boot inteiro. É
 * responsabilidade do host compor essas funções sobre um `$batch` real.
 *
 * Vocabulário de "view" (seção 2 do plano): o `view` resolvido por
 * `dispatcher.js` (ex.: "lista", "destaques") é uma VISÃO NOMEADA dentro do
 * Componente (`manifest.views`), diferente do par full/summary do manifesto
 * v1 (`manifest.capabilities.full/summary`, `manifest.entrypoints.full/summary`).
 * Este módulo usa sempre `entrypoints.full` para montar o Componente da rota
 * (ele é, por definição, o conteúdo principal da página — "Componente" ==
 * antigo `view: full`, seção 2) e sempre `entrypoints.summary` para montar
 * Módulos em posições ("Módulo" == antigo `view: summary`). O `view` nomeado
 * (`result.view`) é passado ao Componente via `context`/`params` para que
 * ELE decida internamente qual sub-renderização mostrar — este módulo nunca
 * tenta resolver um entrypoint por nome de visão.
 *
 * Templates (modelo trazido ao escopo depois do kernel original: 1 template
 * ativo por site por padrão, trocável pelo gestor via `MSETemplateStyles`/
 * `MSEConfiguracoes.Tema` — escopo Global —, com suporte a OVERRIDE por item
 * de menu via `MSEMenu.TemplateStyleId` e a overrides de view por template
 * — ver `kernel/template-registry.js#resolveTemplateNameForMenuItem` e a
 * função `ensureLayout` abaixo, 23/10/2026): este módulo continua neutro
 * quanto a QUEM monta o esqueleto visual. Por padrão, o esqueleto é sempre
 * `kernel/layout.js#createSiteLayout` (DOM neutro, sem noção de template). O
 * hook opcional `resolveLayout` (ver JSDoc de `createSiteApplication`
 * abaixo) permite a um host (ex.:
 * `host-adapters/modern-script-editor/site-boot.js`) substituir esse
 * esqueleto por um pacote de Template real (ex.:
 * `CAMAP-AGP/templates/<nome>/index.js#createTemplate`), desde que o
 * resultado seja adaptado para o mesmo shape `{ root, positionElements,
 * componentElement, dispose(), viewOverrides? }` — este módulo nunca importa
 * um pacote de template diretamente nem conhece a forma real de
 * `createTemplate()`; isso é responsabilidade de quem fornece `resolveLayout`
 * (mesmo princípio de neutralidade já usado para `resolveManifestUrl`/
 * `importModule`). `resolveLayout` pode ser chamado mais de uma vez durante a
 * vida da aplicação — uma vez por "chave de layout" distinta observada entre
 * navegações (ver `ensureLayout`); para sites que nunca usam
 * `TemplateStyleId` em nenhum item de menu, continua sendo chamado exatamente
 * uma vez, como antes deste mecanismo existir.
 */

import { parseRoute, createSiteRouter } from "./router.js";
import { findActiveMenuItem } from "./menu.js";
import { resolveDispatch, parseJsonParams } from "./dispatcher.js";
import { groupModulesByPosition } from "./positions.js";
import { createSiteLayout } from "./layout.js";
import { createEventBus } from "./events.js";
import { loadGlobalConfig as loadStoredGlobalConfig, loadExtensionConfig as loadStoredExtensionConfig } from "./site-config.js";

/**
 * Carrega, em paralelo, as listas opcionais informadas (`loaders`, um mapa
 * `{ chave: () => Promise<valor> }`). Se um loader falhar, mantém o valor
 * anterior de `previous[chave]` (ou o `fallback` informado, na primeira
 * carga) em vez de propagar o erro — implementa o "fallback para último
 * estado válido" da seção 4.1 do plano, lista por lista.
 *
 * @param {Record<string, (() => Promise<unknown>) | undefined>} loaders
 * @param {Record<string, unknown>} previous Snapshot anterior (pode ser `{}`
 *   na primeira carga).
 * @param {Record<string, unknown>} fallback Valor padrão por chave, usado
 *   quando não há `previous[chave]` e o loader falha ou está ausente.
 * @param {(error: Error, chave: string) => void} [onLoadError] Chamado (sem
 *   lançar) para cada loader que falhar — permite ao host logar/diagnosticar
 *   sem interromper o boot.
 * @returns {Promise<Record<string, unknown>>}
 */
async function loadSnapshot(loaders, previous, fallback, onLoadError) {
  const keys = Object.keys(fallback);
  const results = await Promise.all(
    keys.map(async (key) => {
      const loader = loaders[key];
      if (typeof loader !== "function") {
        return previous[key] ?? fallback[key];
      }
      try {
        const value = await loader();
        return value ?? fallback[key];
      } catch (error) {
        onLoadError?.(error, key);
        return previous[key] ?? fallback[key];
      }
    })
  );
  return Object.fromEntries(keys.map((key, index) => [key, results[index]]));
}

/**
 * Resolve, para `routeParams` declarado no manifesto do Componente, os
 * parâmetros nomeados a partir dos campos brutos da rota (`routeId`/
 * `routeSlug` de `resolveDispatch`). Apenas os nomes conhecidos "id" e
 * "slug" têm uma fonte de dados nesta fase (a rota do kernel só carrega
 * esses dois campos brutos, ver `kernel/router.js`); qualquer outro nome
 * declarado em `routeParams` resulta em `undefined` — documentado, não é
 * erro: Componentes que precisarem de mais segmentos de rota ficam para uma
 * extensão futura do contrato de rota, não deste módulo.
 *
 * Somente nomes cuja fonte bruta (`routeId`/`routeSlug`) está PRESENTE
 * (não `null`/`undefined`) entram no resultado — ou seja, numa rota sem
 * segmento `<id>-<slug>` (ex.: `#/quem-somos`, sem `.../42-titulo`), esta
 * função devolve `{}` em vez de `{ id: null, slug: null }`. Isso é
 * necessário porque quem chama (`renderComponent`, abaixo) mescla o
 * resultado por cima de `dispatch.params` (query + `MSEMenu.ParamsJson`):
 * se devolvêssemos `null` aqui, um `id` FIXO definido via `ParamsJson` do
 * item de menu (ex.: a página institucional "quem-somos", que aponta para
 * um artigo fixo do BLOG sem jamais ter `<id>-<slug>` na URL — plano C4,
 * decisão D2) seria sempre sobrescrito por `null`, quebrando esse caso de
 * uso. Quando a rota de fato traz o segmento (ex.: `#/destaques/42-titulo`),
 * o valor nomeado da rota continua vencendo normalmente, como já cobre o
 * teste "manifest.routeParams nomeado mescla em context.params".
 *
 * @param {string[] | undefined} routeParams
 * @param {{ routeId: number|null, routeSlug: string|null }} dispatch
 * @returns {Record<string, unknown>}
 */
function namedRouteParams(routeParams, dispatch) {
  if (!Array.isArray(routeParams) || routeParams.length === 0) return {};
  const source = { id: dispatch.routeId, slug: dispatch.routeSlug };
  return Object.fromEntries(
    routeParams
      .filter((name) => source[name] !== null && source[name] !== undefined)
      .map((name) => [name, source[name]])
  );
}

/**
 * Importa e valida o manifesto de uma extensão (Componente ou Módulo),
 * delegando a `resolveManifestUrl`/`importModule` injetados pelo host.
 *
 * @param {string} elemento
 * @param {(elemento: string) => string} resolveManifestUrl
 * @param {(url: string) => Promise<any>} importModule
 * @returns {Promise<object>} O manifesto (já validado por quem o define —
 *   este módulo não revalida a forma do manifesto, apenas o usa).
 */
async function importManifest(elemento, resolveManifestUrl, importModule) {
  if (typeof resolveManifestUrl !== "function") {
    throw new TypeError("resolveManifestUrl é obrigatório para montar Componentes/Módulos.");
  }
  const manifestUrl = resolveManifestUrl(elemento);
  const manifestModule = await importModule(manifestUrl);
  const manifest = manifestModule.default ?? manifestModule.manifest;
  if (!manifest || typeof manifest !== "object") {
    throw new TypeError(`Manifesto inválido para "${elemento}" (${manifestUrl}).`);
  }
  return { manifest, manifestUrl };
}

// Carregamento de `manifest.styles` (23/10/2026 — gap descoberto na
// verificação em produção do redesenho visual do Administrator,
// `docs/AUDITORIA-JOOMLA-PENTE-FINO.md`: `components/com_cpanel/manifest.js`
// já declarava `styles: ["./administrator.css"]`, mas nenhum ponto do
// caminho real de boot (`mountEntrypoint` abaixo) jamais lia esse campo —
// só `host-adapters/modern-script-editor/bootstrap.js#loadStyle`, um
// host-adapter separado usado só pelos módulos "EPUB", lia `manifest.styles`.
// Resultado: `administrator.css` nunca foi servido em produção; os ícones
// SVG novos do shell/cards renderizavam sem o `width`/`height` que essa
// folha define. Mesmo princípio de `loadStyle` (cache por `Map` de
// `href` já anexado — nunca duplica `<link>` entre montagens/instâncias —
// e NUNCA bloqueia/lança: falha de rede num `<link>` de estilo não deve
// impedir o `mount()` do Componente/Módulo, só degrada visualmente).
const loadedManifestStyles = new Map();

/**
 * @param {Element} root
 * @param {{ styles?: string[] }} manifest
 * @param {string} manifestUrl
 */
function loadManifestStyles(root, manifest, manifestUrl) {
  const document = root?.ownerDocument;
  const head = document?.head;
  if (!head || typeof document.createElement !== "function" || typeof head.querySelector !== "function") return;
  for (const style of manifest?.styles ?? []) {
    let href;
    try {
      href = new URL(style, manifestUrl).href;
    } catch {
      continue;
    }
    if (loadedManifestStyles.has(href) || head.querySelector(`link[data-mse-manifest-style="${href}"]`)) {
      loadedManifestStyles.set(href, true);
      continue;
    }
    loadedManifestStyles.set(href, true);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-mse-manifest-style", href);
    head.append(link);
  }
}

/**
 * Monta um entrypoint (Componente ou instância de Módulo) em `root`,
 * devolvendo uma função `dispose()`. Nunca decide isolamento de falha — isso
 * é responsabilidade de quem chama (`renderComponent`/`renderModules`
 * abaixo), que envolve esta função em `try/catch` por instância.
 *
 * @param {{
 *   root: Element,
 *   elemento: string,
 *   entrypointKey: "full"|"summary",
 *   resolveManifestUrl: (elemento: string) => string,
 *   importModule: (url: string) => Promise<any>,
 *   config: Record<string, unknown>,
 *   services: Record<string, unknown>,
 *   context: Record<string, unknown>,
 *   preloadedManifest?: { manifest: object, manifestUrl: string }
 * }} args `preloadedManifest`, quando informado, evita um segundo
 *   `import()` do manifesto — usado por `renderComponent`, que já precisa
 *   importar o manifesto do Componente ANTES de montar `context` (para
 *   calcular `namedRouteParams` a partir de `manifest.routeParams`) e não
 *   deve pagar o custo (nem o risco de inconsistência de cache do host) de
 *   importar o mesmo manifesto duas vezes. `renderModules` (Módulos em
 *   posição) não precisa disso e simplesmente omite o campo.
 * @returns {Promise<{ dispose: () => void|Promise<void>, update?: (args: { context: object, config: object, services: object }) => void|Promise<void>, manifest: object }>}
 */
async function mountEntrypoint({ root, elemento, entrypointKey, resolveManifestUrl, importModule, config, services, context, preloadedManifest }) {
  const { manifest, manifestUrl } = preloadedManifest ?? (await importManifest(elemento, resolveManifestUrl, importModule));
  loadManifestStyles(root, manifest, manifestUrl);
  const entrypointPath = manifest.entrypoints?.[entrypointKey];
  if (!entrypointPath) {
    throw new Error(`"${elemento}" não declara entrypoints.${entrypointKey}.`);
  }
  const entrypointUrl = new URL(entrypointPath, manifestUrl).href;
  const entrypointModule = await importModule(entrypointUrl);
  if (typeof entrypointModule.mount !== "function") {
    throw new TypeError(`"${elemento}" não exporta mount().`);
  }
  const mounted = await entrypointModule.mount({ root, config, services, context });
  const dispose = typeof mounted?.dispose === "function" ? mounted.dispose : entrypointModule.dispose;
  const update = typeof mounted?.update === "function" ? mounted.update : undefined;
  return { manifest, dispose: typeof dispose === "function" ? dispose : () => {}, update };
}

/**
 * Monta um override de view (`layout.viewOverrides?.[componente]?.[view]`,
 * 23/10/2026 — ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3) no lugar do
 * `entrypoints.full` declarado pelo manifesto do Componente. `url` já é
 * absoluta (resolvida pelo pacote de Template, ver JSDoc de
 * `adaptTemplateToLayout` em `host-adapters/modern-script-editor/site-boot.js`)
 * — este módulo só faz `importModule(url)` e aplica o MESMO contrato de
 * qualquer entrypoint (`mount({root, config, services, context})`/
 * `dispose()`), nenhum contrato novo.
 *
 * @param {{ root: Element, url: string, importModule: (url: string) => Promise<any>, config: Record<string, unknown>, services: Record<string, unknown>, context: Record<string, unknown> }} args
 * @returns {Promise<{ dispose: () => void|Promise<void> }>}
 */
async function mountOverrideEntrypoint({ root, url, importModule, config, services, context }) {
  const entrypointModule = await importModule(url);
  if (typeof entrypointModule.mount !== "function") {
    throw new TypeError(`View override "${url}" não exporta mount().`);
  }
  const mounted = await entrypointModule.mount({ root, config, services, context });
  const dispose = typeof mounted?.dispose === "function" ? mounted.dispose : entrypointModule.dispose;
  const update = typeof mounted?.update === "function" ? mounted.update : undefined;
  return { dispose: typeof dispose === "function" ? dispose : () => {}, update };
}

/**
 * Normaliza `menuItem.TemplateStyleId` (ver
 * `kernel/schemas/mse-menu.js#TemplateStyleId` e
 * `kernel/template-registry.js#resolveTemplateNameForMenuItem`) para a
 * chave de cache de layout usada por `ensureLayout` (abaixo): `null` para
 * "sem override" (ausente/0/inválido), ou o inteiro positivo em si. Aceita
 * string numérica (ex.: vinda de query/rota) — mesma tolerância de
 * `resolveTemplateNameForMenuItem`. Nunca lança por dado de conteúdo.
 *
 * @param {number|string|null|undefined} rawId
 * @returns {number|null}
 */
function normalizeTemplateStyleId(rawId) {
  if (rawId == null || rawId === "") return null;
  const value = Number(rawId);
  return Number.isInteger(value) && value >= 1 ? value : null;
}



/**
 * Cria e inicializa o Site Kernel sobre `root`: carrega o snapshot inicial
 * (menu, extensões, módulos, atribuições, configuração global), monta o
 * esqueleto de layout, registra o roteador e renderiza a rota inicial antes
 * de devolver o controle — ou seja, a promessa só resolve depois do primeiro
 * render completo (sucesso ou com estados de erro isolados, nunca lançando
 * por causa de um Componente/Módulo específico; só lança por parâmetros de
 * boot realmente inválidos, ex.: `root` ausente).
 *
 * @param {{
 *   root: Element,
 *   window?: Window,
 *   positions?: string[],
 *   componentPosition?: string,
 *   defaultView?: string,
 *   loadMenu?: () => Promise<Array<object>>,
 *   loadExtensions?: () => Promise<Array<object>>,
 *   loadModulos?: () => Promise<Array<object>>,
 *   loadModulosMenu?: () => Promise<Array<object>>,
 *   configurationStore?: import("./site-config.js").ConfigurationStoreLike,
 *   resolveManifestUrl?: (elemento: string) => string,
 *   importModule?: (url: string) => Promise<any>,
 *   services?: Record<string, unknown>,
 *   events?: ReturnType<typeof createEventBus>,
 *   onLoadError?: (error: Error, chave: string) => void,
 *   onModuleError?: (error: Error, info: { elemento: string, kind: "component"|"module", position?: string }) => void,
 *   resolveLayout?: (args: { root: Element, positions: string[], componentPosition?: string, theme: object|undefined, menuItem: object|null }) => (Promise<LayoutLike>|LayoutLike)
 * }} options `resolveLayout` é o hook opcional de Templates (ver decisão no
 *   cabeçalho do arquivo). Quando AUSENTE, o comportamento é idêntico ao
 *   kernel sem noção de Template: `createSiteLayout({root, positions,
 *   componentPosition})` é montado uma única vez, na primeira chamada de
 *   `renderRoute` (ver `ensureLayout` abaixo) — mesmo timing observável de
 *   antes deste hook existir (a primeira `renderRoute` sempre acontece logo
 *   depois do primeiro `refreshSnapshot()`, sem nenhum passo observável
 *   entre os dois). Quando PRESENTE, é chamado a partir de `ensureLayout`
 *   (chamada no início de toda `renderRoute`), recebendo `theme` como
 *   `globalConfig.theme` (pode ser `undefined`/`{}` quando nenhum Template
 *   está configurado em `MSEConfiguracoes` — escopo Global, campo `Tema`) e
 *   `menuItem` (23/10/2026 — atribuição de template por item de menu, ver
 *   `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3; o item de menu ativo da rota
 *   atual, já resolvido por `findActiveMenuItem`, ou `null` se nenhum
 *   corresponde). `resolveLayout` só é chamado de novo quando a CHAVE de
 *   layout muda entre navegações (ver `ensureLayout`: deriva de
 *   `menuItem?.TemplateStyleId`, normalizado — ausente/0/inválido sempre
 *   mapeia para a mesma chave `"default"`); para sites que nunca usam
 *   `TemplateStyleId` em nenhum item de menu, a chave nunca muda e
 *   `resolveLayout` continua sendo chamado exatamente uma vez, como antes
 *   deste mecanismo existir — zero mudança observável nesse caminho (caminho
 *   testado por regressão). O valor devolvido (ou aguardado, se for uma
 *   Promise) deve ter o mesmo shape `LayoutLike` de `createSiteLayout`:
 *   `{ root, positionElements: Map<string,Element>, componentElement:
 *   Element, dispose(), viewOverrides?: Record<string,Record<string,string>> }`
 *   — o resto deste módulo (`renderComponent`/`renderModules`/`dispose`) usa
 *   só esse shape e nunca sabe se o layout veio do fallback neutro ou de um
 *   Template real. Se `resolveLayout` lançar ou rejeitar (ex.: Template
 *   configurado não encontrado, pacote malformado), o erro é isolado (mesmo
 *   princípio de `loadSnapshot`: uma falha não deve abortar o boot/navegação
 *   inteira) e o kernel cai para `createSiteLayout({root, positions,
 *   componentPosition})` — o mesmo esqueleto neutro usado quando
 *   `resolveLayout` não é informado. Quando a chave de layout MUDA entre
 *   navegações (troca de template por item de menu), o Componente e todos os
 *   Módulos atualmente montados são desmontados (`clearComponent`/
 *   `clearModulesForPosition`, reaproveitados — mesmas funções já usadas por
 *   `dispose()`) e o layout anterior é descartado (`layout.dispose()`) ANTES
 *   do novo layout ser montado — nunca há dois layouts simultaneamente
 *   anexados a `root`.
 * @returns {Promise<{
 *   navigate: (route: object, options?: object) => string,
 *   dispose: () => Promise<void>,
 *   events: ReturnType<typeof createEventBus>
 * }>}
 */
export async function createSiteApplication({
  root,
  window = globalThis,
  positions = [],
  componentPosition,
  defaultView,
  loadMenu,
  loadExtensions,
  loadModulos,
  loadModulosMenu,
  configurationStore,
  resolveManifestUrl,
  importModule = (url) => import(url),
  services = {},
  events = createEventBus(),
  onLoadError,
  onModuleError = (error) => console.error("mse-platform site kernel:", error),
  resolveLayout
} = {}) {
  if (!root) throw new TypeError("root é obrigatório.");

  /**
   * Layout atualmente montado (começa `null`; a primeira `renderRoute`
   * sempre monta um, via `ensureLayout`) e a chave de cache usada para
   * decidir se uma navegação precisa trocar de layout — ver `ensureLayout`
   * abaixo e a decisão documentada no JSDoc de `resolveLayout` acima.
   */
  let layout = null;
  let layoutKey;

  /** Snapshot em memória, atualizado a cada boot/refresh (ver loadSnapshot). */
  let snapshot = {};
  let globalConfig = {};

  async function refreshSnapshot() {
    snapshot = await loadSnapshot(
      { menuItems: loadMenu, extensions: loadExtensions, modulos: loadModulos, modulosMenu: loadModulosMenu },
      snapshot,
      { menuItems: [], extensions: [], modulos: [], modulosMenu: [] },
      onLoadError
    );
    if (configurationStore) {
      try {
        globalConfig = (await loadStoredGlobalConfig(configurationStore)) ?? {};
      } catch (error) {
        onLoadError?.(error, "globalConfig");
      }
    }
  }

  async function extensionConfig(elemento) {
    if (!configurationStore) return {};
    try {
      return (await loadStoredExtensionConfig(configurationStore, elemento)) ?? {};
    } catch (error) {
      onLoadError?.(error, `extensionConfig:${elemento}`);
      return {};
    }
  }

  /** Dispose da instância de Componente atualmente montada (se houver). */
  let disposeComponent = null;
  // Fast-path de navegação interna (25/10/2026 — corrige o bug real por
  // trás de "vários links não estão funcionando" relatado pelo usuário:
  // diagnóstico ao vivo, clicando de fato num link da sidebar do
  // Administrator e amostrando o DOM por 1,3s, mostrou a tela inteira
  // desaparecendo e reaparecendo a cada navegação — `renderComponent`
  // sempre fazia `clearComponent()` + remount completo do Componente,
  // mesmo quando a nova rota resolve para o MESMO par (componente, view)
  // já montado, o que é o caso normal de navegar ENTRE TELAS internas de um
  // Componente "guarda-chuva" como o Administrator, com uma única rota de
  // menu `alias="administrator"` para todas as suas telas internas).
  //
  // `updateComponent`: função opcional `update({context, config, services})`
  // devolvida por `mount()` do entrypoint atualmente montado (contrato
  // aditivo — ver `mountEntrypoint`/`mountOverrideEntrypoint` acima; sem
  // `update()`, nenhuma mudança de comportamento). `lastDispatchKey`:
  // `"<componente>::<view>"` do último mount COMPLETO. `lastManifest`: o
  // manifesto desse mount, reaproveitado pelo fast-path para
  // `namedRouteParams` sem reimportar.
  let updateComponent = null;
  let lastDispatchKey = null;
  let lastManifest = null;
  /** Dispose das instâncias de Módulo atualmente montadas, por posição. */
  const disposeModulesByPosition = new Map();

  async function clearComponent() {
    if (disposeComponent) {
      await disposeComponent();
      disposeComponent = null;
    }
    updateComponent = null;
    lastDispatchKey = null;
    lastManifest = null;
    if (typeof layout.componentElement.replaceChildren === "function") {
      layout.componentElement.replaceChildren();
    }
    delete layout.componentElement.dataset?.mseDispatchReason;
  }

  async function clearModulesForPosition(positionName) {
    const previous = disposeModulesByPosition.get(positionName);
    if (previous) {
      for (const dispose of previous) {
        try {
          await dispose();
        } catch (error) {
          onModuleError(error, { elemento: "(dispose)", kind: "module", position: positionName });
        }
      }
      disposeModulesByPosition.delete(positionName);
    }
    // Remove também os próprios contêineres `<div data-mse-module-instance>`
    // (não só o dispose() de cada módulo): sem isto, `renderModules` (abaixo)
    // ANEXA novos contêineres ao lado dos antigos a cada troca de rota, em
    // vez de substituí-los — os antigos ficam vazios/órfãos no DOM (já
    // desmontados, sem conteúdo) e o seletor adjacente de
    // `theme/positions.css` (`[data-mse-module-instance] +
    // [data-mse-module-instance] { border-top: ... }`) desenha uma linha
    // visível na junção entre a cópia morta e a nova, com o espaço vazio da
    // cópia morta por cima — o "linhas cinzas e espaços em branco sem
    // sentido" relatado ao navegar via SPA (hash) pela Home. Mesmo padrão já
    // usado por `clearComponent()` acima para `layout.componentElement`:
    // limpar o contêiner é responsabilidade de quem o preenche de novo a
    // cada render, não só desfazer o mount() anterior. Cobre também o caso
    // de um módulo que falhou ao montar (sem disposer registrado, só
    // `data-mse-module-error`): `replaceChildren()` limpa tudo, não só o
    // que tinha disposer rastreado.
    const positionElement = layout?.positionElements?.get(positionName);
    if (positionElement && typeof positionElement.replaceChildren === "function") {
      positionElement.replaceChildren();
    }
  }

  function navigateFn(targetRoute, navigateOptions) {
    return router.navigate(targetRoute, navigateOptions);
  }

  /**
   * Garante que `layout` reflete o template correto para `menuItem` (item de
   * menu ativo da rota sendo renderizada) — 23/10/2026, atribuição de
   * template por item de menu, ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3.
   * Chamada no início de toda `renderRoute`, ANTES de `renderComponent`/
   * `renderModules`.
   *
   * A "chave de layout" desejada deriva de `menuItem?.TemplateStyleId`
   * (normalizado por `normalizeTemplateStyleId`): `"default"` quando
   * ausente/0/inválido (caso comum — nenhum override), ou `"menu:<id>"`
   * quando presente. Se a chave é igual à do layout já montado
   * (`layoutKey`), esta função é um no-op — reaproveita o layout atual
   * SEM remontagem, preservando o caminho já testado para o caso comum
   * "nenhum menu usa TemplateStyleId" (inclui a primeira chamada de
   * `renderRoute`, onde `layout` ainda é `null`: a comparação
   * `layout && layoutKey === desiredKey` nunca é verdadeira enquanto
   * `layout` for `null`, então a primeira navegação sempre monta).
   *
   * Quando a chave MUDA (ou é a primeira montagem): resolve o novo layout
   * (via `resolveLayout`, se informado — recebendo agora também `menuItem`
   * — com o mesmo fallback para `createSiteLayout` já usado no boot em caso
   * de ausência/erro) e SÓ ENTÃO desmonta o layout anterior, se havia um
   * (`clearComponent`/`clearModulesForPosition` para cada posição conhecida,
   * depois `layout.dispose()`) — nunca há dois layouts simultaneamente
   * montados em `root`.
   *
   * @param {object | null} menuItem
   */
  async function ensureLayout(menuItem) {
    const templateStyleId = normalizeTemplateStyleId(menuItem?.TemplateStyleId);
    const desiredKey = templateStyleId != null ? `menu:${templateStyleId}` : "default";
    if (layout && layoutKey === desiredKey) return;

    let nextLayout = null;
    if (resolveLayout) {
      try {
        nextLayout = (await resolveLayout({ root, positions, componentPosition, theme: globalConfig.theme, menuItem: menuItem ?? null })) ?? null;
      } catch (error) {
        onLoadError?.(error, "resolveLayout");
      }
    }
    if (!nextLayout) {
      nextLayout = createSiteLayout({ root, positions, componentPosition });
    }

    if (layout) {
      await clearComponent();
      for (const positionName of [...disposeModulesByPosition.keys()]) {
        await clearModulesForPosition(positionName);
      }
      layout.dispose();
    }

    layout = nextLayout;
    layoutKey = desiredKey;
  }

  async function renderComponent(dispatch, route, menuItem) {
    const element = layout.componentElement;

    if (!dispatch.found) {
      await clearComponent();
      element.dataset && (element.dataset.mseDispatchReason = dispatch.reason);
      return;
    }

    // Fast-path (ver comentário de `updateComponent` acima): mesma
    // (componente, view) já montada E o entrypoint expõe `update()` ->
    // atualiza em vez de desmontar+remontar o Componente inteiro. Sem
    // isto, qualquer Componente "guarda-chuva" com várias telas internas
    // sob uma única rota de menu (ex.: o Administrator, `option=com_xxx`)
    // desmontava e remontava por completo a cada navegação interna —
    // percebido pelo usuário como a página inteira desaparecendo e
    // "links não funcionando".
    const dispatchKey = `${dispatch.componente}::${dispatch.view}`;
    if (updateComponent && dispatchKey === lastDispatchKey) {
      try {
        const config = { ...globalConfig, ...(await extensionConfig(dispatch.componente)) };
        const namedParams = namedRouteParams(lastManifest?.routeParams, dispatch);
        const context = Object.freeze({
          route,
          menuItem,
          position: componentPosition,
          navigate: navigateFn,
          view: dispatch.view,
          params: { ...dispatch.params, ...namedParams }
        });
        await updateComponent({ context, config, services });
        return;
      } catch (error) {
        // Nunca deixa o app num estado quebrado: reporta e cai para o
        // caminho de remount completo abaixo (mesma auto-recuperação já
        // aplicada a falhas de mount normal).
        onModuleError(error, { elemento: dispatch.componente, kind: "component-update" });
      }
    }

    await clearComponent();

    try {
      const config = { ...globalConfig, ...(await extensionConfig(dispatch.componente)) };
      const preloadedManifest = await importManifest(dispatch.componente, resolveManifestUrl, importModule);
      const namedParams = namedRouteParams(preloadedManifest.manifest.routeParams, dispatch);
      const context = Object.freeze({
        route,
        menuItem,
        position: componentPosition,
        navigate: navigateFn,
        view: dispatch.view,
        params: { ...dispatch.params, ...namedParams }
      });
      // Override de view por template (23/10/2026 —
      // `templates/<t>/html/<view>`, ver docs/AUDITORIA-JOOMLA-PENTE-FINO.md
      // §3): se o layout atual declara um override para este
      // (componente, view), ele substitui o entrypoints.full do manifesto
      // original — mesmo contrato mount()/dispose(), nenhuma mudança de
      // forma. Ausente/undefined: comportamento idêntico a hoje.
      const overrideUrl = layout.viewOverrides?.[dispatch.componente]?.[dispatch.view];
      const { manifest, dispose, update } = overrideUrl
        ? {
            manifest: preloadedManifest.manifest,
            ...(await mountOverrideEntrypoint({ root: element, url: overrideUrl, importModule, config, services, context }))
          }
        : await mountEntrypoint({
            root: element,
            elemento: dispatch.componente,
            entrypointKey: "full",
            resolveManifestUrl,
            importModule,
            config,
            services,
            context,
            preloadedManifest
          });
      if (manifest.views && !manifest.views[dispatch.view]) {
        const fallbackView = Object.keys(manifest.views)[0];
        element.dataset && (element.dataset.mseView = fallbackView ?? dispatch.view);
      } else {
        element.dataset && (element.dataset.mseView = dispatch.view);
      }
      disposeComponent = dispose;
      updateComponent = update ?? null;
      lastDispatchKey = dispatchKey;
      lastManifest = manifest;
    } catch (error) {
      onModuleError(error, { elemento: dispatch.componente, kind: "component" });
      element.dataset && (element.dataset.mseDispatchReason = "error");
    }
  }

  async function renderModules(route, menuItem) {
    const grouped = groupModulesByPosition(snapshot.modulos, {
      modulosMenu: snapshot.modulosMenu,
      menuItemId: menuItem?.Id ?? null
    });

    for (const positionName of layout.positionElements.keys()) {
      await clearModulesForPosition(positionName);
      const positionElement = layout.positionElements.get(positionName);
      const modulosNaPosicao = grouped[positionName] ?? [];
      const disposers = [];

      for (const modulo of modulosNaPosicao) {
        const instanceElement = positionElement.ownerDocument.createElement("div");
        instanceElement.setAttribute("data-mse-module-instance", String(modulo.Id ?? ""));
        instanceElement.setAttribute("data-mse-module-type", String(modulo.Module ?? ""));
        if (typeof positionElement.append === "function") positionElement.append(instanceElement);
        else positionElement.appendChild(instanceElement);

        try {
          // Parâmetros fixos da INSTÂNCIA (MSEModules.ParamsJson, ex.: title/
          // items definidos pelo gestor para este módulo específico, não para
          // o tipo inteiro) prevalecem sobre a configuração por extensão
          // (`extensionConfig`, escopo "Extensao", vale para todo Module)
          // — mesma precedência de "mais específico vence" já usada por
          // `dispatcher.js` ao mesclar `ParamsJson` do item de menu. Sem este
          // merge, nenhuma configuração por instância chegava ao mount() do
          // módulo (gap identificado na Fase C3 do CAMAP-AGP).
          const moduloParams = parseJsonParams(modulo.ParamsJson);
          const config = { ...globalConfig, ...(await extensionConfig(modulo.Module)), ...moduloParams };
          const context = Object.freeze({
            route,
            menuItem,
            position: positionName,
            navigate: navigateFn,
            modulo: Object.freeze({
              id: modulo.Id,
              title: modulo.Title ?? null,
              mostrarTitulo: Boolean(modulo.ShowTitle),
              estilo: modulo.Style ?? null,
              params: moduloParams
            })
          });
          const { dispose } = await mountEntrypoint({
            root: instanceElement,
            elemento: modulo.Module,
            entrypointKey: "summary",
            resolveManifestUrl,
            importModule,
            config,
            services,
            context
          });
          disposers.push(dispose);
        } catch (error) {
          onModuleError(error, { elemento: modulo.Module, kind: "module", position: positionName });
          instanceElement.setAttribute("data-mse-module-error", "true");
        }
      }

      disposeModulesByPosition.set(positionName, disposers);
    }
  }

  async function renderRoute(route) {
    const menuItem = findActiveMenuItem(snapshot.menuItems, route);
    events.emit("onAfterRoute", { route, menuItem });

    await ensureLayout(menuItem);

    const dispatch = resolveDispatch({ route, menuItems: snapshot.menuItems, extensions: snapshot.extensions, defaultView });

    events.emit("onBeforeRender", { route, menuItem, dispatch });
    await Promise.all([renderComponent(dispatch, route, menuItem), renderModules(route, menuItem)]);
    events.emit("onAfterRender", { route, menuItem, dispatch });
  }

  await refreshSnapshot();

  const router = createSiteRouter({
    window,
    initial: false,
    onRoute: (route) => {
      renderRoute(route).catch((error) => onModuleError(error, { elemento: "(router)", kind: "component" }));
    }
  });

  // Rota inicial: lida explicitamente de `window.location.hash` (o `window`
  // injetado, não `globalThis`) para que o boot em ambiente de teste/host
  // isolado nunca dependa do `location` global do processo — mesmo cuidado
  // de injeção de dependência de `createSiteRouter`/`createHashRouter`.
  await renderRoute(parseRoute(window.location?.hash));

  async function dispose() {
    router.dispose();
    await clearComponent();
    for (const positionName of [...disposeModulesByPosition.keys()]) {
      await clearModulesForPosition(positionName);
    }
    layout.dispose();
  }

  return Object.freeze({ navigate: navigateFn, dispose, events });
}
