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

function unwrapPage(data) {
  const value = data?.value ?? data?.d?.results;
  if (!Array.isArray(value)) {
    throw restError("invalid-response", "O SharePoint retornou uma página de itens inválida.");
  }
  return {
    items: value,
    next: data?.["@odata.nextLink"] ?? data?.d?.__next ?? null
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
        requestHeaders["Content-Type"] ||= DEFAULT_ACCEPT;
        body = typeof body === "string" ? body : JSON.stringify(body);
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

  function listItemsRequestPath(list, {
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

  return Object.freeze({
    webUrl: normalizedWebUrl,
    request: runRequest,
    getAll,
    getListItems,
    getListItemPage,
    getListItem,
    createListItem,
    updateListItem,
    deleteListItem
  });
}
