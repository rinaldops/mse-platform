import { createSharePointRestClient } from "./rest.js";

const FIELD_TYPES = new Set(["Text", "Note", "Choice", "Number", "Boolean", "DateTime"]);
const INDEXABLE_TYPES = new Set(["Text", "Choice", "Number", "Boolean", "DateTime"]);
const UNIQUE_TYPES = new Set(["Text", "Choice", "Number", "DateTime"]);

export class ListProvisioningError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ListProvisioningError";
    this.code = code;
    if (details.listTitle) this.listTitle = details.listTitle;
    if (details.fieldName) this.fieldName = details.fieldName;
  }
}

function provisioningError(code, message, details) {
  return new ListProvisioningError(code, message, details);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function requiredText(value, label, maxLength = 255) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(`${label} deve ser um texto não vazio com até ${maxLength} caracteres.`);
  }
  return value.trim();
}

function normalizeGuid(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError(`${label} deve ser um GUID válido.`);
  }
  return value.toLowerCase();
}

function normalizeTitleField(value = {}) {
  return {
    displayName: requiredText(value.displayName ?? "Título", "titleField.displayName"),
    required: value.required !== false,
    indexed: Boolean(value.indexed),
    unique: Boolean(value.unique)
  };
}

function normalizeField(value, listTitle) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Os campos de ${listTitle} devem ser objetos.`);
  }

  const internalName = requiredText(value.internalName, "field.internalName", 64);
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(internalName) || internalName === "Title") {
    throw new TypeError(`Nome interno de campo inválido em ${listTitle}: ${internalName}.`);
  }
  const type = requiredText(value.type, `${internalName}.type`, 32);
  if (!FIELD_TYPES.has(type)) {
    throw new TypeError(`Tipo de campo não suportado em ${internalName}: ${type}.`);
  }

  const field = {
    internalName,
    displayName: requiredText(value.displayName, `${internalName}.displayName`),
    type,
    required: Boolean(value.required),
    indexed: Boolean(value.indexed),
    unique: Boolean(value.unique)
  };
  if (field.indexed && !INDEXABLE_TYPES.has(type)) {
    throw new TypeError(`O campo ${internalName} não aceita índice.`);
  }
  if (field.unique && (!UNIQUE_TYPES.has(type) || !field.indexed)) {
    throw new TypeError(`O campo ${internalName} precisa aceitar índice e estar indexado para ser único.`);
  }

  if (type === "Text") {
    field.maxLength = value.maxLength ?? 255;
    if (!Number.isInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 255) {
      throw new TypeError(`${internalName}.maxLength deve estar entre 1 e 255.`);
    }
  }
  if (type === "Note") {
    field.richText = Boolean(value.richText);
    field.lines = value.lines ?? 8;
    if (!Number.isInteger(field.lines) || field.lines < 1 || field.lines > 1000) {
      throw new TypeError(`${internalName}.lines deve estar entre 1 e 1000.`);
    }
  }
  if (type === "Choice") {
    if (!Array.isArray(value.choices) || value.choices.length < 2) {
      throw new TypeError(`${internalName}.choices deve possuir ao menos duas opções.`);
    }
    field.choices = [...new Set(value.choices.map((choice) => requiredText(
      choice,
      `${internalName}.choices`,
      255
    )))];
    if (field.choices.length !== value.choices.length) {
      throw new TypeError(`${internalName}.choices não pode conter opções duplicadas.`);
    }
    if (value.defaultValue !== undefined) {
      field.defaultValue = requiredText(value.defaultValue, `${internalName}.defaultValue`, 255);
      if (!field.choices.includes(field.defaultValue)) {
        throw new TypeError(`${internalName}.defaultValue deve existir em choices.`);
      }
    }
  }
  if (type === "Number") {
    field.decimals = value.decimals ?? 0;
    if (!Number.isInteger(field.decimals) || field.decimals < 0 || field.decimals > 5) {
      throw new TypeError(`${internalName}.decimals deve estar entre 0 e 5.`);
    }
    if (value.min !== undefined) field.min = Number(value.min);
    if (value.defaultValue !== undefined) field.defaultValue = Number(value.defaultValue);
    if ((field.min !== undefined && !Number.isFinite(field.min))
      || (field.defaultValue !== undefined && !Number.isFinite(field.defaultValue))) {
      throw new TypeError(`${internalName} possui valor numérico inválido.`);
    }
  }
  if (type === "Boolean") field.defaultValue = Boolean(value.defaultValue);

  return field;
}

export function defineListSchema(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Cada schema de lista deve ser um objeto.");
  }

  const key = requiredText(value.key, "schema.key", 64);
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(key)) {
    throw new TypeError("schema.key deve estar em kebab-case.");
  }
  const internalName = requiredText(value.internalName, `${key}.internalName`, 64);
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(internalName)) {
    throw new TypeError(`${key}.internalName deve conter somente caracteres ASCII técnicos.`);
  }
  const displayName = requiredText(value.displayName, `${key}.displayName`, 255);
  const listId = normalizeGuid(value.listId, `${key}.listId`);
  const version = value.version ?? 1;
  const template = value.template ?? 100;
  const readSecurity = value.readSecurity ?? 1;
  const writeSecurity = value.writeSecurity ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError(`${displayName}.version deve ser um inteiro positivo.`);
  }
  if (![100, 101].includes(template)) {
    throw new TypeError(`${displayName}.template deve ser 100 ou 101.`);
  }
  if (![1, 2].includes(readSecurity) || ![1, 2, 4].includes(writeSecurity)) {
    throw new TypeError(`${displayName} possui ReadSecurity ou WriteSecurity inválido.`);
  }
  if (template === 101 && (readSecurity !== 1 || writeSecurity !== 1)) {
    throw new TypeError(`${displayName} é uma biblioteca e deve herdar ReadSecurity/WriteSecurity 1/1.`);
  }

  const fields = (value.fields ?? []).map((field) => normalizeField(field, displayName));
  const names = new Set();
  for (const field of fields) {
    if (names.has(field.internalName.toLowerCase())) {
      throw new TypeError(`Campo duplicado em ${displayName}: ${field.internalName}.`);
    }
    names.add(field.internalName.toLowerCase());
  }

  const titleField = normalizeTitleField(value.titleField);
  if (titleField.unique && !titleField.indexed) {
    throw new TypeError(`${displayName}.titleField precisa estar indexado para ser único.`);
  }

  return deepFreeze({
    key,
    internalName,
    displayName,
    listId,
    description: typeof value.description === "string" ? value.description.trim() : "",
    version,
    template,
    versioning: value.versioning !== false,
    readSecurity,
    writeSecurity,
    titleField,
    fields
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("'", "&apos;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fieldXml(field) {
  const attributes = [
    `Type='${field.type}'`,
    `DisplayName='${escapeXml(field.displayName)}'`,
    `Name='${field.internalName}'`,
    `StaticName='${field.internalName}'`,
    `Required='${field.required ? "TRUE" : "FALSE"}'`
  ];
  if (field.indexed) attributes.push("Indexed='TRUE'");
  if (field.unique) attributes.push("EnforceUniqueValues='TRUE'");
  if (field.type === "Text") attributes.push(`MaxLength='${field.maxLength}'`);
  if (field.type === "Note") {
    attributes.push(`NumLines='${field.lines}'`, `RichText='${field.richText ? "TRUE" : "FALSE"}'`);
    if (field.richText) attributes.push("RichTextMode='FullHtml'", "IsolateStyles='TRUE'");
  }
  if (field.type === "Choice") attributes.push("Format='Dropdown'", "FillInChoice='FALSE'");
  if (field.type === "Number") {
    attributes.push(`Decimals='${field.decimals}'`);
    if (field.min !== undefined) attributes.push(`Min='${field.min}'`);
  }
  if (field.type === "DateTime") {
    attributes.push("Format='DateTime'", "IncludeTimeValue='TRUE'");
  }

  let content = "";
  if (field.type === "Choice") {
    content += `<CHOICES>${field.choices.map((choice) =>
      `<CHOICE>${escapeXml(choice)}</CHOICE>`
    ).join("")}</CHOICES>`;
  }
  if (field.defaultValue !== undefined) {
    const defaultValue = field.type === "Boolean" ? (field.defaultValue ? "1" : "0") : field.defaultValue;
    content += `<Default>${escapeXml(defaultValue)}</Default>`;
  }
  return `<Field ${attributes.join(" ")}>${content}</Field>`;
}

function listPath(listId) {
  return `/_api/web/lists(guid'${listId}')`;
}

function unwrap(data) {
  return data?.value ?? data?.d?.results ?? data?.d ?? data;
}

function fieldChoices(field) {
  const choices = field?.Choices?.results ?? field?.Choices;
  return Array.isArray(choices) ? choices : [];
}

function validateExistingField(actual, expected, listTitle) {
  const conflicts = [];
  if (actual.TypeAsString !== expected.type) conflicts.push(`tipo ${actual.TypeAsString}`);
  if (Boolean(actual.Required) !== expected.required) conflicts.push(`Required=${Boolean(actual.Required)}`);
  if (expected.indexed && !actual.Indexed) conflicts.push("sem índice");
  if (Boolean(actual.EnforceUniqueValues) !== expected.unique) conflicts.push("unicidade divergente");
  if (expected.choices) {
    const actualChoices = fieldChoices(actual);
    if (actualChoices.length !== expected.choices.length
      || expected.choices.some((choice) => !actualChoices.includes(choice))) {
      conflicts.push("opções divergentes");
    }
  }
  if (conflicts.length) {
    throw provisioningError(
      "schema-conflict",
      `O campo ${expected.internalName} da lista ${listTitle} é incompatível: ${conflicts.join(", ")}.`,
      { listTitle, fieldName: expected.internalName }
    );
  }
}

async function discoverListId(client, schema) {
  if (schema.listId) return schema.listId;
  const result = await client.request(
    "/_api/web/lists?$select=Id,RootFolder/Name&$expand=RootFolder&$top=5000"
  );
  const lists = unwrap(result.data);
  if (!Array.isArray(lists)) {
    throw provisioningError("invalid-response", "O SharePoint não retornou o catálogo de listas.");
  }
  return lists.find((list) =>
    list.RootFolder?.Name?.toLowerCase() === schema.internalName.toLowerCase()
  )?.Id?.toLowerCase() ?? null;
}

async function inspectList(client, schema) {
  const listId = await discoverListId(client, schema);
  if (!listId) {
    return {
      exists: false,
      listId: null,
      listEtag: null,
      titleEtag: null,
      configureDisplayName: true,
      configureTitle: true,
      enableVersioning: schema.versioning,
      configureSecurity: schema.readSecurity !== 1 || schema.writeSecurity !== 1,
      missingFields: [...schema.fields]
    };
  }

  const path = listPath(listId);
  let listResult;
  try {
    listResult = await client.request(
      `${path}?$select=Id,Title,BaseTemplate,EnableVersioning,ReadSecurity,WriteSecurity,RootFolder/Name&$expand=RootFolder`
    );
  } catch (error) {
    if (error?.code === "not-found" && schema.listId) {
      throw provisioningError(
        "list-id-not-found",
        `A lista configurada para ${schema.displayName} não existe mais.`,
        { listTitle: schema.displayName }
      );
    }
    throw error;
  }

  const list = unwrap(listResult.data);
  if (!list?.Id || Number(list.BaseTemplate) !== schema.template
    || list.RootFolder?.Name?.toLowerCase() !== schema.internalName.toLowerCase()) {
    throw provisioningError(
      "schema-conflict",
      `A lista ${schema.displayName} existe com um template incompatível.`,
      { listTitle: schema.displayName }
    );
  }
  const actualReadSecurity = Number(list.ReadSecurity ?? 1);
  const actualWriteSecurity = Number(list.WriteSecurity ?? 1);
  const writeBreadth = { 4: 0, 2: 1, 1: 2 };
  if ((actualReadSecurity === 2 && schema.readSecurity === 1)
    || writeBreadth[schema.writeSecurity] > writeBreadth[actualWriteSecurity]) {
    throw provisioningError(
      "schema-conflict",
      `A lista ${schema.displayName} possui segurança mais restritiva que a declaração do módulo.`,
      { listTitle: schema.displayName }
    );
  }

  const fieldsResult = await client.request(
    `${path}/fields?$select=InternalName,StaticName,Title,TypeAsString,Required,Indexed,EnforceUniqueValues,Choices`
  );
  const fields = unwrap(fieldsResult.data);
  if (!Array.isArray(fields)) {
    throw provisioningError("invalid-response", `O schema da lista ${schema.displayName} é inválido.`);
  }

  const byName = new Map(fields.map((field) => [field.InternalName, field]));
  const title = byName.get("Title");
  if (!title || title.TypeAsString !== "Text") {
    throw provisioningError("schema-conflict", `O campo Title de ${schema.displayName} é incompatível.`);
  }
  const titleField = schema.titleField;
  if (title.EnforceUniqueValues && !titleField.unique) {
    throw provisioningError(
      "schema-conflict",
      `O campo Title de ${schema.displayName} possui unicidade não prevista pelo módulo.`,
      { listTitle: schema.displayName, fieldName: "Title" }
    );
  }
  const configureTitle = title.Title !== titleField.displayName
    || Boolean(title.Required) !== titleField.required
    || (titleField.indexed && !title.Indexed)
    || Boolean(title.EnforceUniqueValues) !== titleField.unique;
  let titleEtag = title["@odata.etag"] ?? title.__metadata?.etag ?? null;
  if (configureTitle && !titleEtag) {
    const titleResult = await client.request(
      `${path}/fields/getbyinternalnameortitle('Title')?$select=InternalName`,
      { headers: { Accept: "application/json;odata=verbose" } }
    );
    const titleData = unwrap(titleResult.data);
    titleEtag = titleResult.etag ?? titleData?.["@odata.etag"] ?? titleData?.__metadata?.etag ?? null;
  }
  if (configureTitle && !titleEtag) titleEtag = "*";

  const missingFields = [];
  for (const expected of schema.fields) {
    const field = byName.get(expected.internalName);
    const renamed = fields.find((candidate) =>
      candidate.StaticName === expected.internalName
      && candidate.InternalName !== expected.internalName
    );
    if (renamed) {
      throw provisioningError(
        "schema-conflict",
        `O campo ${expected.internalName} foi criado como ${renamed.InternalName}.`,
        { listTitle: schema.displayName, fieldName: expected.internalName }
      );
    }
    if (!field) missingFields.push(expected);
    else validateExistingField(field, expected, schema.displayName);
  }

  if (schema.versioning && !list.EnableVersioning && !listResult.etag) {
    throw provisioningError("etag-unavailable", `A lista ${schema.displayName} não retornou ETag.`);
  }
  return {
    exists: true,
    listId: list.Id.toLowerCase(),
    listEtag: listResult.etag,
    titleEtag,
    configureDisplayName: list.Title !== schema.displayName,
    configureTitle,
    enableVersioning: schema.versioning && !list.EnableVersioning,
    configureSecurity: actualReadSecurity !== schema.readSecurity
      || actualWriteSecurity !== schema.writeSecurity,
    missingFields
  };
}

function publicPlan(schemas, inspections) {
  return deepFreeze({
    lists: schemas.map((schema, index) => ({
      key: schema.key,
      internalName: schema.internalName,
      displayName: schema.displayName,
      listId: inspections[index].listId,
      schemaVersion: schema.version,
      template: schema.template,
      createList: !inspections[index].exists,
      configureDisplayName: inspections[index].configureDisplayName,
      configureTitle: inspections[index].configureTitle,
      enableVersioning: inspections[index].enableVersioning,
      configureSecurity: inspections[index].configureSecurity,
      readSecurity: schema.readSecurity,
      writeSecurity: schema.writeSecurity,
      fieldsToCreate: inspections[index].missingFields.map((field) => ({
        internalName: field.internalName,
        displayName: field.displayName,
        type: field.type,
        indexed: field.indexed,
        unique: field.unique
      }))
    }))
  });
}

function hasChanges(plan) {
  return plan.lists.some((list) =>
    list.createList || list.configureDisplayName || list.configureTitle || list.enableVersioning
      || list.configureSecurity || list.fieldsToCreate.length
  );
}

async function applyList(client, schema, initialInspection) {
  let inspection = initialInspection;
  if (!inspection.exists) {
    await client.request("/_api/web/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json;odata=verbose" },
      body: {
        __metadata: { type: "SP.List" },
        BaseTemplate: schema.template,
        Description: schema.description,
        EnableVersioning: schema.versioning,
        ReadSecurity: schema.readSecurity,
        WriteSecurity: schema.writeSecurity,
        Title: schema.internalName
      }
    });
    inspection = await inspectList(client, schema);
  }
  const path = listPath(inspection.listId);

  if (inspection.configureDisplayName || inspection.enableVersioning || inspection.configureSecurity) {
    await client.request(path, {
      method: "MERGE",
      etag: inspection.listEtag,
      headers: { "Content-Type": "application/json;odata=verbose" },
      body: {
        __metadata: { type: "SP.List" },
        ...(inspection.configureDisplayName ? { Title: schema.displayName } : {}),
        ...(inspection.enableVersioning ? { EnableVersioning: true } : {}),
        ...(inspection.configureSecurity ? {
          ReadSecurity: schema.readSecurity,
          WriteSecurity: schema.writeSecurity
        } : {})
      }
    });
  }
  if (inspection.configureTitle) {
    await client.request(`${path}/fields/getbyinternalnameortitle('Title')`, {
      method: "MERGE",
      etag: inspection.titleEtag,
      allowWildcardEtag: inspection.titleEtag === "*",
      headers: { "Content-Type": "application/json;odata=verbose" },
      body: {
        __metadata: { type: "SP.FieldText" },
        Title: schema.titleField.displayName,
        Required: schema.titleField.required,
        Indexed: schema.titleField.indexed,
        EnforceUniqueValues: schema.titleField.unique
      }
    });
  }
  for (const field of inspection.missingFields) {
    await client.request(`${path}/fields/createfieldasxml`, {
      method: "POST",
      headers: { "Content-Type": "application/json;odata=verbose" },
      body: {
        parameters: {
          __metadata: { type: "SP.XmlSchemaFieldCreationInformation" },
          SchemaXml: fieldXml(field),
          Options: 12
        }
      }
    });
  }
}

export async function provisionLists({
  schemas,
  confirm,
  client,
  webUrl,
  fetchImpl
} = {}) {
  if (!Array.isArray(schemas) || !schemas.length) {
    throw new TypeError("schemas deve conter ao menos uma lista.");
  }
  if (typeof confirm !== "function") {
    throw provisioningError(
      "confirmation-required",
      "O provisionamento exige um callback de confirmação visível."
    );
  }
  const normalized = schemas.map(defineListSchema);
  if (new Set(normalized.map((schema) => schema.key)).size !== normalized.length
    || new Set(normalized.map((schema) => schema.internalName.toLowerCase())).size !== normalized.length) {
    throw new TypeError("schemas não pode conter listas duplicadas.");
  }

  const rest = client ?? createSharePointRestClient({ webUrl, fetchImpl });
  if (!rest || typeof rest.request !== "function") {
    throw new TypeError("client deve expor request(path, options).");
  }

  let inspections = [];
  for (const schema of normalized) inspections.push(await inspectList(rest, schema));
  const plan = publicPlan(normalized, inspections);
  const resolvedLists = () => normalized.map((schema, index) => ({
    key: schema.key,
    webUrl: rest.webUrl ?? webUrl ?? null,
    listId: inspections[index].listId
  }));
  if (!hasChanges(plan)) return deepFreeze({ status: "unchanged", plan, lists: resolvedLists() });
  if (await confirm(plan) !== true) return deepFreeze({ status: "cancelled", plan });

  for (let index = 0; index < normalized.length; index += 1) {
    await applyList(rest, normalized[index], inspections[index]);
  }

  inspections = [];
  for (const schema of normalized) inspections.push(await inspectList(rest, schema));
  const remaining = publicPlan(normalized, inspections);
  if (hasChanges(remaining)) {
    throw provisioningError(
      "verification-failed",
      "O provisionamento terminou com pendências."
    );
  }
  return deepFreeze({ status: "provisioned", plan, lists: resolvedLists() });
}
