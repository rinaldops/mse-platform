const DEFAULT_LIST_TITLE = "MSEConfiguracoes";
const ADD_TO_ALL_CONTENT_TYPES_WITH_INTERNAL_NAME_HINT = 12;
const CONFIGURATION_FIELDS = "Id,Title,Escopo,Modulo,Layout,Tema,ConfiguracaoJson,VersaoConfiguracao,Ativo";
const CONFIGURATION_KEYS = new Set([
  "key", "scope", "module", "layout", "theme", "configuration", "active"
]);
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const CONFIGURATION_LIST_SCHEMA = Object.freeze({
  version: 1,
  title: Object.freeze({
    internalName: "Title",
    displayName: "Chave",
    type: "Text",
    required: true,
    indexed: true,
    unique: true
  }),
  fields: Object.freeze([
    Object.freeze({
      internalName: "Escopo",
      displayName: "Escopo",
      type: "Choice",
      required: true,
      choices: Object.freeze(["Global", "Instancia"]),
      schemaXml: "<Field Type='Choice' DisplayName='Escopo' Name='Escopo' StaticName='Escopo' Required='TRUE' Format='Dropdown'><CHOICES><CHOICE>Global</CHOICE><CHOICE>Instancia</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Modulo",
      displayName: "Módulo",
      type: "Text",
      required: false,
      indexed: true,
      schemaXml: "<Field Type='Text' DisplayName='Módulo' Name='Modulo' StaticName='Modulo' Required='FALSE' Indexed='TRUE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "Layout",
      displayName: "Layout",
      type: "Choice",
      required: true,
      choices: Object.freeze(["Herdar", "Contained", "FullBleed"]),
      schemaXml: "<Field Type='Choice' DisplayName='Layout' Name='Layout' StaticName='Layout' Required='TRUE' Format='Dropdown'><Default>Herdar</Default><CHOICES><CHOICE>Herdar</CHOICE><CHOICE>Contained</CHOICE><CHOICE>FullBleed</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Tema",
      displayName: "Tema",
      type: "Text",
      required: false,
      schemaXml: "<Field Type='Text' DisplayName='Tema' Name='Tema' StaticName='Tema' Required='FALSE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "ConfiguracaoJson",
      displayName: "Configuração JSON",
      type: "Note",
      required: false,
      schemaXml: "<Field Type='Note' DisplayName='Configuração JSON' Name='ConfiguracaoJson' StaticName='ConfiguracaoJson' Required='FALSE' RichText='FALSE' NumLines='8' />"
    }),
    Object.freeze({
      internalName: "VersaoConfiguracao",
      displayName: "Versão da configuração",
      type: "Number",
      required: true,
      schemaXml: "<Field Type='Number' DisplayName='Versão da configuração' Name='VersaoConfiguracao' StaticName='VersaoConfiguracao' Required='TRUE' Decimals='0' Min='1'><Default>1</Default></Field>"
    }),
    Object.freeze({
      internalName: "Ativo",
      displayName: "Ativo",
      type: "Boolean",
      required: true,
      indexed: true,
      schemaXml: "<Field Type='Boolean' DisplayName='Ativo' Name='Ativo' StaticName='Ativo' Required='TRUE' Indexed='TRUE'><Default>1</Default></Field>"
    })
  ])
});

export class ConfigurationProvisioningError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ConfigurationProvisioningError";
    this.code = code;
    if (details.cause) this.cause = details.cause;
    if (details.status) this.status = details.status;
  }
}

function provisioningError(code, message, details) {
  return new ConfigurationProvisioningError(code, message, details);
}

function normalizeWebUrl(webUrl) {
  const value = webUrl ?? globalThis._spPageContextInfo?.webServerRelativeUrl;
  if (typeof value !== "string" || value.trim() === "") {
    throw provisioningError(
      "context-unavailable",
      "Não foi possível identificar a URL do site SharePoint."
    );
  }

  const normalized = value.trim().replace(/\/+$/, "");
  return normalized === "" || normalized === "/" ? "" : normalized;
}

function normalizeListTitle(listTitle) {
  if (typeof listTitle !== "string" || listTitle.trim() === "") {
    throw new TypeError("listTitle deve ser um texto não vazio.");
  }
  return listTitle.trim();
}

function listPath(listTitle) {
  return `/_api/web/lists/getbytitle('${listTitle.replaceAll("'", "''")}')`;
}

