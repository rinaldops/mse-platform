import { createSharePointRestClient } from "./rest.js";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeWebUrl(value) {
  if (typeof value !== "string" || !value.trim().startsWith("/")) {
    throw new TypeError("webUrl deve ser uma URL server-relative.");
  }
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized || normalized.startsWith("//") || /[?#]/.test(normalized)) {
    throw new TypeError("webUrl deve ser uma URL server-relative.");
  }
  return normalized;
}

function normalizeSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("Cada fonte de dados deve ser um objeto.");
  }
  if (typeof source.key !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(source.key)) {
    throw new TypeError("source.key deve estar em kebab-case.");
  }
  if (typeof source.listId !== "string" || !GUID.test(source.listId)) {
    throw new TypeError(`${source.key}.listId deve ser um GUID válido.`);
  }
  return Object.freeze({
    key: source.key,
    webUrl: normalizeWebUrl(source.webUrl),
    listId: source.listId.toLowerCase()
  });
}

export function createSharePointDataSourceRegistry({
  sources,
  allowedWebUrls,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!Array.isArray(sources) || !sources.length) {
    throw new TypeError("sources deve conter ao menos uma fonte de dados.");
  }
  if (!Array.isArray(allowedWebUrls) || !allowedWebUrls.length) {
    throw new TypeError("allowedWebUrls deve conter ao menos um site autorizado.");
  }

  const allowed = new Set(allowedWebUrls.map(normalizeWebUrl));
  const byKey = new Map();
  for (const source of sources.map(normalizeSource)) {
    if (!allowed.has(source.webUrl)) {
      throw new TypeError(`O site ${source.webUrl} não está na allowlist.`);
    }
    if (byKey.has(source.key)) throw new TypeError(`Fonte de dados duplicada: ${source.key}.`);
    byKey.set(source.key, source);
  }

  const clients = new Map();
  function get(key) {
    const source = byKey.get(key);
    if (!source) throw new TypeError(`Fonte de dados desconhecida: ${key}.`);
    return source;
  }
  function getClient(key) {
    const source = get(key);
    if (!clients.has(source.webUrl)) {
      clients.set(source.webUrl, createSharePointRestClient({ webUrl: source.webUrl, fetchImpl }));
    }
    return clients.get(source.webUrl);
  }

  return Object.freeze({ get, getClient });
}
