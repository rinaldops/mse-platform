/**
 * Filtros e transições editoriais do Publicador.
 *
 * Funções puras: não conhecem SharePoint nem DOM. A tela pode reutilizá-las
 * tanto para filtrar a tabela quanto para validar ações de fluxo editorial.
 */

export const EDITORIAL_STATES = Object.freeze(["Publicado", "Despublicado", "Arquivado", "Lixeira"]);
export const EDITORIAL_TRANSITIONS = Object.freeze({
  Publicado: Object.freeze(["Despublicado", "Arquivado", "Lixeira"]),
  Despublicado: Object.freeze(["Publicado", "Arquivado", "Lixeira"]),
  Arquivado: Object.freeze(["Despublicado", "Publicado", "Lixeira"]),
  Lixeira: Object.freeze(["Despublicado"])
});

function text(value) { return value == null ? "" : String(value); }
function booleanValue(value) { return value === true || value === 1 || ["true", "1", "sim", "yes"].includes(text(value).toLowerCase()); }
function dateTime(value) { const time = value ? new Date(value).getTime() : NaN; return Number.isNaN(time) ? null : time; }

export function normalizePublisherFilters(filters = {}) {
  const state = text(filters.estado ?? filters.EstadoEditorial).trim();
  if (state && !EDITORIAL_STATES.includes(state)) throw new TypeError(`Estado editorial inválido: ${state}.`);
  const destaque = filters.destaque === undefined || filters.destaque === "" ? null : booleanValue(filters.destaque);
  return Object.freeze({
    termo: text(filters.termo ?? filters.search).trim().toLocaleLowerCase(),
    estado: state,
    categoria: text(filters.categoria ?? filters.CategoriaTexto).trim().toLocaleLowerCase(),
    destaque,
    vigenteEm: filters.vigenteEm == null ? null : new Date(filters.vigenteEm)
  });
}

export function filterPublisherItems(items, filters = {}) {
  const source = Array.isArray(items) ? items : [];
  const criteria = normalizePublisherFilters(filters);
  const now = criteria.vigenteEm?.getTime();
  return source.filter((item) => {
    if (criteria.estado && text(item?.EstadoEditorial) !== criteria.estado) return false;
    if (criteria.termo) {
      const haystack = `${text(item?.Title)} ${text(item?.Slug)} ${text(item?.Resumo)} ${text(item?.CategoriaTexto)}`.toLocaleLowerCase();
      if (!haystack.includes(criteria.termo)) return false;
    }
    if (criteria.categoria && text(item?.CategoriaTexto).toLocaleLowerCase() !== criteria.categoria) return false;
    if (criteria.destaque !== null && booleanValue(item?.Destaque) !== criteria.destaque) return false;
    if (now !== undefined && !Number.isNaN(now)) {
      const start = dateTime(item?.DataPublicacao);
      const end = dateTime(item?.DataExpiracao);
      if (start !== null && now < start) return false;
      if (end !== null && now > end) return false;
    }
    return true;
  });
}

export function allowedEditorialTransitions(fromState) {
  if (!EDITORIAL_STATES.includes(fromState)) throw new TypeError(`Estado editorial inválido: ${fromState}.`);
  return EDITORIAL_TRANSITIONS[fromState];
}

export function assertEditorialTransition(fromState, toState) {
  if (!EDITORIAL_STATES.includes(toState)) throw new TypeError(`Estado editorial inválido: ${toState}.`);
  if (!allowedEditorialTransitions(fromState).includes(toState)) throw new Error(`Transição editorial não permitida: ${fromState} → ${toState}.`);
  return toState;
}
