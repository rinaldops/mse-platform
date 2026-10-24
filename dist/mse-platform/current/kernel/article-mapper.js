/**
 * Adaptador REST→domínio de "artigos" para os módulos de posição da família
 * `mod_articles_*` (Site Kernel, Wave 2 — ver mse-platform/docs/PLANO-SITE-KERNEL-MSE.md,
 * seção 4.1 "Altura de abstração dos dados": "a normalização REST→domínio
 * para artigos fica para o adaptador do Publicador").
 *
 * Mapeia um item cru da lista de artigos (nomes reais de campo — mesmo
 * shape aceito/gravado por `kernel/publisher-data.js`, ver
 * `DEFAULT_FIELD_MAP` daquele módulo, e usado "crú" por
 * `components/com_content/publisher.js`) para o shape de domínio que
 * `kernel/content-services.js` espera (`id`, `titulo`, `estado`,
 * `categoriaId`, `tags`, `destaque`, `ordemDestaque`, `publicarDe`/
 * `publicarAte`, `criadoEm` — ver cabeçalho daquele arquivo para o shape
 * completo) — para que os módulos de posição de artigos possam reaproveitar
 * `filterPublished`/`filterByCategoria`/`filterByTag`/`filterFeatured`/
 * `sortByDate`/`paginate`/`composeFilters` sem duplicar essa tradução.
 *
 * Reaproveita `DEFAULT_FIELD_MAP`/`fieldMap` de `kernel/publisher-data.js`
 * (mesmo princípio: nenhum nome real de campo é fixado além do default
 * documentado ali; qualquer site pode sobrescrever qualquer entrada via
 * `fieldMap`) — nenhuma tabela de tradução de nome é duplicada aqui, só o
 * SENTIDO INVERSO (REST→domínio, em vez de domínio→REST) é implementado
 * neste arquivo.
 *
 * `tags`: `publisher-data.js` persiste `tags` como um único campo de texto
 * contendo `JSON.stringify(array)` (ver cabeçalho daquele arquivo, seção
 * "TAGS") — este mapeador faz o inverso (`JSON.parse`), tolerando valor
 * ausente/inválido como `[]` (nunca lança: um artigo com tags corrompidas
 * não deve impedir toda uma listagem de módulo de renderizar).
 *
 * `categoriaId`: aqui mantido com o valor CRU do campo `categoria`
 * (default `CategoriaTexto`, um texto livre no schema real do CAMAP — não
 * um lookup para `MSECategories.Id`). Módulos que precisem juntar artigos
 * com `MSECategories` devem usar `kernel/categories.js#resolveArticleCategory`
 * (casa por Id OU por Alias/Title, de forma tolerante a essa ausência de
 * FK formal — ver cabeçalho daquele arquivo).
 *
 * `criadoEm`: não faz parte de `DEFAULT_FIELD_MAP` (nenhum campo lógico do
 * Publicador cobre "quando o artigo foi criado") — usa o campo nativo
 * `Created` do SharePoint (presente em toda lista, sempre devolvido pelo
 * REST independentemente de `select`), com `fieldMap.criadoEm` como
 * override opcional.
 *
 * `raw`: o item cru original é preservado na saída (campo `raw`) para que
 * uma view de módulo possa acessar campos específicos do site que não
 * fazem parte do shape de domínio genérico (ex.: `Id` para montar um link),
 * sem precisar que este módulo conheça todos os campos possíveis.
 */

import { DEFAULT_FIELD_MAP } from "./publisher-data.js";

function resolveFieldName(logicalName, fieldMap) {
  return fieldMap?.[logicalName] ?? DEFAULT_FIELD_MAP[logicalName] ?? logicalName;
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 1) return true;
  if (value === 0) return false;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1";
}

function parseTags(value) {
  if (Array.isArray(value)) return value.filter((tag) => typeof tag === "string");
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function parseNumberOrUndefined(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/**
 * @param {Record<string, unknown>} raw item cru (nomes reais de campo).
 * @param {{ fieldMap?: Record<string,string> }} [options]
 * @returns {object} artigo no shape de domínio de kernel/content-services.js.
 */
export function mapArticleItem(raw, { fieldMap } = {}) {
  if (!raw || typeof raw !== "object") throw new TypeError("raw deve ser um objeto de item cru.");
  const field = (logicalName) => raw[resolveFieldName(logicalName, fieldMap)];
  return {
    id: raw.Id,
    titulo: field("titulo") ?? "",
    slug: field("slug") ?? "",
    resumo: field("resumo") ?? "",
    corpoHtml: field("corpoHtml") ?? "",
    estado: field("estadoEditorial"),
    categoriaId: field("categoria") ?? null,
    tags: parseTags(field("tags")),
    destaque: normalizeBoolean(field("destaque")),
    ordemDestaque: parseNumberOrUndefined(field("ordemDestaque")),
    publicarDe: field("publicarDe") ?? null,
    publicarAte: field("publicarAte") ?? null,
    imagemCapaUrl: field("imagemCapaUrl") ?? null,
    criadoEm: raw.Created ?? (fieldMap?.criadoEm ? raw[fieldMap.criadoEm] : undefined),
    raw
  };
}

/**
 * @param {Array<object>} items
 * @param {{ fieldMap?: Record<string,string> }} [options]
 * @returns {Array<object>}
 */
export function mapArticleItems(items, options = {}) {
  return Array.isArray(items) ? items.map((item) => mapArticleItem(item, options)) : [];
}
