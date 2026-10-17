/**
 * Dispatcher do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seção 4,
 * linha `kernel/dispatcher.js`: "resolve Componente + visão + parâmetros; import
 * lazy"; seção 4.1; seção 5, linha "Componentes (MVC, views)" -> "manifesto v2 +
 * `dispatcher.js`").
 *
 * Função pura: recebe a rota já interpretada por `kernel/router.js`
 * (`parseRoute`), os itens de menu (`MSEMenu`, shape de `kernel/menu.js`) e as
 * extensões (`MSEExtensoes`, shape de `kernel/extension-registry.js`) já
 * carregados em memória, e devolve QUAL Componente, QUAL visão e QUAIS
 * parâmetros correspondem àquela rota. Nenhuma função aqui faz `fetch`,
 * `import()` dinâmico, acessa `window`/`location` ou qualquer outro efeito
 * colateral — é só decisão sobre dados já disponíveis.
 *
 * Fronteira de responsabilidade com `kernel/application.js` (quem integra o
 * kernel de ponta a ponta):
 *   - `dispatcher.js` (este arquivo) decide a TRÍADE (Componente, view,
 *     params) a partir de dados já em memória. Ele NUNCA sabe se o
 *     Componente escolhido realmente existe como módulo instalado, nunca
 *     importa o manifesto do Componente (`core/module-contract.js` é usado
 *     apenas por quem AUTORA manifestos, não por este arquivo) e nunca
 *     valida se a `view` resolvida está de fato declarada em
 *     `manifest.views`. Essas três coisas dependem de um `import()`
 *     dinâmico (carregar o manifesto e o entrypoint do Componente), que é
 *     justamente o "import lazy" citado no plano — e isso é tarefa de
 *     `application.js`.
 *   - `application.js` deve: chamar `resolveDispatch(...)`; se
 *     `result.found === false`, decidir o que renderizar (ex.: layout
 *     "somente módulos" quando `reason === "modules-only"`, página 404
 *     quando `reason === "not-found"`, ou uma mensagem de indisponibilidade
 *     quando `reason === "disabled"`) — este arquivo nunca lança nesses
 *     casos, pois são situações normais de navegação, não erros; se
 *     `result.found === true`, importar (via `import()` dinâmico) o
 *     manifesto do Componente `result.componente`, confirmar que
 *     `result.view` existe em `manifest.views` (caso contrário, cair para
 *     uma visão padrão ou 404, a critério de `application.js`), extrair de
 *     `result.routeId`/`result.routeSlug` os parâmetros nomeados segundo
 *     `manifest.routeParams` (ex.: `routeParams: ["id"]` -> `{ id:
 *     result.routeId }`) e então importar o entrypoint do Componente para
 *     montá-lo com `result.params` (mais os parâmetros nomeados por
 *     `routeParams`, se `application.js` optar por mesclá-los).
 *
 * Reaproveitamento (nenhuma lógica duplicada):
 *   - `findActiveMenuItem` é importado de `./menu.js` (mesma regra de
 *     resolução do item de menu ativo usada em qualquer outro lugar do
 *     kernel que precise disso).
 *   - `isEnabled` é importado de `./extension-registry.js`. Este arquivo
 *     NUNCA reimplementa a tradução `type` (manifesto) <-> `Tipo`
 *     (MSEExtensoes) nem a verificação de habilitação — ambas pertencem
 *     exclusivamente a `extension-registry.js`, como documentado no
 *     cabeçalho daquele módulo.
 */

import { findActiveMenuItem } from "./menu.js";
import { isEnabled } from "./extension-registry.js";

/** Nome da visão usada quando a rota/menu não especifica nenhuma. */
const DEFAULT_VIEW = "full";

/**
 * Interpreta um campo `ParamsJson` (string JSON opcionalmente presente em um
 * item de menu ou módulo, com parâmetros fixos definidos pelo gestor) de
 * forma tolerante: ausência, string vazia, JSON malformado ou um valor que
 * não seja um objeto simples (ex.: array, número) são todos tratados como
 * "sem parâmetros adicionais" (`{}`) — nunca lança. Mesmo princípio de
 * tolerância a dados do SharePoint já usado em `kernel/menu.js` (campos
 * ausentes degradam graciosamente) e `kernel/content-services.js` (datas
 * inválidas tratadas como ausentes).
 *
 * Exportada (não só interna a este arquivo) porque `kernel/application.js`
 * reaproveita exatamente a mesma tolerância para `MSEModulos.ParamsJson`
 * (parâmetros fixos de uma instância de Módulo em posição) — mesma forma de
 * dado, mesma lista de falhas aceitáveis, nenhuma razão para duplicar a
 * lógica de parse.
 *
 * @param {unknown} raw Valor crú de `ParamsJson` (esperado `string|null|undefined`).
 * @returns {Record<string, unknown>}
 */