function unwrap(payload) {
  return payload?.value ?? payload?.d?.results ?? payload?.d ?? payload;
}

async function readJson(response, context) {
  try {
    return await response.json();
  } catch (cause) {
    throw provisioningError(
      "invalid-response",
      `O SharePoint retornou uma resposta inválida ao ${context}.`,
      { cause }
    );
  }
}

function responseEtag(response, value) {
  return response.headers?.get?.("ETag")
    || value?.["@odata.etag"]
    || value?.__metadata?.etag
    || null;
}

async function fetchResponse(fetchImpl, url, options, context) {
  try {
    return await fetchImpl(url, options);
  } catch (cause) {
    throw provisioningError(
      "network-error",
      `Falha de rede ao ${context}.`,
      { cause }
    );
  }
}

function throwForResponse(response, context) {
  if (response.ok) return;
  if (response.status === 412) {
    throw provisioningError(
      "concurrency-conflict",
      "O recurso foi alterado por outra pessoa. Recarregue antes de salvar.",
      { status: response.status }
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw provisioningError(
      "access-denied",
      `O usuário atual não tem permissão para ${context}.`,
      { status: response.status }
    );
  }
  throw provisioningError(
    "request-failed",
    `Não foi possível ${context} (HTTP ${response.status}).`,
    { status: response.status }
  );
}

function fieldChoices(field) {
  const choices = field?.Choices?.results ?? field?.Choices;
  return Array.isArray(choices) ? choices : [];
}

function validateExistingField(field, expected, listTitle) {
  const conflicts = [];
  if (field.TypeAsString !== expected.type) {
    conflicts.push(`tipo ${field.TypeAsString || "desconhecido"}; esperado ${expected.type}`);
  }
  if (Boolean(field.Required) !== expected.required) {
    conflicts.push(`Required=${Boolean(field.Required)}; esperado ${expected.required}`);
  }
  if (expected.indexed && !field.Indexed) {
    conflicts.push("não está indexado");
  }
  if (expected.choices) {
    const actualChoices = fieldChoices(field);
    const missingChoices = expected.choices.filter((choice) => !actualChoices.includes(choice));
    if (missingChoices.length) conflicts.push(`opções ausentes: ${missingChoices.join(", ")}`);
  }

  if (conflicts.length) {
    throw provisioningError(
      "schema-conflict",
      `O campo ${expected.internalName} da lista ${listTitle} é incompatível: ${conflicts.join("; ")}.`
    );
  }
}

async function inspectList({ webUrl, listTitle, fetchImpl }) {
  const path = listPath(listTitle);
  const listResponse = await fetchResponse(
    fetchImpl,
    `${webUrl}${path}?$select=Id,Title,EnableVersioning,ListItemEntityTypeFullName`,
    { headers: { Accept: "application/json;odata=nometadata" } },
    `consultar a lista ${listTitle}`
  );

  if (listResponse.status === 404) {
    return {
      exists: false,
      list: null,
      listEtag: null,
      missingFields: [...CONFIGURATION_LIST_SCHEMA.fields],
      updateTitle: true,
      enableVersioning: true,
      seedGlobal: true
    };
  }
  throwForResponse(listResponse, `consultar a lista ${listTitle}`);

  const list = unwrap(await readJson(listResponse, `consultar a lista ${listTitle}`));
  if (!list?.Id || !list?.ListItemEntityTypeFullName) {
    throw provisioningError(
      "invalid-response",
      `A lista ${listTitle} não retornou seus metadados obrigatórios.`
    );
  }
  const listEtag = responseEtag(listResponse, list);
  if (!list.EnableVersioning && !listEtag) {
    throw provisioningError(
      "etag-unavailable",
      `O SharePoint não forneceu a ETag da lista ${listTitle}.`
    );
  }

  const fieldsResponse = await fetchResponse(
    fetchImpl,
    `${webUrl}${path}/fields?$select=InternalName,StaticName,Title,TypeAsString,Required,Indexed,EnforceUniqueValues,Choices`,
    { headers: { Accept: "application/json;odata=nometadata" } },
    `consultar o schema da lista ${listTitle}`
  );
  throwForResponse(fieldsResponse, `consultar o schema da lista ${listTitle}`);
  const fields = unwrap(await readJson(fieldsResponse, `consultar o schema da lista ${listTitle}`));
  if (!Array.isArray(fields)) {
    throw provisioningError("invalid-response", `O schema da lista ${listTitle} é inválido.`);
  }

  const byName = new Map(fields.map((field) => [field.InternalName, field]));
  const title = byName.get("Title");
  if (!title || title.TypeAsString !== "Text") {
    throw provisioningError("schema-conflict", `O campo Title da lista ${listTitle} é incompatível.`);
  }

  const missingFields = [];
  for (const expected of CONFIGURATION_LIST_SCHEMA.fields) {
    const field = byName.get(expected.internalName);
    const internalNameMismatch = fields.find((candidate) =>
      candidate.StaticName === expected.internalName
      && candidate.InternalName !== expected.internalName
    );
    if (internalNameMismatch) {
      throw provisioningError(
        "schema-conflict",
        `O campo ${expected.internalName} foi criado com o nome interno ${internalNameMismatch.InternalName}.`
      );
    }
    if (!field) missingFields.push(expected);
    else validateExistingField(field, expected, listTitle);
  }

  const updateTitle = title.Title !== CONFIGURATION_LIST_SCHEMA.title.displayName
    || !title.Required
    || !title.Indexed
    || !title.EnforceUniqueValues;

  const globalResponse = await fetchResponse(
    fetchImpl,
    `${webUrl}${path}/items?$select=Id,Title&$top=5000`,
    { headers: { Accept: "application/json;odata=nometadata" } },
    `consultar o registro global da lista ${listTitle}`
  );
  throwForResponse(globalResponse, `consultar o registro global da lista ${listTitle}`);
  const globalItems = unwrap(await readJson(globalResponse, `consultar o registro global da lista ${listTitle}`));
  if (!Array.isArray(globalItems)) {
    throw provisioningError("invalid-response", `A lista ${listTitle} retornou itens inválidos.`);
  }
  const titles = new Set();
  for (const item of globalItems) {
    const titleKey = String(item.Title || "").trim().toLowerCase();
    if (!titleKey) continue;
    if (titles.has(titleKey)) {
      throw provisioningError(
        "schema-conflict",
        `A lista ${listTitle} contém chaves duplicadas e não pode habilitar unicidade.`
      );
    }
    titles.add(titleKey);
  }

  return {
    exists: true,
    list,
    listEtag,
    missingFields,
    updateTitle,
    enableVersioning: !list.EnableVersioning,
    seedGlobal: !titles.has("global")
  };
}

function publicPlan(inspection, listTitle) {
  return Object.freeze({
    schemaVersion: CONFIGURATION_LIST_SCHEMA.version,
    listTitle,
    createList: !inspection.exists,
    fieldsToCreate: Object.freeze(inspection.missingFields.map((field) => Object.freeze({
      internalName: field.internalName,
      displayName: field.displayName,
      type: field.type,
      required: field.required,
      indexed: Boolean(field.indexed)
    }))),
    configureTitle: inspection.updateTitle,
    enableVersioning: inspection.enableVersioning,
    insertGlobalRecord: inspection.seedGlobal
  });
}

function hasChanges(plan) {
  return plan.createList
    || plan.fieldsToCreate.length > 0
    || plan.configureTitle
    || plan.enableVersioning
    || plan.insertGlobalRecord;
}

async function getDigest({ webUrl, fetchImpl }) {
  const response = await fetchResponse(
    fetchImpl,
    `${webUrl}/_api/contextinfo`,
    {
      method: "POST",
      headers: { Accept: "application/json;odata=nometadata" }
    },
    "obter o request digest"
  );
  throwForResponse(response, "obter o request digest");
  const value = unwrap(await readJson(response, "obter o request digest"));
  const digest = value?.FormDigestValue ?? value?.GetContextWebInformation?.FormDigestValue;
  if (!digest) {
    throw provisioningError("invalid-response", "O SharePoint não retornou um request digest.");
  }
  return digest;
}

async function writeJson({ fetchImpl, url, digest, body, context, headers = {} }) {
  const response = await fetchResponse(
    fetchImpl,
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        "X-RequestDigest": digest,
        ...headers
      },
      body: JSON.stringify(body)
    },
    context
  );
  throwForResponse(response, context);
  return response;
}

