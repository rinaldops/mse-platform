// core/extension-contract.js
//
// Contrato canônico de extensões do monorepo (Componentes, Módulos e Plugins),
// alinhado ao vocabulário do Joomla. Este arquivo não substitui
// core/module-contract.js: ele formaliza o shape do contrato em runtime e
// permite evolução incremental sem quebrar manifestos existentes.
//
// Regras:
// - não faz IO, não importa do host, não acessa SharePoint.
// - funções puras e tolerantes a dados de conteúdo (retornam null/[] quando aplicável).

const ID = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const COMPAT = /^>=\d+\.\d+\.\d+\s+<\d+\.\d+\.\d+$/;

const EXTENSION_TYPES = new Set(["component", "module", "plugin"]);

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} deve ser um texto não vazio.`);
  }
  return value.trim();
}

function identifier(value, label) {
  const result = text(value, label);
  if (!ID.test(result)) throw new TypeError(`${label} deve estar em kebab-case.`);
  return result;
}

function semver(value, label) {
  const result = text(value, label);
  if (!VERSION.test(result)) throw new TypeError(`${label} deve usar SemVer.`);
  return result;
}

function compatibility(value, label) {
  const result = text(value, label);
  if (!COMPAT.test(result)) {
    throw new TypeError(`${label} deve declarar limites mínimo e máximo.`);
  }
  return result;
}

function uniqueStrings(values, label) {
  if (values === undefined) return undefined;
  if (!Array.isArray(values)) throw new TypeError(`${label} deve ser um array.`);
  const normalized = values.map((item) => text(String(item), label));
  return [...new Set(normalized)];
}

function normalizeEntrypoints(entrypoints, id) {
  if (!entrypoints || typeof entrypoints !== "object" || Array.isArray(entrypoints)) {
    throw new TypeError(`${id}.entrypoints deve ser um objeto.`);
  }
  const full = text(entrypoints.full, `${id}.entrypoints.full`);
  const result = { full };
  if (entrypoints.summary !== undefined) {
    result.summary = text(entrypoints.summary, `${id}.entrypoints.summary`);
  }
  return result;
}

function normalizeViews(views, id) {
  if (views === undefined) return { full: true };
  if (!views || typeof views !== "object" || Array.isArray(views)) {
    throw new TypeError(`${id}.views deve ser um objeto.`);
  }
  const filtered = Object.fromEntries(
    Object.entries(views)
      .map(([key, enabled]) => [text(key, `${id}.views`), Boolean(enabled)])
      .filter(([, enabled]) => enabled)
  );
  if (Object.keys(filtered).length === 0) {
    throw new TypeError(`${id}.views deve possuir ao menos uma visão habilitada.`);
  }
  return filtered;
}

function normalizePositions(positions, id) {
  if (!Array.isArray(positions) || positions.length === 0) {
    throw new TypeError(`${id}.positions deve ser um array não vazio de posições.`);
  }
  return [...new Set(positions.map((pos) => identifier(pos, `${id}.positions`)))];
}

function normalizeEvents(events, id) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new TypeError(`${id}.events deve ser um array não vazio de eventos.`);
  }
  return [...new Set(events.map((evt) => text(evt, `${id}.events`)))];
}

/**
 * Normaliza um objeto de contrato de extensão para um shape canônico.
 *
 * Compatibilidade:
 * - aceita manifestos existentes do módulo-contract (type default "component")
 * - preserva campos desconhecidos fora deste contrato como não-suportados: lança
 *   apenas para violações de campos essenciais.
 */
export function defineExtensionContract(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("extension deve ser um objeto.");
  }

  const id = identifier(value.id, "extension.id");

  const type = value.type ?? "component";
  if (typeof type !== "string" || !EXTENSION_TYPES.has(type)) {
    throw new TypeError(`${id}.type deve ser "component", "module" ou "plugin".`);
  }

  const version = semver(value.version, `${id}.version`);
  const coreCompatibility = compatibility(value.coreCompatibility, `${id}.coreCompatibility`);
  const entrypoints = normalizeEntrypoints(value.entrypoints ?? {}, id);

  const base = {
    id,
    type,
    displayName: value.displayName ? text(value.displayName, `${id}.displayName`) : id,
    version,
    coreCompatibility,
    entrypoints,
    stability: value.stability ?? "preview",
    dataSchemaVersion: Number.isInteger(value.dataSchemaVersion) ? value.dataSchemaVersion : 0,
    settingsSchemaVersion: Number.isInteger(value.settingsSchemaVersion) ? value.settingsSchemaVersion : 1,
    permissions: uniqueStrings(value.permissions, `${id}.permissions`) ?? ["read"],
    dataSources: Array.isArray(value.dataSources) ? value.dataSources : [],
    locales: uniqueStrings(value.locales, `${id}.locales`) ?? ["pt-BR"],
    styles: uniqueStrings(value.styles, `${id}.styles`) ?? []
  };

  if (type === "component") {
    return freeze({
      ...base,
      views: normalizeViews(value.views, id),
      routeParams: value.routeParams ? uniqueStrings(value.routeParams, `${id}.routeParams`) : undefined
    });
  }

  if (type === "module") {
    return freeze({
      ...base,
      positions: normalizePositions(value.positions, id)
    });
  }

  return freeze({
    ...base,
    events: normalizeEvents(value.events, id)
  });
}

/**
 * Valida que um contrato canônico é compatível com uma versão do core.
 * Implementação mínima: apenas devolve boolean, sem parse de ranges complexos.
 *
 * Observação: o parser de ranges completo permanece em module-contract/host.
 */
export function supportsCore(compatibilityRange, coreVersion) {
  try {
    compatibility(compatibilityRange, "compatibility");
    semver(coreVersion, "coreVersion");
  } catch {
    return false;
  }
  const [min, max] = String(compatibilityRange).split(/\s+/).map((token) => token.replace(/^>=|^</, ""));
  const [maj, minv, pat] = coreVersion.split(".").map((n) => Number(n));
  function toTuple(v) {
    const [a, b, c] = v.split(".").map((n) => Number(n));
    return [a, b, c];
  }
  function gte(left, right) {
    for (let i = 0; i < 3; i += 1) {
      if (left[i] > right[i]) return true;
      if (left[i] < right[i]) return false;
    }
    return true;
  }
  function lt(left, right) {
    for (let i = 0; i < 3; i += 1) {
      if (left[i] < right[i]) return true;
      if (left[i] > right[i]) return false;
    }
    return false;
  }
  const cv = [maj, minv, pat];
  const minT = toTuple(min);
  const maxT = toTuple(max);
  return gte(cv, minT) && lt(cv, maxT);
}
