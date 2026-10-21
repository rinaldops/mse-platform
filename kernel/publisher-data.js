/**
 * Adaptador CRUD genérico de "artigos" do Publicador (Site Kernel,
 * mse-platform/docs/PLANO-SITE-KERNEL-MSE.md, seção 7 "Publicador"; seção 5,
 * linha "com_content, categorias, tags, estados, destaque" → `content-services.js`
 * + Publicador; seção 4.1 "Altura de abstração dos dados": a camada de
 * normalização REST→domínio para artigos "fica para o adaptador da Fase 2/3,
 * junto do Publicador" — este arquivo é essa camada).
 *
 * Shape de domínio (campos lógicos, independentes do nome real do campo na
 * lista SharePoint — ver `DEFAULT_FIELD_MAP`/`fieldMap` abaixo):
 *   {
 *     titulo?: string,                 // conveniência: toda lista exige Title
 *     slug?: string,                   // conveniência: chave de idempotência (ver tools/migrate-camap-*.js)
 *     resumo?: string,                 // conveniência: resumo curto para listagem
 *     corpoHtml?: string,              // HTML (sempre sanitizado por este módulo antes de persistir)
 *     estadoEditorial?: "Publicado" | "Despublicado" | "Arquivado" | "Lixeira",
 *     destaque?: boolean,
 *     ordemDestaque?: number,
 *     publicarDe?: string | Date,      // janela de vigência (início)
 *     publicarAte?: string | Date,     // janela de vigência (fim)
 *     categoria?: string | number,     // lookup/texto — este módulo não assume o tipo exato do campo
 *     tags?: string[],
 *     imagemCapaUrl?: string           // normalmente preenchida a partir do retorno de uploadCoverImage()
 *   }
 * Os 8 campos citados explicitamente no plano (seção 7) são `estadoEditorial`,
 * `destaque`, `ordemDestaque`, `publicarDe`, `publicarAte`, `categoria`,
 * `tags`, `imagemCapaUrl`, `corpoHtml`; `titulo`/`slug`/`resumo` foram
 * acrescentados aqui como campos lógicos de conveniência (nenhum artigo real
 * é útil sem título), mas continuam 100% genéricos — nenhum nome real de
 * campo é fixado neste módulo, apenas documentado como DEFAULT em
 * `DEFAULT_FIELD_MAP`.
 *
 * GENERICIDADE (mesmo princípio de "produto × site" da seção 12 do plano):
 * nenhuma função aqui conhece `CAMAPPublicacoes` nem qualquer nome de campo
 * do CAMAP. Quem chama informa `{ listId }` (nunca resolvido por `getbytitle`
 * aqui — mesma régua de `kernel/admin-data.js`: quem chama já resolveu
 * `listId` antes) e, opcionalmente, um `fieldMap` traduzindo nomes lógicos
 * para os nomes reais de campo da lista daquele site. `DEFAULT_FIELD_MAP`
 * documenta, como EXEMPLO, os nomes reais hoje usados por
 * `CAMAP-AGP/data/provisioning/provision-camap.js` (`EstadoEditorial`,
 * `Destaque`, `OrdemDestaque`, `DataPublicacao`, `DataExpiracao`,
 * `CategoriaTexto`, `ImagemUrl`, `CorpoHtmlSeguroV1`, `Slug`, `Resumo`,
 * `Title`) e por `CAMAP-AGP/core/core.js#published()`/`#publication()`
 * (que já filtram/ordenam por esses mesmos nomes) — é só o default
 * conveniente para quem ainda não tem um `fieldMap` próprio; qualquer site
 * pode sobrescrever qualquer entrada.
 *
 * TAGS — decisão de design: o plano pede um campo lógico `tags` (array), mas
 * o CAMAP real implementa isso com duas listas de junção
 * (`CAMAPTags`/`CAMAPPublicacaoTags`, ver `CAMAP-AGP/core/core.js#published()`
 * `opts.tag`), não um campo direto no artigo. Como este adaptador é
 * deliberadamente genérico e não conhece listas de junção de nenhum site,
 * `tags` aqui é persistido como um ÚNICO campo de texto (`TagsTexto` no
 * default, que NÃO existe hoje no schema real do CAMAP — é só um placeholder
 * documentado) contendo `JSON.stringify(tags)`. Uma integração completa com
 * relações N:N de tags (replicando o padrão de junção do CAMAP) fica fora de
 * escopo desta rodada — quem precisar disso deve construir uma camada
 * específica por cima deste módulo (ou substituir esta função), não
 * generalizar junções aqui.
 *
 * ETag/concorrência — mesmo padrão de `kernel/admin-data.js`: `updateArticle`/
 * `transitionEditorialState`/`scheduleArticle` sempre buscam a ETag atual
 * (`client.getListItem(list, id, { select: ["Id"] })`) imediatamente antes de
 * escrever, e nunca interceptam o erro de conflito de concorrência que
 * `client.updateListItem` lança (`SharePointRestError`, `code:
 * "concurrency-conflict"` em produção) — ele sempre propaga para quem chamou.
 *
 * SANITIZAÇÃO — "defesa em profundidade": o HTML que chega em
 * `values.corpoHtml` já deveria ter passado por `sanitizeRichText` dentro do
 * editor (`core/editor-quill.js`/`core/rich-text.js`), mas este módulo NUNCA
 * confia no chamador — todo `corpoHtml` presente em `values` (criação OU
 * atualização) é sanitizado de novo aqui, antes de montar o payload REST.
 * Decisão de design para TESTABILIDADE sem DOM real: em vez de importar
 * `sanitizeRichText` e usá-la de forma fixa (o que tornaria este módulo
 * impossível de testar em Node puro, sem jsdom — ver
 * `core/test/rich-text.test.js`, que se auto-ignora sem `document` global),
 * `createArticle`/`updateArticle` aceitam um parâmetro opcional `sanitize`
 * (default: a própria `sanitizeRichText` importada de `core/rich-text.js`,
 * satisfazendo o requisito de produção). Mesma técnica de injeção já usada
 * em `core/rest.js` (`fetchImpl`/`sleepImpl`/`nowImpl`) e em
 * `modules/forum/forum-data.js` (`createForumReadService({ sanitizeRichText
 * })`, injetada em vez de importada) — não é uma invenção isolada deste
 * arquivo.
 *
 * VERSÕES — pendência explícita para `core/rest.js`: hoje não existe nenhum
 * wrapper para os endpoints nativos de versão do SharePoint
 * (`.../items(id)/versions` e `.../versions(vid)/restoreVersion`). Em vez de
 * editar `core/rest.js` nesta rodada (reservado — outra frente pode estar
 * tocando arquivos vizinhos), `listArticleVersions`/`restoreArticleVersion`
 * abaixo assumem que o `client` injetado JÁ expõe dois métodos adicionais,
 * com a assinatura documentada a seguir (mesma convenção `(list, id, ...)`
 * de `createListItem`/`updateListItem`/`deleteListItem`):
 *
 *   client.listVersions(list, id)
 *     -> Promise<Array<{
 *          versionId: string | number,         // VersionId nativo do SharePoint
 *          createdAt: string,                  // Created, ISO 8601
 *          createdBy?: { id?: number, title?: string },
 *          isCurrentVersion?: boolean,
 *          ...demais campos crus da versão (formato exato ainda não fixado,
 *          fica para quem implementar o wrapper real em core/rest.js)
 *        }>>
 *
 *   client.restoreVersion(list, id, versionId)
 *     -> Promise<{ status: number, etag?: string | null }>
 *
 * Quando `core/rest.js` ganhar essas 2 funções numa rodada futura, a
 * expectativa é que `createSharePointRestClient()` as exponha com esta mesma
 * assinatura, e nenhuma mudança deveria ser necessária aqui.
 */