async function createList({ webUrl, listTitle, fetchImpl, digest }) {
  await writeJson({
    fetchImpl,
    url: `${webUrl}/_api/web/lists`,
    digest,
    context: `criar a lista ${listTitle}`,
    body: {
      __metadata: { type: "SP.List" },
      BaseTemplate: 100,
      Description: "Configurações compartilhadas dos módulos Modern Script Editor.",
      EnableVersioning: true,
      Title: listTitle
    }
  });
}

async function createFields({ webUrl, listTitle, fields, fetchImpl, digest }) {
  const path = listPath(listTitle);
  for (const field of fields) {
    await writeJson({
      fetchImpl,
      url: `${webUrl}${path}/fields/createfieldasxml`,
      digest,
      context: `criar o campo ${field.internalName} na lista ${listTitle}`,
      body: {
        parameters: {
          __metadata: { type: "SP.XmlSchemaFieldCreationInformation" },
          SchemaXml: field.schemaXml,
          Options: ADD_TO_ALL_CONTENT_TYPES_WITH_INTERNAL_NAME_HINT
        }
      }
    });
  }
}

async function configureTitle({ webUrl, listTitle, fetchImpl, digest }) {
  await writeJson({
    fetchImpl,
    url: `${webUrl}${listPath(listTitle)}/fields/getbyinternalnameortitle('Title')`,
    digest,
    context: `configurar o campo Title da lista ${listTitle}`,
    headers: { "X-HTTP-Method": "MERGE" },
    body: {
      __metadata: { type: "SP.FieldText" },
      Title: CONFIGURATION_LIST_SCHEMA.title.displayName,
      Required: true,
      Indexed: true,
      EnforceUniqueValues: true
    }
  });
}

