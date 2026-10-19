const DEFAULT_ACCEPT = "application/json;odata=nometadata";

export class SharePointRestError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SharePointRestError";
    this.code = code;
    if (details.status) this.status = details.status;
    if (details.retryAfterMs !== undefined) this.retryAfterMs = details.retryAfterMs;
    if (details.path) this.path = details.path;
    if (details.cause) this.cause = details.cause;
  }
}

function restError(code, message, details) {
  return new SharePointRestError(code, message, details);
}

function normalizeWebUrl(webUrl) {
  const value = webUrl ?? globalThis._spPageContextInfo?.webServerRelativeUrl;
  if (typeof value !== "string" || value.trim() === "") {
    throw restError(
      "context-unavailable",
      "Não foi possível identificar a URL do site SharePoint."
    );
  }

  const normalized = value.trim().replace(/\/+$/, "");
  if (normalized === "" || normalized === "/") return "";
  if (!normalized.startsWith("/") || normalized.startsWith("//") || /[?#]/.test(normalized)) {
    throw new TypeError("webUrl deve ser uma URL server-relative.");
  }
  return normalized;
}

function normalizeApiUrl(webUrl, path) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError("path deve ser um texto não vazio.");
  }

  let value = path.trim();
  if (/^https?:\/\//i.test(value)) {
    const absolute = new URL(value);
    value = `${absolute.pathname}${absolute.search}`;
  }
  if (value.startsWith("/_api/")) value = `${webUrl}${value}`;

  const prefix = `${webUrl}/_api/` || "/_api/";
  if (!value.startsWith(prefix)) {
    throw new TypeError("path deve apontar para a API REST do site atual.");
  }
  return value;
}

function retryDelay(response, now) {
  const value = response.headers?.get?.("Retry-After");
  if (value === null || value === undefined || value === "") return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now());
}

function responseEtag(response, data) {
  return response.headers?.get?.("ETag")
    || data?.["@odata.etag"]
    || data?.__metadata?.etag
    || data?.d?.__metadata?.etag
    || null;
}

async function readJson(response) {
  if (response.status === 204) return null;
  if (typeof response.text === "function") {
    let body;
    try {
      body = await response.text();
    } catch (cause) {
      throw restError(
        "invalid-response",
        "O SharePoint retornou uma resposta JSON inválida.",
        { cause }
      );
    }
    if (!body.trim()) return null;
    try {
      return JSON.parse(body);
    } catch (cause) {
      throw restError(
        "invalid-response",
        "O SharePoint retornou uma resposta JSON inválida.",
        { cause }
      );
    }
  }
  try {
    return await response.json();
  } catch (cause) {
    throw restError(
      "invalid-response",
      "O SharePoint retornou uma resposta JSON inválida.",
      { cause }
    );
  }
}

function throwForResponse(response, retryAfterMs) {
  if (response.ok) return;

  const details = { status: response.status };
  if (retryAfterMs !== null) details.retryAfterMs = retryAfterMs;

  if (response.status === 401 || response.status === 403) {
    throw restError("access-denied", "O usuário atual não tem permissão para esta operação.", details);
  }
  if (response.status === 404) {
    throw restError("not-found", "O recurso solicitado não foi encontrado.", details);
  }
  if (response.status === 412) {
    throw restError(
      "concurrency-conflict",
      "O recurso foi alterado por outra pessoa. Recarregue antes de salvar.",
      details
    );
  }
  if (response.status === 429 || response.status === 503) {
    throw restError("throttled", "O SharePoint solicitou que a operação aguarde.", details);
  }
  throw restError(
    "request-failed",
    `A operação REST falhou (HTTP ${response.status}).`,
    details
  );
}

/**
 * Monta `{ path, maxPages }` para `GET {lista}/items` com `$select`/`$expand`/
 * `$filter`/`$orderby`/`$top`, no mesmo formato usado internamente por
 * `createSharePointRestClient` (`listItemsRequestPath`, que delega aqui) —
 * extraído para módulo para ser reaproveitado por quem precisa só do `path`
 * relativo sem disparar a chamada (ex. `batchGet`/host adapters montando um
 * `$batch`), sem duplicar a lógica de query string.
 *
 * @param {string|{listId: string}} list
 * @param {{select: string[], expand?: string, filter?: string, orderBy?: string, top?: number, maxPages?: number}} [options]
 * @returns {{ path: string, maxPages?: number }}
 */