import { sanitizeRichText } from "../core/rich-text.js";

/** Os 4 estados editoriais válidos (plano, seção 7). */
const ESTADOS_VALIDOS = new Set(["Publicado", "Despublicado", "Arquivado", "Lixeira"]);

/**
 * Mapeamento padrão de campo lógico → nome real de campo, usando como
 * exemplo o schema real do CAMAP-AGP (ver cabeçalho do arquivo). Qualquer
 * site pode sobrescrever qualquer entrada via `fieldMap`; entradas ausentes
 * em um `fieldMap` parcial caem para este default (ver `resolveFieldName`).
 */
export const DEFAULT_FIELD_MAP = Object.freeze({
  titulo: "Title",
  slug: "Slug",
  resumo: "Resumo",
  corpoHtml: "CorpoHtmlSeguroV1",
  estadoEditorial: "EstadoEditorial",
  destaque: "Destaque",
  ordemDestaque: "OrdemDestaque",
  publicarDe: "DataPublicacao",
  publicarAte: "DataExpiracao",
  categoria: "CategoriaTexto",
  tags: "TagsTexto",
  imagemCapaUrl: "ImagemUrl"
});

/**
 * Valida que `client` foi informado e expõe os métodos necessários para a
 * operação (mesmo padrão de `kernel/admin-data.js#requireClient`).
 *
 * @param {object} client
 * @param {string[]} methods
 * @returns {object}
 */
