/**
 * Roteamento SEF (Search Engine Friendly, no sentido Joomla!) do Site Kernel
 * (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seção 4 `kernel/router.js` e
 * seção 4.1 "Roteamento").
 *
 * Contrato de hash: `#/<alias>[/<id>-<slug>][?k=v]`. Este módulo NÃO duplica
 * o parsing/serialização de hash de baixo nível nem a escuta de
 * `hashchange`: ambos já existem em `core/navigation.js`
 * (`getHashRoute`, `createHashRouter`, `navigateTo`). Aqui apenas se
 * interpreta a string de hash como a rota estruturada do kernel
 * (`{ alias, id, slug, query }`) e se oferece um wrapper fino para navegar
 * programaticamente sem o chamador precisar montar a string à mão.
 */

import { createHashRouter, getHashRoute, navigateTo } from "../core/navigation.js";

const ROUTE_SEGMENT_PATTERN = /^(\d+)(?:-(.*))?$/;

function emptyRoute() {
  return { alias: "", id: null, slug: null, query: {} };
}

/**
 * Interpreta uma string de hash no contrato `#/<alias>[/<id>-<slug>][?k=v]`
 * e devolve uma rota estruturada.
 *
 * @param {string} [hash] String de hash explícita (com ou sem `#` inicial,
 *   ex.: `"#/destaques/42-titulo-do-artigo?page=2"`, `"/destaques"`, `"#/"`,
 *   `""`). Quando omitida (`undefined`), usa `getHashRoute()` de
 *   `core/navigation.js` para ler o hash atual de `globalThis.location`.
 * @returns {{ alias: string, id: number|null, slug: string|null, query: Record<string, string> }}
 *   Rota estruturada. Campos ausentes vêm como `""`/`null`/`{}` (nunca
 *   `undefined` para `alias`/`query`, para facilitar desestruturação).
 *   Qualquer hash malformado degrada graciosamente para a rota vazia
 *   (`{ alias: "", id: null, slug: null, query: {} }`) ou, quando possível
 *   extrair pelo menos o alias, mantém o alias e descarta somente a parte
 *   malformada (ex.: segmento `<id>-<slug>` inválido) — nunca lança.
 */
export function parseRoute(hash) {
  try {
    let raw;
    if (hash === undefined) {
      raw = getHashRoute();
    } else if (hash === null) {
      raw = "";
    } else {
      raw = String(hash);
    }

    let value = raw.startsWith("#") ? raw.slice(1) : raw;

    const queryIndex = value.indexOf("?");
    let pathPart = queryIndex === -1 ? value : value.slice(0, queryIndex);
    const queryPart = queryIndex === -1 ? "" : value.slice(queryIndex + 1);

    if (pathPart.startsWith("/")) pathPart = pathPart.slice(1);

    const segments = pathPart === "" ? [""] : pathPart.split("/");

    const alias = decodeURIComponent(segments[0] ?? "");

    let id = null;
    let slug = null;
    if (segments.length > 1 && segments[1] !== "") {
      const decodedSegment = decodeURIComponent(segments[1]);
      const match = ROUTE_SEGMENT_PATTERN.exec(decodedSegment);
      if (match) {
        id = Number(match[1]);
        slug = match[2] && match[2] !== "" ? match[2] : null;
      }
      // Segmento `<id>-<slug>` malformado (ex.: não numérico): degrada
      // mantendo o alias já extraído, mas descartando id/slug (ambos
      // permanecem `null`), em vez de lançar.
    }

    const query = {};
    if (queryPart !== "") {
      for (const pair of queryPart.split("&")) {
        if (pair === "") continue;
        const equalsIndex = pair.indexOf("=");
        const rawKey = equalsIndex === -1 ? pair : pair.slice(0, equalsIndex);
        const rawValue = equalsIndex === -1 ? "" : pair.slice(equalsIndex + 1);
        const key = decodeURIComponent(rawKey);
        if (key === "") continue;
        query[key] = decodeURIComponent(rawValue);
      }
    }

    return { alias, id, slug, query };
  } catch {
    // Hash malformado a ponto de falhar na decodificação (ex.: sequência
    // percent-encoding inválida): degrada para a rota vazia.
    return emptyRoute();
  }
}

