const ID = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SETTING_TYPES = new Set([
  "text", "number", "select", "multiselect", "boolean", "color", "url", "page", "list", "taxonomy"
]);
const PERMISSIONS = new Set(["read", "write", "manage-lists", "send-mail"]);
const DATA_SOURCE_TYPES = new Set(["list", "library"]);

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} deve ser um texto não vazio.`);
  return value.trim();
}

function identifier(value, label) {
  const result = text(value, label);
  if (!ID.test(result)) throw new TypeError(`${label} deve estar em kebab-case.`);
  return result;
}

export function defineModuleManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("manifest deve ser um objeto.");
  }
  const id = identifier(value.id, "manifest.id");
  const version = text(value.version, `${id}.version`);
  if (!VERSION.test(version)) throw new TypeError(`${id}.version deve usar SemVer.`);
  const compatibility = text(value.coreCompatibility, `${id}.coreCompatibility`);
  if (!/^>=\d+\.\d+\.\d+\s+<\d+\.\d+\.\d+$/.test(compatibility)) {
    throw new TypeError(`${id}.coreCompatibility deve declarar limites mínimo e máximo.`);
  }
  const capabilities = {
    full: value.capabilities?.full !== false,
    summary: Boolean(value.capabilities?.summary),
    settings: value.capabilities?.settings !== false,
    provisioning: Boolean(value.capabilities?.provisioning)
  };
  const entrypoints = { full: text(value.entrypoints?.full, `${id}.entrypoints.full`) };
  if (capabilities.summary) entrypoints.summary = text(value.entrypoints?.summary, `${id}.entrypoints.summary`);
  if (!Number.isInteger(value.dataSchemaVersion) || value.dataSchemaVersion < 0) {
    throw new TypeError(`${id}.dataSchemaVersion deve ser um inteiro não negativo.`);
  }
  const settingsSchemaVersion = value.settingsSchemaVersion ?? 1;
  if (!Number.isInteger(settingsSchemaVersion) || settingsSchemaVersion < 1) {
    throw new TypeError(`${id}.settingsSchemaVersion deve ser um inteiro positivo.`);
  }
  const permissions = [...new Set((value.permissions ?? ["read"]).map((permission) => text(permission, `${id}.permissions`)))];
  permissions.forEach((permission) => {
    if (!PERMISSIONS.has(permission)) throw new TypeError(`${id}.permissions contém ${permission} inválido.`);
  });
  const dataSources = (value.dataSources ?? []).map((source) => {
    const type = text(source?.type, `${id}.dataSources.type`);
    if (!DATA_SOURCE_TYPES.has(type)) throw new TypeError(`${id}.dataSources.type contém ${type} inválido.`);
    return {
      key: identifier(source.key, `${id}.dataSources.key`),
      type,
      internalName: text(source.internalName, `${id}.dataSources.internalName`),
      displayName: text(source.displayName, `${id}.dataSources.displayName`),
      required: source.required !== false
    };
  });
  const locales = [...new Set((value.locales ?? ["pt-BR"]).map((locale) => text(locale, `${id}.locales`)))];
  const styles = [...new Set((value.styles ?? []).map((style) => text(style, `${id}.styles`)))];
  return freeze({
    id,
    displayName: text(value.displayName, `${id}.displayName`),
    version,
    coreCompatibility: compatibility,
    stability: value.stability ?? "preview",
    dataSchemaVersion: value.dataSchemaVersion,
    settingsSchemaVersion,
    permissions,
    dataSources,
    locales,
    styles,
    capabilities,
    entrypoints
  });
}

function normalizeSetting(field, groupId) {
  const id = text(field?.id, `${groupId}.field.id`);
  if (!/^[a-z][a-zA-Z0-9.]{0,127}$/.test(id)) throw new TypeError(`${id} possui identificador inválido.`);
  const type = text(field.type, `${id}.type`);
  if (!SETTING_TYPES.has(type)) throw new TypeError(`${id}.type não é suportado.`);
  const result = { id, type, label: text(field.label, `${id}.label`) };
  if (["select", "multiselect", "color"].includes(type)) {
    if (!Array.isArray(field.options) || !field.options.length) throw new TypeError(`${id}.options não pode ser vazio.`);
    result.options = [...new Set(field.options.map((option) => String(option)))];
  }
  if (type === "number") {
    if (field.min !== undefined) result.min = Number(field.min);
    if (field.max !== undefined) result.max = Number(field.max);
    if (result.min !== undefined && result.max !== undefined && result.min > result.max) {
      throw new TypeError(`${id} possui limites inválidos.`);
    }
  }
  if (field.default !== undefined) result.default = field.default;
  if (field.help) result.help = text(field.help, `${id}.help`);
  return result;
}

export function defineSettingsSchema(value) {
  if (!value || typeof value !== "object" || !Number.isInteger(value.version) || value.version < 1) {
    throw new TypeError("settings schema deve possuir version inteira positiva.");
  }
  if (!Array.isArray(value.groups) || !value.groups.length) throw new TypeError("settings schema deve possuir grupos.");
  const fieldIds = new Set();
  const groups = value.groups.map((group) => {
    const id = identifier(group?.id, "group.id");
    if (!Array.isArray(group.fields) || !group.fields.length) throw new TypeError(`${id}.fields não pode ser vazio.`);
    const fields = group.fields.map((field) => normalizeSetting(field, id));
    for (const field of fields) {
      if (fieldIds.has(field.id)) throw new TypeError(`Setting duplicado: ${field.id}.`);
      fieldIds.add(field.id);
    }
    return { id, label: text(group.label, `${id}.label`), fields };
  });
  return freeze({ version: value.version, groups });
}

export function settingsDefaults(schema) {
  const normalized = defineSettingsSchema(schema);
  return freeze(Object.fromEntries(normalized.groups.flatMap((group) => group.fields)
    .filter((field) => field.default !== undefined)
    .map((field) => [field.id, field.default])));
}