export function buildListItemsRequest(list, {
  select,
  expand,
  filter,
  orderBy,
  top = 100,
  maxPages
} = {}) {
  const path = listApiPath(list);
  if (!Array.isArray(select) || !select.length || select.some((field) =>
    typeof field !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*(\/[A-Za-z_][A-Za-z0-9_]*)?$/.test(field)
  )) {
    throw new TypeError("select deve conter nomes internos de campos válidos.");
  }
  if (!Number.isInteger(top) || top < 1 || top > 5000) {
    throw new TypeError("top deve ser um inteiro entre 1 e 5000.");
  }
  for (const [name, value] of Object.entries({ expand, filter, orderBy })) {
    if (value !== undefined && (typeof value !== "string" || !value.trim())) {
      throw new TypeError(`${name} deve ser um texto não vazio.`);
    }
  }

  const query = [`$select=${select.map(encodeURIComponent).join(",")}`, `$top=${top}`];
  if (expand) query.push(`$expand=${encodeURIComponent(expand)}`);
  if (filter) query.push(`$filter=${encodeURIComponent(filter)}`);
  if (orderBy) query.push(`$orderby=${encodeURIComponent(orderBy)}`);
  return { path: `${path}/items?${query.join("&")}`, maxPages };
}

/**
 * Desembrulha o envelope OData de uma página de itens (`{ value, @odata.nextLink }`
 * ou o formato verbose `{ d: { results, __next } }`) para `{ items, next }` —
 * exportado para ser reaproveitado por quem precisa interpretar o JSON de uma
 * sub-resposta de `$batch` (ver `batchGet`) no mesmo formato que `getListItems`
 * já devolve, sem duplicar esta lógica.
 *
 * @param {object} data
 * @returns {{ items: object[], next: string|null }}
 */
export function unwrapPage(data) {
  const value = data?.value ?? data?.d?.results;
  if (!Array.isArray(value)) {
    throw restError("invalid-response", "O SharePoint retornou uma página de itens inválida.");
  }
  return {
    items: value,
    next: data?.["@odata.nextLink"] ?? data?.["odata.nextLink"] ?? data?.d?.__next ?? null
  };
}

function stableHeaders(headers) {
  return JSON.stringify(Object.entries(headers).sort(([left], [right]) =>
    left.toLowerCase().localeCompare(right.toLowerCase())
  ));
}

function listApiPath(list) {
  if (typeof list === "string" && list.trim()) {
    return `/_api/web/lists/getbytitle('${list.trim().replaceAll("'", "''")}')`;
  }
  const listId = list?.listId ?? list?.id;
  if (typeof listId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listId)) {
    throw new TypeError("list deve ser um título não vazio ou conter um listId GUID válido.");
  }
  return `/_api/web/lists(guid'${listId.toLowerCase()}')`;
}

function itemId(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new TypeError("itemId deve ser um inteiro positivo.");
  }
  return number;
}

function itemValues(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("values deve ser um objeto não vazio.");
  }
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([name]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
    throw new TypeError("values deve conter nomes internos de campos válidos.");
  }
  return Object.fromEntries(entries);
}

function binaryBody(value) {
  return value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || (typeof Blob !== "undefined" && value instanceof Blob);
}

function fileName(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new TypeError("fileName deve conter somente letras, números, ponto, hífen ou sublinhado.");
  }
  return value;
}

