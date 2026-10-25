/**
 * Serviços puros de conteúdo do Site Kernel (mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4, `kernel/content-services.js`; seção 4.1; linha "com_content, categorias, tags,
 * estados, destaque" da seção 5).
 *
 * Generaliza, de forma site-agnóstica, o comportamento hoje ad-hoc em
 * `CAMAP-AGP/core/core.js` (`published(filtros)`, `publication(id)`) — mas SEM REST, SEM
 * SharePoint e sem nomes de campo específicos do CAMAP. Este módulo só recebe arrays de
 * "artigo" já carregados em memória (a camada de REST é `core/rest.js` / `core/data-sources.js`
 * do mse-platform, e não é duplicada aqui) e devolve dados filtrados/ordenados/paginados.
 *
 * Shape mínimo esperado de cada "artigo" (inspirado no CAMAP, mas genérico — nenhum destes
 * campos é específico de um domínio de conteúdo; campos ausentes são tratados como "sem
 * restrição" pelo lado correspondente):
 *   {
 *     id: number | string,
 *     titulo: string,
 *     estado: "Publicado" | "Despublicado" | "Arquivado" | "Lixeira",
 *     categoriaId?: number | string,
 *     tags?: string[],
 *     destaque?: boolean,
 *     ordemDestaque?: number,          // ascendente; itens sem valor ficam no final
 *     destaqueDe?: string | Date,      // janela opcional do destaque
 *     destaqueAte?: string | Date,
 *     publicarDe?: string | Date,      // janela de vigência editorial
 *     publicarAte?: string | Date,
 *     criadoEm?: string | Date,
 *     ...                              // demais campos do site não são tocados aqui
 *   }
 *
 * Todas as funções são puras: nunca mutam o array (ou os objetos) de entrada, tratam
 * `artigos` ausente/`undefined`/não-array como lista vazia, e nunca fazem I/O.
 *
 * `aggregateTagCounts` (Wave 2, `modules/mod_tags_popular`): agrega a contagem de uso
 * de cada tag a partir de uma lista de artigos já carregada (tipicamente após
 * `filterPublished`) — mesmo princípio das demais funções deste arquivo (pura, nunca
 * muta a entrada, tolera `artigos` ausente). Não existe hoje nenhuma outra função de
 * agregação neste módulo; esta é a primeira.
 */

const ESTADO_PUBLICADO = "Publicado";

function toArray(artigos) {
  return Array.isArray(artigos) ? artigos : [];
}

/**
 * Resolve um valor "agora" para um `Date` válido. Aceita `Date`, string/number
 * parseável, ou nada (usa o relógio atual). Um valor inválido também cai no
 * relógio atual, em vez de propagar uma data inválida para as comparações.
 */
function resolveNow(agora) {
  if (agora == null) return new Date();
  const date = agora instanceof Date ? agora : new Date(agora);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Converte um valor de data opcional em `Date`, ou `null` se ausente/invalido.
 * Um limite de janela inválido é tratado como ausente (sem restrição naquele
 * lado), em vez de excluir indevidamente todo o conteúdo.
 */
function parseDateOrNull(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinWindow(now, deValue, ateValue) {
  const de = parseDateOrNull(deValue);
  const ate = parseDateOrNull(ateValue);
  if (de && now.getTime() < de.getTime()) return false;
  if (ate && now.getTime() > ate.getTime()) return false;
  return true;
}

/**
 * Ordenação estável genérica: decora cada item com seu índice original para
 * que empates em `compare` preservem a ordem relativa de entrada, independente
 * de o motor de `Array#sort` do runtime ser ou não estável.
 */
function stableSortBy(array, compare) {
  return array
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const result = compare(a.item, b.item);
      return result !== 0 ? result : a.index - b.index;
    })
    .map((wrapped) => wrapped.item);
}

function compareOrdemDestaque(a, b) {
  const aTem = a?.ordemDestaque !== undefined && a?.ordemDestaque !== null;
  const bTem = b?.ordemDestaque !== undefined && b?.ordemDestaque !== null;
  if (aTem && bTem) return a.ordemDestaque - b.ordemDestaque;
  if (aTem && !bTem) return -1;
  if (!aTem && bTem) return 1;
  return 0;
}

/**
 * Somente artigos com `estado === "Publicado"` e dentro da janela de vigência
 * (`publicarDe`/`publicarAte`, ambos opcionais; lado ausente = sem restrição).
 *
 * @param {Array<object>} artigos
 * @param {Date | string | number} [agora]
 * @returns {Array<object>}
 */