export function parseJsonParams(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

/** Alias histórico, mantido para o uso já existente dentro deste arquivo. */
const parseMenuParams = parseJsonParams;

/**
 * Resolve, para uma rota já estruturada (`kernel/router.js`'s `parseRoute`),
 * qual Componente, qual visão e quais parâmetros mesclados correspondem a
 * ela — sem nunca importar código do Componente (ver cabeçalho do arquivo
 * para a fronteira exata com `application.js`).
 *
 * @param {{
 *   route: { alias: string, id: number|null, slug: string|null, query: Record<string, string> },
 *   menuItems: Array<object>,
 *   extensions: Array<object>,
 *   defaultView?: string
 * }} params
 *   `route` é o shape devolvido por `parseRoute` (`kernel/router.js`).
 *   `menuItems` é o array cru de itens da lista `MSEMenu` (shape de
 *   `kernel/menu.js`). `extensions` é o array cru de itens da lista
 *   `MSEExtensoes` (shape de `kernel/extension-registry.js`). `defaultView`
 *   é opcional (padrão `"full"`) e só é usado quando nem a query string nem
 *   o item de menu especificam uma visão.
 * @returns {
 *   | { found: false, menuItem: object|null, reason: "not-found"|"modules-only"|"disabled" }
 *   | {
 *       found: true,
 *       menuItem: object,
 *       componente: string,
 *       view: string,
 *       params: Record<string, unknown>,
 *       routeId: number|null,
 *       routeSlug: string|null
 *     }
 * }
 *   Em caso de "não encontrado" (`found: false`), `reason` distingue três
 *   situações normais de navegação (nenhuma é um erro):
 *     - `"not-found"`: nenhum item de menu publicado corresponde à rota
 *       (404 — alias desconhecido e, na rota raiz, nenhum item `Padrao`).
 *     - `"modules-only"`: o item de menu ativo existe, mas não declara
 *       Componente (ex.: a Home "somente módulos" do plano) — `menuItem`
 *       vem preenchido para quem chama montar o layout a partir dele.
 *     - `"disabled"`: o Componente referenciado pelo item de menu existe em
 *       `extensions`, mas está desabilitado (ou ausente do registro —
 *       `isEnabled` trata os dois casos da mesma forma).
 *   Em caso de sucesso (`found: true`), `params` já vem com a query string
 *   da rota mesclada com `ParamsJson` do item de menu (quando ambos têm a
 *   mesma chave, `ParamsJson` prevalece — é o parâmetro fixo definido pelo
 *   gestor do site, não deve ser sobrescrevível por quem monta a URL).
 *   `routeId`/`routeSlug` vêm brutos (sem nome), pois nomeá-los conforme
 *   `routeParams` exige o manifesto do Componente, que este módulo não
 *   carrega (ver cabeçalho).
 */
export function resolveDispatch({ route, menuItems, extensions, defaultView = DEFAULT_VIEW } = {}) {
  const safeRoute = route ?? {};
  const menuItem = findActiveMenuItem(menuItems, safeRoute);

  if (!menuItem) {
    return { found: false, menuItem: null, reason: "not-found" };
  }

  const componente = typeof menuItem.Componente === "string" ? menuItem.Componente.trim() : "";
  if (componente === "") {
    return { found: false, menuItem, reason: "modules-only" };
  }

  if (!isEnabled(extensions, componente)) {
    return { found: false, menuItem, reason: "disabled" };
  }

  const query = safeRoute.query && typeof safeRoute.query === "object" ? safeRoute.query : {};
  const menuParams = parseMenuParams(menuItem.ParamsJson);

  const view =
    (typeof query.view === "string" && query.view.trim() !== "" && query.view.trim()) ||
    (typeof menuItem.Visao === "string" && menuItem.Visao.trim() !== "" && menuItem.Visao.trim()) ||
    defaultView;

  const params = { ...query, ...menuParams };

  return {
    found: true,
    menuItem,
    componente,
    view,
    params,
    routeId: safeRoute.id ?? null,
    routeSlug: safeRoute.slug ?? null
  };
}