async function enableVersioning({ webUrl, listTitle, fetchImpl, digest, etag }) {
  if (!etag) {
    throw provisioningError(
      "etag-unavailable",
      `O SharePoint não forneceu a ETag da lista ${listTitle}.`
    );
  }
  await writeJson({
    fetchImpl,
    url: `${webUrl}${listPath(listTitle)}`,
    digest,
    context: `habilitar o versionamento da lista ${listTitle}`,
    headers: { "If-Match": etag, "X-HTTP-Method": "MERGE" },
    body: { __metadata: { type: "SP.List" }, EnableVersioning: true }
  });
}

async function insertGlobal({ webUrl, listTitle, itemType, fetchImpl, digest }) {
  await writeJson({
    fetchImpl,
    url: `${webUrl}${listPath(listTitle)}/items`,
    digest,
    context: `inserir o registro global na lista ${listTitle}`,
    body: {
      __metadata: { type: itemType },
      Title: "global",
      Escopo: "Global",
      Layout: "Contained",
      Tema: "default",
      ConfiguracaoJson: JSON.stringify({
        theme: {
          tokens: {
            fontFamily: "Segoe UI, Arial, sans-serif",
            fontSizeBody: "1rem",
            space3: "1rem",
            radius: "0.5rem"
          }
        }
      }),
      VersaoConfiguracao: 1,
      Ativo: true
    }
  });
}

function validateName(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(value)) {
    throw provisioningError("invalid-item", `${label} inválido.`);
  }
  return value;
}

function normalizeConfiguration(value) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch (cause) {
    throw provisioningError("invalid-item", "A configuração deve ser um objeto JSON.", { cause });
  }
  if (!json || json.length > 100000) {
    throw provisioningError("invalid-item", "A configuração JSON está vazia ou excede 100.000 caracteres.");
  }

  const cloned = JSON.parse(json);
  if (!cloned || Array.isArray(cloned) || typeof cloned !== "object") {
    throw provisioningError("invalid-item", "A configuração deve ser um objeto JSON.");
  }
  const pending = [cloned];
  while (pending.length) {
    const current = pending.pop();
    for (const [key, child] of Object.entries(current)) {
      if (FORBIDDEN_JSON_KEYS.has(key)) {
        throw provisioningError("invalid-item", `Chave JSON proibida: ${key}.`);
      }
      if (child && typeof child === "object") pending.push(child);
    }
  }
  return cloned;
}