function requireClient(client, methods) {
  if (!client || typeof client !== "object") {
    throw new TypeError("client é obrigatório.");
  }
  for (const method of methods) {
    if (typeof client[method] !== "function") {
      throw new TypeError(`client deve expor ${method}(...).`);
    }
  }
  return client;
}

/**
 * Valida que `list` (ou `library`, mesmo shape) foi informado já como
 * `{ listId }` resolvido — mesmo contrato de `kernel/admin-data.js#requireList`:
 * este módulo nunca resolve `listId` a partir de um nome/título.
 *
 * @param {{listId: string}} list
 * @returns {{listId: string}}
 */
function requireList(list) {
  if (!list || typeof list !== "object" || Array.isArray(list)) {
    throw new TypeError("list deve ser um objeto { listId } já resolvido.");
  }
  return list;
}

/**
 * Valida presença de `id` (formato exato — inteiro positivo — já é validado
 * por `core/rest.js` no momento da chamada real; não duplicado aqui, mesmo
 * padrão de `kernel/admin-data.js#requireId`).
 *
 * @param {unknown} id
 * @returns {unknown}
 */
function requireId(id) {
  if (id === undefined || id === null) {
    throw new TypeError("id é obrigatório.");
  }
  return id;
}

/**
 * Valida que `values` é um objeto puro (não array, não `null`, não
 * primitivo) de campos lógicos a gravar.
 *
 * @param {unknown} values
 * @returns {Record<string, unknown>}
 */
function requireValues(values) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("values deve ser um objeto puro de campos lógicos a gravar.");
  }
  return values;
}

/**
 * Valida que `fieldMap`, quando informado, é um objeto puro.
 *
 * @param {unknown} fieldMap
 * @returns {Record<string, string> | undefined}
 */
function requireFieldMapShape(fieldMap) {
  if (fieldMap !== undefined && (typeof fieldMap !== "object" || fieldMap === null || Array.isArray(fieldMap))) {
    throw new TypeError("fieldMap, quando informado, deve ser um objeto puro { campoLogico: nomeReal }.");
  }
  return fieldMap;
}

/**
 * Resolve o nome real de um campo lógico: `fieldMap[logicalName]` tem
 * prioridade; na ausência, cai para `DEFAULT_FIELD_MAP[logicalName]`; na
 * ausência de ambos, usa o próprio nome lógico como nome real (permite a
 * quem chama passar campos adicionais que já sejam nomes reais de campo,
 * sem precisar listá-los em `fieldMap`).
 *
 * @param {string} logicalName
 * @param {Record<string, string> | undefined} fieldMap
 * @returns {string}
 */