export function filterPublished(artigos, agora = new Date()) {
  const now = resolveNow(agora);
  return toArray(artigos).filter(
    (artigo) => artigo?.estado === ESTADO_PUBLICADO && isWithinWindow(now, artigo?.publicarDe, artigo?.publicarAte)
  );
}

/**
 * Somente artigos cujo `categoriaId` é igual (`===`) ao informado.
 *
 * @param {Array<object>} artigos
 * @param {number | string} categoriaId
 * @returns {Array<object>}
 */
export function filterByCategoria(artigos, categoriaId) {
  return toArray(artigos).filter((artigo) => artigo?.categoriaId === categoriaId);
}

/**
 * Somente artigos cujo array `tags` contém a tag informada. Um artigo sem
 * `tags` (ou com `tags` que não é array) nunca combina com nenhuma tag.
 *
 * @param {Array<object>} artigos
 * @param {string} tag
 * @returns {Array<object>}
 */
export function filterByTag(artigos, tag) {
  return toArray(artigos).filter((artigo) => Array.isArray(artigo?.tags) && artigo.tags.includes(tag));
}

/**
 * Somente artigos com `destaque === true`, respeitando a janela opcional
 * `destaqueDe`/`destaqueAte` quando presente, ordenados por `ordemDestaque`
 * ascendente (estável; itens sem `ordemDestaque` ficam no final, na ordem em
 * que apareceram).
 *
 * @param {Array<object>} artigos
 * @param {{ agora?: Date | string | number }} [options]
 * @returns {Array<object>}
 */
export function filterFeatured(artigos, { agora } = {}) {
  const now = resolveNow(agora);
  const destacados = toArray(artigos).filter(
    (artigo) => artigo?.destaque === true && isWithinWindow(now, artigo?.destaqueDe, artigo?.destaqueAte)
  );
  return stableSortBy(destacados, compareOrdemDestaque);
}

function isDateWithinRange(value, startDate, endDate) {
  const start = parseDateOrNull(startDate);
  const end = parseDateOrNull(endDate);
  if (start && value.getTime() < start.getTime()) return false;
  if (end && value.getTime() > end.getTime()) return false;
  return true;
}

function isWithinRelativeDays(value, now, days) {
  if (!Number.isFinite(days) || days <= 0) return true;
  const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;
  return value.getTime() >= threshold;
}

/**
 * Restringe artigos a uma janela de data — generaliza o campo `date_filtering`
 * usado tanto por `mod_articles_category` quanto por `mod_articles_popular`
 * (Joomla!, ambos com os mesmos 5 campos `date_filtering`/`date_field`/
 * `start_date_range`/`end_date_range`/`relative_date`) — reaproveitada aqui
 * em vez de duplicada módulo a módulo (ver `modules/mod_articles_category/category-data.js`
 * e `modules/mod_articles_popular/popular-data.js`).
 *
 * Três modos (`mode`):
 * - `"off"` (padrão): nenhuma restrição, devolve `artigos` inalterado.
 * - `"range"`: retém artigos cujo campo `field` (padrão `"criadoEm"`) cai
 *   entre `startDate`/`endDate` (ambos opcionais; lado ausente = sem limite
 *   naquele lado).
 * - `"relative"`: retém artigos cujo campo `field` está dentro dos últimos
 *   `relativeDays` dias a partir de `agora` (padrão: relógio atual).
 * Em "range"/"relative", um artigo cujo campo de data está ausente/inválido
 * nunca combina (tratado como fora da janela).
 *
 * @param {Array<object>} artigos
 * @param {{
 *   mode?: "off" | "range" | "relative",
 *   field?: string,
 *   startDate?: string | Date,
 *   endDate?: string | Date,
 *   relativeDays?: number,
 *   agora?: Date | string | number
 * }} [options]
 * @returns {Array<object>}
 */
export function filterByDateWindow(artigos, { mode = "off", field = "criadoEm", startDate, endDate, relativeDays, agora } = {}) {
  const list = toArray(artigos);
  if (mode !== "range" && mode !== "relative") return list;

  const now = resolveNow(agora);
  return list.filter((artigo) => {
    const value = parseDateOrNull(artigo?.[field]);
    if (!value) return false;
    return mode === "range"
      ? isDateWithinRange(value, startDate, endDate)
      : isWithinRelativeDays(value, now, relativeDays);
  });
}