function validateEditableItem(item) {
  const normalized = {
    ...item,
    key: validateName(item.key, "Chave"),
    scope: String(item.scope || ""),
    layout: String(item.layout || ""),
    theme: item.theme ? validateName(item.theme, "Tema") : null,
    configuration: normalizeConfiguration(item.configuration)
  };

  if (!new Set(["Global", "Instancia"]).has(normalized.scope)) {
    throw provisioningError("invalid-item", "Escopo deve ser Global ou Instancia.");
  }
  if (!new Set(["Herdar", "Contained", "FullBleed"]).has(normalized.layout)) {
    throw provisioningError("invalid-item", "Layout deve ser Herdar, Contained ou FullBleed.");
  }
  if (typeof normalized.active !== "boolean") {
    throw provisioningError("invalid-item", "Ativo deve ser booleano.");
  }
  if (normalized.scope === "Global") {
    if (normalized.key.toLowerCase() !== "global") {
      throw provisioningError("invalid-item", "O registro Global deve usar a chave global.");
    }
    normalized.module = null;
  } else {
    if (normalized.key.toLowerCase() === "global") {
      throw provisioningError("invalid-item", "A chave global é reservada.");
    }
    normalized.module = validateName(normalized.module, "Módulo");
  }
  return normalized;
}

function freezeEditableItem(item) {
  const pending = [item];
  while (pending.length) {
    const current = pending.pop();
    Object.values(current).forEach((value) => {
      if (value && typeof value === "object" && !Object.isFrozen(value)) pending.push(value);
    });
    Object.freeze(current);
  }
  return item;
}

async function readConfigurationItem({ webUrl, listTitle, itemId, fetchImpl }) {
  const response = await fetchResponse(
    fetchImpl,
    `${webUrl}${listPath(listTitle)}/items(${itemId})?$select=${CONFIGURATION_FIELDS}`,
    { headers: { Accept: "application/json;odata=verbose" } },
    `consultar o registro ${itemId} da lista ${listTitle}`
  );
  if (response.status === 404) {
    throw provisioningError("item-not-found", `O registro ${itemId} não existe na lista ${listTitle}.`);
  }
  throwForResponse(response, `consultar o registro ${itemId} da lista ${listTitle}`);
  const value = unwrap(await readJson(response, `consultar o registro ${itemId} da lista ${listTitle}`));
  const etag = responseEtag(response, value);
  if (!value?.Id || !etag || !value?.__metadata?.type) {
    throw provisioningError("invalid-response", `O registro ${itemId} não retornou metadados de edição.`);
  }

  let configuration;
  try {
    configuration = JSON.parse(value.ConfiguracaoJson || "{}");
  } catch (cause) {
    throw provisioningError("invalid-item", `O registro ${itemId} contém JSON inválido.`, { cause });
  }
  const record = validateEditableItem({
    id: value.Id,
    etag,
    key: value.Title,
    scope: value.Escopo,
    module: value.Modulo || null,
    layout: value.Layout,
    theme: value.Tema || null,
    configuration,
    version: value.VersaoConfiguracao,
    active: Boolean(value.Ativo)
  });
  if (!Number.isInteger(record.version) || record.version < 1) {
    throw provisioningError("invalid-item", `O registro ${itemId} possui versão inválida.`);
  }
  return { record: freezeEditableItem(record), itemType: value.__metadata.type };
}