function resolveFieldName(logicalName, fieldMap) {
  return fieldMap?.[logicalName] ?? DEFAULT_FIELD_MAP[logicalName] ?? logicalName;
}

/**
 * Lança `TypeError` claro se `estado` não for um dos 4 estados editoriais
 * válidos (plano, seção 7).
 *
 * @param {unknown} estado
 */
function assertEstadoValido(estado) {
  if (!ESTADOS_VALIDOS.has(estado)) {
    throw new TypeError(
      `estado deve ser um de: ${[...ESTADOS_VALIDOS].join(", ")} (recebido: ${JSON.stringify(estado)}).`
    );
  }
}

/**
 * Converte uma data opcional (`Date` ou string/number parseável) para ISO
 * 8601, ou `null` quando o valor for `null`/`undefined` (limpa a janela de
 * vigência). Lança `TypeError` para qualquer valor presente mas não
 * parseável como data — nunca grava uma data inválida silenciosamente.
 *
 * @param {string | number | Date | null | undefined} value
 * @returns {string | null}
 */
function toIsoOrNull(value) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Data inválida: ${JSON.stringify(value)}.`);
  }
  return date.toISOString();
}

/**
 * Transforma o VALOR de um campo lógico antes de persistir, de acordo com
 * regras específicas de cada campo (sanitização, validação de estado,
 * serialização de array, normalização de data). Campos sem regra específica
 * passam adiante sem alteração — este módulo não valida tipos que o plano
 * não exige explicitamente (ex.: não força `destaque` a ser `boolean`;
 * confia no chamador/REST para esses casos, mesmo espírito permissivo de
 * `kernel/admin-data.js`).
 *
 * @param {string} logicalName
 * @param {unknown} value
 * @param {(html: string) => string} sanitize
 * @returns {unknown}
 */
function transformLogicalValue(logicalName, value, sanitize) {
  if (logicalName === "corpoHtml") {
    if (typeof value !== "string") {
      throw new TypeError("corpoHtml deve ser uma string HTML.");
    }
    return sanitize(value);
  }
  if (logicalName === "estadoEditorial") {
    assertEstadoValido(value);
    return value;
  }
  if (logicalName === "tags") {
    if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) {
      throw new TypeError("tags deve ser um array de strings.");
    }
    return JSON.stringify(value);
  }
  if (logicalName === "publicarDe" || logicalName === "publicarAte") {
    return toIsoOrNull(value);
  }
  return value;
}

/**
 * Monta o payload REST (nomes reais de campo) a partir de `values` (campos
 * lógicos), aplicando `transformLogicalValue` a cada entrada e traduzindo o
 * nome via `resolveFieldName`. Função pura, sem I/O.
 *
 * @param {Record<string, unknown>} values
 * @param {Record<string, string> | undefined} fieldMap
 * @param {(html: string) => string} sanitize
 * @returns {Record<string, unknown>}
 */
function buildPayload(values, fieldMap, sanitize) {
  const payload = {};
  for (const [logicalName, rawValue] of Object.entries(values)) {
    const realName = resolveFieldName(logicalName, fieldMap);
    payload[realName] = transformLogicalValue(logicalName, rawValue, sanitize);
  }
  return payload;
}

/** Campo mínimo universal usado só para obter a ETag atual de um item. */
const ETAG_SELECT = ["Id"];

/**
 * Cria um artigo em `list`, traduzindo `values` (campos lógicos) para nomes
 * reais via `fieldMap`/`DEFAULT_FIELD_MAP`, sanitizando `corpoHtml` (se
 * presente) como defesa em profundidade antes de montar o payload de
 * criação (ver cabeçalho do arquivo).
 *
 * @param {{
 *   client: { createListItem: Function },
 *   list: {listId: string},
 *   fieldMap?: Record<string, string>,
 *   values: Record<string, unknown>,
 *   sanitize?: (html: string) => string
 * }} options
 * @returns {Promise<{ item: object, etag: string|null, status: number }>}
 */
export async function createArticle({ client, list, fieldMap, values, sanitize = sanitizeRichText } = {}) {
  requireClient(client, ["createListItem"]);
  requireList(list);
  requireValues(values);
  requireFieldMapShape(fieldMap);
  if (typeof sanitize !== "function") {
    throw new TypeError("sanitize, quando informado, deve ser uma função.");
  }
  const payload = buildPayload(values, fieldMap, sanitize);
  return client.createListItem(list, payload);
}

/**
 * Atualiza o artigo `id` de `list` com `values` (campos lógicos), buscando a
 * ETag atual imediatamente antes de escrever (ver cabeçalho — mesmo
 * princípio de `kernel/admin-data.js#updateAdminItem`) e sanitizando
 * `corpoHtml` de novo, se presente em `values`.
 *
 * @param {{
 *   client: { getListItem: Function, updateListItem: Function },
 *   list: {listId: string},
 *   fieldMap?: Record<string, string>,
 *   id: number|string,
 *   values: Record<string, unknown>,
 *   sanitize?: (html: string) => string
 * }} options
 * @returns {Promise<{ item: object, etag: string|null, status: number }>}
 */