/**
 * Ordena por um campo de data (`field`, padrão `"criadoEm"`), ascendente ou
 * descendente (`direction`, padrão `"desc"`). Itens cujo campo está
 * ausente/inválido vão para o final, independente da direção; a ordenação é
 * estável (empates preservam a ordem de entrada).
 *
 * @param {Array<object>} artigos
 * @param {{ field?: string, direction?: "asc" | "desc" }} [options]
 * @returns {Array<object>}
 */
export function sortByDate(artigos, { field = "criadoEm", direction = "desc" } = {}) {
  const sign = direction === "asc" ? 1 : -1;
  return stableSortBy(toArray(artigos), (a, b) => {
    const dateA = parseDateOrNull(a?.[field]);
    const dateB = parseDateOrNull(b?.[field]);
    if (dateA && dateB) return sign * (dateA.getTime() - dateB.getTime());
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return 0;
  });
}

/**
 * Pagina a lista (1-based). Uma página fora do intervalo (maior que o total
 * de páginas, ou menor que 1) devolve `items: []`, mas ainda informa
 * `page`/`pageSize`/`total`/`totalPages` corretos para o chamador decidir o
 * que fazer. `pageSize` não positivo cai no padrão (10).
 *
 * @param {Array<object>} artigos
 * @param {{ page?: number, pageSize?: number }} [options]
 * @returns {{ items: Array<object>, page: number, pageSize: number, total: number, totalPages: number }}
 */
export function paginate(artigos, { page = 1, pageSize = 10 } = {}) {
  const list = toArray(artigos);
  const total = list.length;
  const safePageSize = pageSize > 0 ? pageSize : 10;
  const totalPages = Math.ceil(total / safePageSize);
  const start = (page - 1) * safePageSize;
  const items = start >= 0 && start < total ? list.slice(start, start + safePageSize) : [];
  return { items, page, pageSize: safePageSize, total, totalPages };
}

/**
 * Aplica, em sequência, os filtros relevantes presentes em `filtros` —
 * espelhando o papel do atual `published(filtros)` do CAMAP, mas de forma
 * genérica e composável sobre as demais funções deste módulo — e devolve o
 * resultado paginado.
 *
 * Ordem de aplicação (cada etapa só roda se o campo correspondente estiver
 * presente em `filtros`): `publicadosApenas` → `categoriaId` → `tag` →
 * `destaque` → `paginate`. `agora` (opcional) é repassado a `filterPublished`
 * e `filterFeatured` quando aplicável.
 *
 * @param {Array<object>} artigos
 * @param {{
 *   publicadosApenas?: boolean,
 *   categoriaId?: number | string,
 *   tag?: string,
 *   destaque?: boolean,
 *   agora?: Date | string | number,
 *   page?: number,
 *   pageSize?: number
 * }} [filtros]
 * @returns {{ items: Array<object>, page: number, pageSize: number, total: number, totalPages: number }}
 */
export function composeFilters(artigos, filtros = {}) {
  const options = filtros ?? {};
  let resultado = toArray(artigos);

  if (options.publicadosApenas) resultado = filterPublished(resultado, options.agora);
  if (options.categoriaId !== undefined && options.categoriaId !== null) {
    resultado = filterByCategoria(resultado, options.categoriaId);
  }
  if (options.tag !== undefined && options.tag !== null) resultado = filterByTag(resultado, options.tag);
  if (options.destaque === true) resultado = filterFeatured(resultado, { agora: options.agora });

  return paginate(resultado, { page: options.page, pageSize: options.pageSize });
}

/**
 * Agrega a contagem de uso de cada tag a partir de `artigos` — cada tag do
 * array `tags` de cada artigo soma 1 à sua contagem. Artigos sem `tags` (ou
 * com `tags` que não é array) não contribuem com nenhuma tag. O resultado é
 * ordenado por contagem descendente; em caso de empate, por ordem
 * alfabética (`tag`, `localeCompare`) para um resultado estável e
 * determinístico independente da ordem de entrada dos artigos.
 *
 * @param {Array<object>} artigos
 * @returns {Array<{ tag: string, count: number }>}
 */
export function aggregateTagCounts(artigos) {
  const counts = new Map();
  for (const artigo of toArray(artigos)) {
    if (!Array.isArray(artigo?.tags)) continue;
    for (const tag of artigo.tags) {
      if (typeof tag !== "string" || tag === "") continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag));
}