export async function loadConfigurationItemForEdit({
  webUrl,
  listTitle = DEFAULT_LIST_TITLE,
  itemId,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  const normalizedTitle = normalizeListTitle(listTitle);
  if (!Number.isInteger(itemId) || itemId < 1) throw new TypeError("itemId deve ser um inteiro positivo.");
  if (typeof fetchImpl !== "function") {
    throw provisioningError("fetch-unavailable", "A API fetch não está disponível.");
  }
  return (await readConfigurationItem({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    itemId,
    fetchImpl
  })).record;
}

export async function updateConfigurationItem({
  webUrl,
  listTitle = DEFAULT_LIST_TITLE,
  itemId,
  etag,
  changes,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  const normalizedTitle = normalizeListTitle(listTitle);
  if (!Number.isInteger(itemId) || itemId < 1) throw new TypeError("itemId deve ser um inteiro positivo.");
  const normalizedEtag = typeof etag === "string" ? etag.trim() : "";
  if (!normalizedEtag || normalizedEtag === "*") {
    throw provisioningError("etag-required", "A ETag exata do registro é obrigatória.");
  }
  if (!changes || Array.isArray(changes) || typeof changes !== "object") {
    throw new TypeError("changes deve ser um objeto.");
  }
  const changeKeys = Object.keys(changes);
  if (!changeKeys.length || changeKeys.some((key) => !CONFIGURATION_KEYS.has(key))) {
    throw provisioningError("invalid-item", "A alteração contém propriedades vazias ou desconhecidas.");
  }
  if (typeof fetchImpl !== "function") {
    throw provisioningError("fetch-unavailable", "A API fetch não está disponível.");
  }

  const current = await readConfigurationItem({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    itemId,
    fetchImpl
  });
  if (current.record.etag !== normalizedEtag) {
    throw provisioningError(
      "concurrency-conflict",
      "O registro foi alterado por outra pessoa. Recarregue antes de salvar."
    );
  }

  const updated = validateEditableItem({ ...current.record, ...changes });
  const digest = await getDigest({ webUrl: normalizedWebUrl, fetchImpl });
  await writeJson({
    fetchImpl,
    url: `${normalizedWebUrl}${listPath(normalizedTitle)}/items(${itemId})`,
    digest,
    context: `atualizar o registro ${itemId} da lista ${normalizedTitle}`,
    headers: { "If-Match": normalizedEtag, "X-HTTP-Method": "MERGE" },
    body: {
      __metadata: { type: current.itemType },
      Title: updated.key,
      Escopo: updated.scope,
      Modulo: updated.module,
      Layout: updated.layout,
      Tema: updated.theme,
      ConfiguracaoJson: JSON.stringify(updated.configuration),
      VersaoConfiguracao: current.record.version + 1,
      Ativo: updated.active
    }
  });

  return loadConfigurationItemForEdit({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    itemId,
    fetchImpl
  });
}

/**
 * Inspeciona, apresenta o plano ao callback de confirmação e só então grava.
 * O callback deve exibir o plano ao usuário autorizado e retornar exatamente true.
 */
export async function provisionConfigurationList({
  webUrl,
  listTitle = DEFAULT_LIST_TITLE,
  fetchImpl = globalThis.fetch,
  confirm
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  const normalizedTitle = normalizeListTitle(listTitle);
  if (typeof fetchImpl !== "function") {
    throw provisioningError("fetch-unavailable", "A API fetch não está disponível.");
  }
  if (typeof confirm !== "function") {
    throw provisioningError(
      "confirmation-required",
      "O provisionamento exige um callback de confirmação visível."
    );
  }

  let inspection = await inspectList({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    fetchImpl
  });
  const plan = publicPlan(inspection, normalizedTitle);

  if (!hasChanges(plan)) return Object.freeze({ status: "unchanged", plan });
  if (await confirm(plan) !== true) return Object.freeze({ status: "cancelled", plan });

  const digest = await getDigest({ webUrl: normalizedWebUrl, fetchImpl });
  if (plan.createList) {
    await createList({
      webUrl: normalizedWebUrl,
      listTitle: normalizedTitle,
      fetchImpl,
      digest
    });
    inspection = await inspectList({
      webUrl: normalizedWebUrl,
      listTitle: normalizedTitle,
      fetchImpl
    });
  }

  if (inspection.enableVersioning) {
    await enableVersioning({
      webUrl: normalizedWebUrl,
      listTitle: normalizedTitle,
      fetchImpl,
      digest,
      etag: inspection.listEtag
    });
  }
  await createFields({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    fields: inspection.missingFields,
    fetchImpl,
    digest
  });
  if (inspection.missingFields.length) {
    inspection = await inspectList({
      webUrl: normalizedWebUrl,
      listTitle: normalizedTitle,
      fetchImpl
    });
  }
  if (inspection.updateTitle) {
    await configureTitle({
      webUrl: normalizedWebUrl,
      listTitle: normalizedTitle,
      fetchImpl,
      digest
    });
  }
  if (inspection.seedGlobal) {
    await insertGlobal({
      webUrl: normalizedWebUrl,
      listTitle: normalizedTitle,
      itemType: inspection.list.ListItemEntityTypeFullName,
      fetchImpl,
      digest
    });
  }

  const verification = await inspectList({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    fetchImpl
  });
  const remaining = publicPlan(verification, normalizedTitle);
  if (hasChanges(remaining)) {
    throw provisioningError(
      "verification-failed",
      `O provisionamento da lista ${normalizedTitle} terminou com pendências.`
    );
  }

  return Object.freeze({ status: "provisioned", plan });
}