/**
 * Monta a string de hash correspondente a uma rota estruturada — função
 * inversa de `parseRoute` (round-trip: `parseRoute(serializeRoute(r))`
 * reproduz `r`, exceto normalizações esperadas como ausência de slug/id
 * quando não informados).
 *
 * @param {{ alias?: string, id?: number|string|null, slug?: string|null, query?: Record<string, unknown> }} [route]
 * @returns {string} Hash no formato `#/<alias>[/<id>-<slug>][?k=v]`. Nunca
 *   lança: entradas ausentes/inválidas são tratadas como vazias (alias
 *   `""`, sem id, sem query).
 */
export function serializeRoute(route = {}) {
  const { alias, id, slug, query } = route ?? {};

  const aliasPart = encodeURIComponent(alias ?? "");
  let hash = `#/${aliasPart}`;

  const hasId = id !== undefined && id !== null && String(id) !== "";
  if (hasId) {
    const idPart = encodeURIComponent(String(id));
    const slugPart = slug ? `-${encodeURIComponent(String(slug))}` : "";
    hash += `/${idPart}${slugPart}`;
  }

  if (query && typeof query === "object") {
    const entries = Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null
    );
    if (entries.length > 0) {
      const queryString = entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&");
      hash += `?${queryString}`;
    }
  }

  return hash;
}

/**
 * Wrapper fino sobre `createHashRouter` (`core/navigation.js`): a cada
 * mudança de hash, interpreta o hash cru com `parseRoute` e invoca
 * `onRoute` com a rota estruturada (nunca com a string crua).
 *
 * Limitação herdada de `createHashRouter`: a escuta depende de
 * `window.addEventListener("hashchange", ...)`, portanto requer um
 * ambiente de browser real ou um stub mínimo de `window`/`location`
 * compatível (ver `core/test/navigation.test.js` para o padrão de stub).
 *
 * @param {{
 *   onRoute: (route: { alias: string, id: number|null, slug: string|null, query: Record<string, string> }) => void,
 *   window?: Window,
 *   initial?: boolean,
 *   scroll?: boolean,
 *   replace?: boolean
 * }} options `onRoute` é obrigatório. Os demais são repassados para
 *   `createHashRouter`/`navigateTo` (úteis para injetar um stub de
 *   `window` em teste); `replace` é o padrão usado por `navigate()`
 *   quando a chamada não informa o próprio `replace`.
 * @returns {{
 *   navigate: (route: object, navigateOptions?: { replace?: boolean, scroll?: boolean }) => string,
 *   dispose: () => void,
 *   destroy: () => void
 * }} `navigate` serializa a rota e delega a `navigateTo`. `dispose`/`destroy`
 *   são o mesmo cancelamento de listener que `createHashRouter` já devolve
 *   (não existe uma API de desregistro adicional no módulo base, então não
 *   há nada próprio deste wrapper para liberar além disso).
 */
export function createSiteRouter({
  onRoute,
  window = globalThis,
  initial = true,
  scroll = true,
  replace = false
} = {}) {
  if (typeof onRoute !== "function") {
    throw new TypeError("onRoute deve ser uma função.");
  }

  const disposeHashRouter = createHashRouter({
    window,
    initial,
    scroll,
    onRoute: (rawHash) => onRoute(parseRoute(rawHash))
  });

  function navigate(route, navigateOptions = {}) {
    const hash = serializeRoute(route);
    return navigateTo(hash, {
      window,
      replace: navigateOptions.replace ?? replace,
      scroll: navigateOptions.scroll ?? scroll
    });
  }

  return {
    navigate,
    dispose: disposeHashRouter,
    destroy: disposeHashRouter
  };
}