export async function updateArticle({ client, list, fieldMap, id, values, sanitize = sanitizeRichText } = {}) {
  requireClient(client, ["getListItem", "updateListItem"]);
  requireList(list);
  requireId(id);
  requireValues(values);
  requireFieldMapShape(fieldMap);
  if (typeof sanitize !== "function") {
    throw new TypeError("sanitize, quando informado, deve ser uma função.");
  }
  const payload = buildPayload(values, fieldMap, sanitize);
  const { etag } = await client.getListItem(list, id, { select: ETAG_SELECT });
  return client.updateListItem(list, id, payload, { etag });
}

/**
 * Transiciona o estado editorial do artigo `id` para `toState`, validando
 * que `toState` é um dos 4 estados válidos (plano, seção 7) ANTES de
 * qualquer chamada de rede — `TypeError` claro em caso contrário. Atualiza
 * só o campo de estado (nunca os demais campos do artigo), com ETag buscada
 * imediatamente antes de escrever.
 *
 * @param {{
 *   client: { getListItem: Function, updateListItem: Function },
 *   list: {listId: string},
 *   fieldMap?: Record<string, string>,
 *   id: number|string,
 *   toState: "Publicado" | "Despublicado" | "Arquivado" | "Lixeira"
 * }} options
 * @returns {Promise<{ item: object, etag: string|null, status: number }>}
 */
export async function transitionEditorialState({ client, list, fieldMap, id, toState } = {}) {
  requireClient(client, ["getListItem", "updateListItem"]);
  requireList(list);
  requireId(id);
  requireFieldMapShape(fieldMap);
  assertEstadoValido(toState);
  const campo = resolveFieldName("estadoEditorial", fieldMap);
  const { etag } = await client.getListItem(list, id, { select: ETAG_SELECT });
  return client.updateListItem(list, id, { [campo]: toState }, { etag });
}

/**
 * Atualiza a janela de publicação (`publicarDe`/`publicarAte`) do artigo
 * `id`, com ETag. Pelo menos um dos dois deve ser informado (`undefined` =
 * "não alterar esse lado"; `null` = "limpar esse lado da janela"). Quando
 * AMBOS forem informados (não-`undefined`), valida `publicarDe <=
 * publicarAte` — `TypeError` claro em caso contrário, antes de qualquer
 * chamada de rede.
 *
 * @param {{
 *   client: { getListItem: Function, updateListItem: Function },
 *   list: {listId: string},
 *   fieldMap?: Record<string, string>,
 *   id: number|string,
 *   publicarDe?: string | Date | null,
 *   publicarAte?: string | Date | null
 * }} options
 * @returns {Promise<{ item: object, etag: string|null, status: number }>}
 */