function defaultBoundary() {
  return `batch_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Monta o corpo multipart/mixed de um `$batch` REST "flat" (sem changeset,
 * só GETs — não há escritas aqui) no formato OData v3 do SharePoint: um
 * boundary externo delimitando cada sub-requisição, cada uma serializada
 * como uma mensagem HTTP de texto (`GET {url} HTTP/1.1` + headers + linha
 * vazia). `requests[].path` é relativo (ex. `/_api/web/lists/getbytitle(...)
 * /items?...`), resolvido para absoluto via `normalizeApiUrl` (mesma
 * normalização usada pelas chamadas não-batch).
 *
 * @param {string} boundary
 * @param {Array<{ key: string, path: string }>} requests
 * @param {string} webUrl
 * @returns {string}
 */
function buildBatchBody(boundary, requests, webUrl) {
  const lines = [];
  for (const { path } of requests) {
    const url = normalizeApiUrl(webUrl, path);
    lines.push(`--${boundary}`);
    lines.push("Content-Type: application/http");
    lines.push("Content-Transfer-Encoding: binary");
    lines.push("");
    lines.push(`GET ${url} HTTP/1.1`);
    lines.push(`Accept: ${DEFAULT_ACCEPT}`);
    lines.push("");
  }
  lines.push(`--${boundary}--`);
  lines.push("");
  return lines.join("\r\n");
}

/**
 * Extrai o boundary de um header `Content-Type: multipart/mixed; boundary=...`
 * (com ou sem aspas).
 *
 * @param {string|null|undefined} contentType
 * @returns {string|null}
 */
function extractBoundary(contentType) {
  const match = /boundary=("?)([^;"]+)\1/i.exec(contentType ?? "");
  return match ? match[2] : null;
}

/**
 * Fallback para quando o header `Content-Type` da resposta do `$batch` não
 * traz o `boundary` (alguns ambientes de teste/fake simplificam a resposta):
 * lê o delimitador diretamente da primeira linha não vazia do corpo, que o
 * protocolo `$batch` sempre inicia com `--{boundary}`.
 *
 * @param {string} text
 * @returns {string|null}
 */
function boundaryFromBody(text) {
  const match = /^\s*--(\S+)/.exec(text ?? "");
  return match ? match[1] : null;
}

/**
 * Divide o corpo multipart de uma resposta de `$batch` em uma sub-resposta
 * por parte, descartando preâmbulo/epílogo e o delimitador de fechamento
 * (`--boundary--`).
 *
 * @param {string} text
 * @param {string} boundary
 * @returns {string[]}
 */
function splitMultipart(text, boundary) {
  const delimiter = `--${boundary}`;
  const segments = text.split(delimiter);
  const parts = [];
  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    const trimmed = segment.trim();
    if (trimmed === "" || trimmed === "--") continue;
    parts.push(segment);
  }
  return parts;
}

/**
 * Interpreta uma parte do multipart (os headers MIME da parte, uma linha
 * vazia, e dentro dela a mensagem HTTP de texto completa da sub-resposta:
 * `HTTP/1.1 {status} ...` + headers + linha vazia + corpo JSON opcional) e
 * devolve `{ status, data }`. Tolerante a CRLF e LF.
 *
 * @param {string} part
 * @returns {{ status: number|null, data: unknown }}
 */
function parsePart(part) {
  const normalized = part.replace(/\r\n/g, "\n").replace(/^\n+/, "");
  const outerBlankIndex = normalized.indexOf("\n\n");
  const httpMessage = (outerBlankIndex === -1 ? normalized : normalized.slice(outerBlankIndex + 2))
    .replace(/^\n+/, "");

  const statusMatch = /^HTTP\/1\.\d\s+(\d{3})/.exec(httpMessage);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  const innerBlankIndex = httpMessage.indexOf("\n\n");
  const bodyText = innerBlankIndex === -1 ? "" : httpMessage.slice(innerBlankIndex + 2).trim();

  let data = null;
  if (bodyText) {
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = null;
    }
  }
  return { status, data };
}

/**
 * Executa várias requisições GET como uma única chamada `$batch` REST
 * (OData v3, SharePoint): `POST {webUrl}/_api/$batch` com um corpo
 * multipart/mixed "flat" (sem changeset) contendo uma sub-requisição por
 * item de `requests`, e devolve o resultado de cada uma mapeado pela `key`
 * original.
 *
 * Decisão de parse: as sub-respostas são mapeadas de volta pela ORDEM em que
 * as sub-requisições foram enviadas (não por Content-ID) — o protocolo
 * `$batch` do SharePoint preserva a ordem das sub-respostas dentro de um
 * batch flat de GETs sem changeset, e isso evita a complexidade adicional de
 * gerar/parsear `Content-ID`/`Content-ID` de referência para um cenário sem
 * escritas.
 *
 * Só lança (`SharePointRestError`, `code: "batch-failed"`) se a chamada HTTP
 * externa falhar por completo (erro de rede, resposta HTTP de nível
 * superior fora de 200/207, ou corpo multipart não reconhecível). Falha de
 * uma sub-requisição dentro do batch (ex. HTTP 404) não lança — vira
 * `{ status: 404, data: ... }` na entrada correspondente, para quem chama
 * decidir.
 *
 * `digest`: alguns tenants SharePoint exigem `X-RequestDigest` mesmo em um
 * `$batch` "flat" só de GETs (confirmado contra tenant real: sem o header,
 * `POST {webUrl}/_api/$batch` responde HTTP 403 "The security validation
 * for this page is invalid..."; com o header, 200). Por isso este parâmetro
 * é opcional, mas quem chama em produção deve sempre fornecer um digest
 * válido (ver `createSharePointRestClient().getDigest()`) — sem ele, o
 * comportamento depende da política do tenant.
 *
 * @param {Array<{ key: string, path: string }>} requests
 * @param {{ webUrl?: string, fetchImpl?: typeof fetch, nowImpl?: () => number, boundaryImpl?: () => string, digest?: string }} [options]
 * @returns {Promise<Record<string, { data: unknown, status: number|null }>>}
 */
export async function batchGet(requests, { webUrl, fetchImpl = globalThis.fetch, nowImpl = Date.now, boundaryImpl, digest } = {}) {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new TypeError("requests deve ser um array não vazio de { key, path }.");
  }
  const seenKeys = new Set();
  for (const entry of requests) {
    if (!entry || typeof entry.key !== "string" || !entry.key.trim()) {
      throw new TypeError("Cada requisição do batch deve ter uma key não vazia.");
    }
    if (typeof entry.path !== "string" || !entry.path.trim()) {
      throw new TypeError("Cada requisição do batch deve ter um path não vazio.");
    }
    if (seenKeys.has(entry.key)) {
      throw new TypeError(`key duplicada no batch: "${entry.key}".`);
    }
    seenKeys.add(entry.key);
  }
  if (typeof fetchImpl !== "function") {
    throw restError("fetch-unavailable", "A API fetch não está disponível.");
  }
  if (boundaryImpl !== undefined && typeof boundaryImpl !== "function") {
    throw new TypeError("boundaryImpl deve ser uma função.");
  }
  if (typeof nowImpl !== "function") {
    throw new TypeError("nowImpl deve ser uma função.");
  }
  if (digest !== undefined && (typeof digest !== "string" || !digest.trim())) {
    throw new TypeError("digest, quando informado, deve ser uma string não vazia.");
  }

  const normalizedWebUrl = normalizeWebUrl(webUrl);
  const boundary = (boundaryImpl ?? defaultBoundary)();
  const body = buildBatchBody(boundary, requests, normalizedWebUrl);
  const url = `${normalizedWebUrl}/_api/$batch`;

  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: DEFAULT_ACCEPT,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        ...(digest ? { "X-RequestDigest": digest } : {})
      },
      body
    });
  } catch (cause) {
    throw restError("batch-failed", "Falha de rede ao executar o $batch do SharePoint.", { cause, path: url });
  }

  if (!response.ok || (response.status !== 200 && response.status !== 207)) {
    throw restError(
      "batch-failed",
      `A chamada $batch falhou (HTTP ${response.status}).`,
      { status: response.status, path: url }
    );
  }

  let text;
  try {
    text = await response.text();
  } catch (cause) {
    throw restError("batch-failed", "Não foi possível ler a resposta do $batch.", { cause, path: url });
  }
  if (typeof text !== "string") {
    throw restError("batch-failed", "A resposta do $batch não é multipart.", { path: url });
  }

  const contentType = response.headers?.get?.("Content-Type") ?? response.headers?.get?.("content-type") ?? "";
  const responseBoundary = extractBoundary(contentType) ?? boundaryFromBody(text);
  if (!responseBoundary) {
    throw restError("batch-failed", "A resposta do $batch não contém um boundary multipart válido.", { path: url });
  }

  const parts = splitMultipart(text, responseBoundary);
  if (parts.length !== requests.length) {
    throw restError(
      "batch-failed",
      "A resposta do $batch não contém uma sub-resposta para cada requisição.",
      { path: url }
    );
  }

  const result = {};
  parts.forEach((part, index) => {
    const { status, data } = parsePart(part);
    result[requests[index].key] = Object.freeze({ data, status });
  });
  return result;
}

export function createSharePointRestClient({
  webUrl,
  fetchImpl = globalThis.fetch,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  nowImpl = Date.now,
  maxRetries = 2
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  if (typeof fetchImpl !== "function") {
    throw restError("fetch-unavailable", "A API fetch não está disponível.");
  }
  if (typeof sleepImpl !== "function" || typeof nowImpl !== "function") {
    throw new TypeError("sleepImpl e nowImpl devem ser funções.");
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 5) {
    throw new TypeError("maxRetries deve ser um inteiro entre 0 e 5.");
  }

  const pendingGets = new Map();
  let digestRequest = null;
  let digestValue = null;
  let digestExpiresAt = 0;

  async function perform(url, options, retry) {
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(url, options);
      } catch (cause) {
        throw restError("network-error", "Falha de rede ao acessar o SharePoint.", { cause, path: url });
      }

      const retryAfterMs = retryDelay(response, nowImpl);
      const throttled = response.status === 429 || response.status === 503;
      if (!retry || !throttled || attempt >= maxRetries) {
        try {
          throwForResponse(response, retryAfterMs);
        } catch (error) {
          error.path = url;
          throw error;
        }
        return response;
      }

      await sleepImpl(retryAfterMs ?? Math.min(1000 * (2 ** attempt), 30000));
    }
  }

  async function getDigest() {
    if (digestValue && digestExpiresAt > nowImpl()) return digestValue;
    if (digestRequest) return digestRequest;

    digestRequest = (async () => {
      const response = await perform(
        normalizeApiUrl(normalizedWebUrl, "/_api/contextinfo"),
        { method: "POST", headers: { Accept: DEFAULT_ACCEPT } },
        true
      );
      const data = await readJson(response);
      const context = data?.GetContextWebInformation ?? data?.d?.GetContextWebInformation ?? data?.d ?? data;
      if (!context?.FormDigestValue) {
        throw restError("invalid-response", "O SharePoint não retornou um request digest.");
      }
      const lifetime = Number(context.FormDigestTimeoutSeconds) || 1800;
      digestExpiresAt = nowImpl() + Math.max(0, lifetime - 30) * 1000;
      digestValue = context.FormDigestValue;
      return digestValue;
    })();

    try {
      return await digestRequest;
    } catch (error) {
      digestValue = null;
      digestExpiresAt = 0;
      throw error;
    } finally {
      digestRequest = null;
    }
  }

  async function runRequest(path, {
    method = "GET",
    headers = {},
    body,
    etag,
    allowWildcardEtag = false,
    retry,
    deduplicate = true
  } = {}) {
    const requestedMethod = String(method).toUpperCase();
    if (!new Set(["GET", "POST", "MERGE", "DELETE"]).has(requestedMethod)) {
      throw new TypeError("method deve ser GET, POST, MERGE ou DELETE.");
    }
    const readOnly = requestedMethod === "GET";
    const requiresEtag = requestedMethod === "MERGE" || requestedMethod === "DELETE";
    if (requiresEtag && (typeof etag !== "string" || !etag.trim()
      || (etag.trim() === "*" && !allowWildcardEtag))) {
      throw restError("etag-required", "A ETag exata é obrigatória para alterar ou excluir.");
    }

    const url = normalizeApiUrl(normalizedWebUrl, path);
    const requestHeaders = { Accept: DEFAULT_ACCEPT, ...headers };
    let transportMethod = requestedMethod;

    if (!readOnly) {
      requestHeaders["X-RequestDigest"] = await getDigest();
      if (body !== undefined) {
        if (binaryBody(body)) requestHeaders["Content-Type"] ||= "application/octet-stream";
        else {
          requestHeaders["Content-Type"] ||= DEFAULT_ACCEPT;
          body = typeof body === "string" ? body : JSON.stringify(body);
        }
      }
      if (requiresEtag) requestHeaders["If-Match"] = etag.trim();
      if (requestedMethod === "MERGE" || requestedMethod === "DELETE") {
        transportMethod = "POST";
        requestHeaders["X-HTTP-Method"] = requestedMethod;
      }
    }

    const options = { method: transportMethod, headers };
    options.headers = requestHeaders;
    if (body !== undefined) options.body = body;
    const shouldRetry = retry ?? readOnly;

    const execute = async () => {
      const response = await perform(url, options, shouldRetry);
      let data;
      try {
        data = await readJson(response);
      } catch (error) {
        error.path ||= url;
        throw error;
      }
      return Object.freeze({
        data,
        etag: responseEtag(response, data),
        status: response.status
      });
    };

    if (!readOnly || !deduplicate) return execute();

    const key = `${requestedMethod}|${url}|${stableHeaders(requestHeaders)}`;
    if (pendingGets.has(key)) return pendingGets.get(key);
    const pending = execute().finally(() => pendingGets.delete(key));
    pendingGets.set(key, pending);
    return pending;
  }

  async function getAll(path, { maxPages = 100 } = {}) {
    if (!Number.isInteger(maxPages) || maxPages < 1) {
      throw new TypeError("maxPages deve ser um inteiro positivo.");
    }

    const items = [];
    let next = path;
    for (let page = 0; next && page < maxPages; page += 1) {
      const result = await runRequest(next);
      const current = unwrapPage(result.data);
      items.push(...current.items);
      next = current.next;
    }
    if (next) throw restError("page-limit", `A consulta excedeu o limite de ${maxPages} páginas.`);
    return items;
  }

  function listItemsRequestPath(list, options = {}) {
    return buildListItemsRequest(list, options);
  }

  function getListItems(list, options = {}) {
    const query = listItemsRequestPath(list, options);
    return getAll(query.path, { maxPages: query.maxPages });
  }

  async function getListItemPage(list, { cursor, ...options } = {}) {
    if (cursor !== undefined && (typeof cursor !== "string" || !cursor.trim())) {
      throw new TypeError("cursor deve ser uma URL de paginação não vazia.");
    }
    const path = cursor?.trim() ?? listItemsRequestPath(list, options).path;
    const result = await runRequest(path);
    const page = unwrapPage(result.data);
    return Object.freeze({ items: Object.freeze(page.items), next: page.next });
  }

  async function getEffectiveBasePermissions(list) {
    const result = await runRequest(`${listApiPath(list)}/EffectiveBasePermissions`);
    const data = result.data?.d ?? result.data;
    const permissions = data?.EffectiveBasePermissions ?? data?.effectiveBasePermissions ?? data;
    return Object.freeze({ permissions, status: result.status });
  }

  async function getListItem(list, id, { select, expand } = {}) {
    if (!Array.isArray(select) || !select.length || select.some((field) =>
      typeof field !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*(\/[A-Za-z_][A-Za-z0-9_]*)?$/.test(field)
    )) {
      throw new TypeError("select deve conter nomes internos de campos válidos.");
    }
    const query = [`$select=${select.map(encodeURIComponent).join(",")}`];
    if (expand !== undefined) {
      if (typeof expand !== "string" || !expand.trim()) throw new TypeError("expand deve ser um texto não vazio.");
      query.push(`$expand=${encodeURIComponent(expand)}`);
    }
    const result = await runRequest(`${listApiPath(list)}/items(${itemId(id)})?${query.join("&")}`);
    return Object.freeze({ item: result.data?.d ?? result.data, etag: result.etag, status: result.status });
  }

  async function createListItem(list, values) {
    const result = await runRequest(`${listApiPath(list)}/items`, {
      method: "POST",
      body: itemValues(values)
    });
    return Object.freeze({ item: result.data?.d ?? result.data, etag: result.etag, status: result.status });
  }

  async function updateListItem(list, id, values, { etag } = {}) {
    const result = await runRequest(`${listApiPath(list)}/items(${itemId(id)})`, {
      method: "MERGE",
      etag,
      body: itemValues(values)
    });
    return Object.freeze({ item: result.data?.d ?? result.data, etag: result.etag, status: result.status });
  }

  async function deleteListItem(list, id, { etag } = {}) {
    const result = await runRequest(`${listApiPath(list)}/items(${itemId(id)})`, {
      method: "DELETE",
      etag
    });
    return Object.freeze({ etag: result.etag, status: result.status });
  }

  async function uploadFile(list, { fileName: requestedFileName, content, contentType } = {}) {
    const normalizedFileName = fileName(requestedFileName);
    if (!binaryBody(content)) {
      throw new TypeError("content deve ser ArrayBuffer, TypedArray ou Blob.");
    }
    if (contentType !== undefined && (typeof contentType !== "string"
      || !/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(contentType))) {
      throw new TypeError("contentType deve ser um MIME type válido.");
    }
    const escapedName = normalizedFileName.replaceAll("'", "''");
    const result = await runRequest(`${listApiPath(list)}/RootFolder/Files/add(url='${escapedName}',overwrite=false)`, {
      method: "POST",
      headers: { "Content-Type": contentType || "application/octet-stream" },
      body: content
    });
    const file = result.data?.d ?? result.data;
    const serverRelativeUrl = file?.ServerRelativeUrl ?? file?.serverRelativeUrl;
    if (typeof serverRelativeUrl !== "string" || !serverRelativeUrl.startsWith("/")) {
      throw restError("invalid-response", "O SharePoint não retornou a URL do arquivo enviado.");
    }
    return Object.freeze({ file, serverRelativeUrl, etag: result.etag, status: result.status });
  }

  return Object.freeze({
    webUrl: normalizedWebUrl,
    request: runRequest,
    getDigest,
    getAll,
    getListItems,
    getListItemPage,
    getListItem,
    getEffectiveBasePermissions,
    createListItem,
    updateListItem,
    deleteListItem,
    uploadFile
  });
}