export async function scheduleArticle({ client, list, fieldMap, id, publicarDe, publicarAte } = {}) {
  requireClient(client, ["getListItem", "updateListItem"]);
  requireList(list);
  requireId(id);
  requireFieldMapShape(fieldMap);
  if (publicarDe === undefined && publicarAte === undefined) {
    throw new TypeError("Informe publicarDe e/ou publicarAte.");
  }

  const isoDe = publicarDe === undefined ? undefined : toIsoOrNull(publicarDe);
  const isoAte = publicarAte === undefined ? undefined : toIsoOrNull(publicarAte);
  if (isoDe != null && isoAte != null && isoDe > isoAte) {
    throw new TypeError("publicarDe deve ser menor ou igual a publicarAte.");
  }

  const payload = {};
  if (isoDe !== undefined) payload[resolveFieldName("publicarDe", fieldMap)] = isoDe;
  if (isoAte !== undefined) payload[resolveFieldName("publicarAte", fieldMap)] = isoAte;

  const { etag } = await client.getListItem(list, id, { select: ETAG_SELECT });
  return client.updateListItem(list, id, payload, { etag });
}

/**
 * Envia a imagem de capa para `library` (biblioteca de documentos/mídia) —
 * wrapper fino sobre `client.uploadFile`. Quem chama é RESPONSÁVEL por, na
 * sequência, gravar a `serverRelativeUrl` retornada no campo lógico
 * `imagemCapaUrl` via `updateArticle` — este wrapper não grava nada no
 * artigo, apenas sobe o arquivo (mesmo padrão de duas etapas de
 * `modules/forum/forum-data.js#externalizeInlineImages`: subir o arquivo,
 * depois usar a URL resultante em outro campo).
 *
 * @param {{
 *   client: { uploadFile: Function },
 *   library: {listId: string},
 *   fileName: string,
 *   content: ArrayBuffer | ArrayBufferView | Blob,
 *   contentType?: string
 * }} options
 * @returns {Promise<{ serverRelativeUrl: string, file: object, etag: string|null, status: number }>}
 */
export async function uploadCoverImage({ client, library, fileName, content, contentType } = {}) {
  requireClient(client, ["uploadFile"]);
  requireList(library);
  const result = await client.uploadFile(library, { fileName, content, contentType });
  return {
    serverRelativeUrl: result.serverRelativeUrl,
    file: result.file,
    etag: result.etag,
    status: result.status
  };
}

/**
 * Lista as versões nativas do artigo `id` — repassa para `client.listVersions`
 * (assinatura assumida e documentada no cabeçalho do arquivo; PENDÊNCIA real
 * de `core/rest.js`, que ainda não expõe este método).
 *
 * @param {{ client: { listVersions: Function }, list: {listId: string}, id: number|string }} options
 * @returns {Promise<Array<object>>}
 */
export async function listArticleVersions({ client, list, id } = {}) {
  requireClient(client, ["listVersions"]);
  requireList(list);
  requireId(id);
  return client.listVersions(list, id);
}

/**
 * Restaura a versão `versionId` do artigo `id` — repassa para
 * `client.restoreVersion` (mesma assinatura assumida/documentada no
 * cabeçalho; mesma pendência de `core/rest.js`).
 *
 * @param {{
 *   client: { restoreVersion: Function },
 *   list: {listId: string},
 *   id: number|string,
 *   versionId: string|number
 * }} options
 * @returns {Promise<{ status: number, etag?: string|null }>}
 */
export async function restoreArticleVersion({ client, list, id, versionId } = {}) {
  requireClient(client, ["restoreVersion"]);
  requireList(list);
  requireId(id);
  if (versionId === undefined || versionId === null) {
    throw new TypeError("versionId é obrigatório.");
  }
  return client.restoreVersion(list, id, versionId);
}
