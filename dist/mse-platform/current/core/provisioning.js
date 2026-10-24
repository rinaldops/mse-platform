const DEFAULT_LIST_TITLE = "MSEConfiguracoes";
const ADD_TO_ALL_CONTENT_TYPES_WITH_INTERNAL_NAME_HINT = 12;
// Fase 3b da normalização Joomla! (23/10/2026, ver
// docs/AUDITORIA-JOOMLA-PENTE-FINO.md §2.8 e docs/CONVENCAO-JOOMLA.md §5):
// os 8 campos com consumidor real confirmado em
// core/configuration-store.js#loadPublished foram traduzidos para inglês,
// acrescentados lado a lado com os PT (mesmo padrão já aplicado a
// kernel/schemas/mse-menu.js nas Fases 3/4 — os PT ficam DEPRECATED, vivos,
// não lidos por código novo). Os 4 campos sem consumidor confirmado
// (`TipoInstancia`/`VersaoConfiguracao`/`VersaoSettings`/`VersaoModulo`)
// permanecem em PT, fora desta rodada.
const CONFIGURATION_FIELDS = "Id,Title,Scope,Module,TipoInstancia,Layout,Theme,ConfigurationJson,VersaoConfiguracao,VersaoSettings,VersaoModulo,State,Active,ExtensionElement";
const CONFIGURATION_KEYS = new Set([
  "key", "scope", "module", "view", "layout", "theme", "configuration", "settingsVersion",
  "moduleVersion", "state", "active", "extensionElement"
]);
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const CONFIGURATION_LIST_SCHEMA = Object.freeze({
  version: 4,
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
      choices: Object.freeze(["Global", "Instancia", "Extensao"]),
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é `Scope`
      // (abaixo). Mantido vivo, não lido por código novo — ver
      // core/configuration-store.js#loadPublished.
      schemaXml: "<Field Type='Choice' DisplayName='Escopo' Name='Escopo' StaticName='Escopo' Required='TRUE' Format='Dropdown'><CHOICES><CHOICE>Global</CHOICE><CHOICE>Instancia</CHOICE><CHOICE>Extensao</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Modulo",
      displayName: "Módulo",
      type: "Text",
      required: false,
      indexed: true,
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é `Module`
      // (abaixo).
      schemaXml: "<Field Type='Text' DisplayName='Módulo' Name='Modulo' StaticName='Modulo' Required='FALSE' Indexed='TRUE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "TipoInstancia",
      displayName: "Tipo de instância",
      type: "Choice",
      required: true,
      choices: Object.freeze(["Full", "Summary"]),
      // Sem consumidor confirmado em core/configuration-store.js nesta
      // rodada — permanece em PT, fora da Fase 3b (ver
      // docs/AUDITORIA-JOOMLA-PENTE-FINO.md §2.8).
      schemaXml: "<Field Type='Choice' DisplayName='Tipo de instância' Name='TipoInstancia' StaticName='TipoInstancia' Required='TRUE' Format='Dropdown'><Default>Full</Default><CHOICES><CHOICE>Full</CHOICE><CHOICE>Summary</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Layout",
      displayName: "Layout",
      type: "Choice",
      required: true,
      // "Inherit" acrescentada (Fase 3b, 23/10/2026) ao lado de "Herdar"
      // (equivalente PT) — campo já era neutro em nome, só a choice PT
      // (`Herdar`) fica obsoleta; código novo grava/lê "Inherit".
      choices: Object.freeze(["Herdar", "Contained", "FullBleed", "Inherit"]),
      schemaXml: "<Field Type='Choice' DisplayName='Layout' Name='Layout' StaticName='Layout' Required='TRUE' Format='Dropdown'><Default>Herdar</Default><CHOICES><CHOICE>Herdar</CHOICE><CHOICE>Contained</CHOICE><CHOICE>FullBleed</CHOICE><CHOICE>Inherit</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Tema",
      displayName: "Tema",
      type: "Text",
      required: false,
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é `Theme`
      // (abaixo).
      schemaXml: "<Field Type='Text' DisplayName='Tema' Name='Tema' StaticName='Tema' Required='FALSE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "ConfiguracaoJson",
      displayName: "Configuração JSON",
      type: "Note",
      required: false,
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é
      // `ConfigurationJson` (abaixo).
      schemaXml: "<Field Type='Note' DisplayName='Configuração JSON' Name='ConfiguracaoJson' StaticName='ConfiguracaoJson' Required='FALSE' RichText='FALSE' NumLines='8' />"
    }),
    Object.freeze({
      internalName: "VersaoConfiguracao",
      displayName: "Versão da configuração",
      type: "Number",
      required: true,
      // Sem consumidor confirmado em core/configuration-store.js nesta
      // rodada — permanece em PT, fora da Fase 3b.
      schemaXml: "<Field Type='Number' DisplayName='Versão da configuração' Name='VersaoConfiguracao' StaticName='VersaoConfiguracao' Required='TRUE' Decimals='0' Min='1'><Default>1</Default></Field>"
    }),
    Object.freeze({
      internalName: "VersaoSettings",
      displayName: "Versão dos settings",
      type: "Number",
      required: true,
      // Sem consumidor confirmado em core/configuration-store.js nesta
      // rodada — permanece em PT, fora da Fase 3b.
      schemaXml: "<Field Type='Number' DisplayName='Versão dos settings' Name='VersaoSettings' StaticName='VersaoSettings' Required='TRUE' Decimals='0' Min='1'><Default>1</Default></Field>"
    }),
    Object.freeze({
      internalName: "VersaoModulo",
      displayName: "Versão do módulo",
      type: "Text",
      required: false,
      // Sem consumidor confirmado em core/configuration-store.js nesta
      // rodada — permanece em PT, fora da Fase 3b.
      schemaXml: "<Field Type='Text' DisplayName='Versão do módulo' Name='VersaoModulo' StaticName='VersaoModulo' Required='FALSE' MaxLength='64' />"
    }),
    Object.freeze({
      internalName: "Estado",
      displayName: "Estado",
      type: "Choice",
      required: true,
      choices: Object.freeze(["Rascunho", "Publicado"]),
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é `State`
      // (abaixo).
      schemaXml: "<Field Type='Choice' DisplayName='Estado' Name='Estado' StaticName='Estado' Required='TRUE' Format='Dropdown'><Default>Publicado</Default><CHOICES><CHOICE>Rascunho</CHOICE><CHOICE>Publicado</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Ativo",
      displayName: "Ativo",
      type: "Boolean",
      required: true,
      indexed: true,
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é `Active`
      // (abaixo).
      schemaXml: "<Field Type='Boolean' DisplayName='Ativo' Name='Ativo' StaticName='Ativo' Required='TRUE' Indexed='TRUE'><Default>1</Default></Field>"
    }),
    Object.freeze({
      internalName: "ExtensaoElemento",
      displayName: "Elemento da extensão",
      type: "Text",
      required: false,
      indexed: true,
      // Identificador técnico da extensão (ex.: "forum"), preenchido apenas
      // quando Escopo === "Extensao"; vazio/nulo nos demais escopos. Segue a
      // mesma convenção de `MSE_EXTENSOES_SCHEMA.Elemento`
      // (kernel/schemas/mse-extensoes.js).
      // DEPRECATED (Fase 3b, 23/10/2026): equivalente em inglês é
      // `ExtensionElement` (abaixo).
      schemaXml: "<Field Type='Text' DisplayName='Elemento da extensão' Name='ExtensaoElemento' StaticName='ExtensaoElemento' Required='FALSE' Indexed='TRUE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "Scope",
      displayName: "Scope",
      type: "Choice",
      required: false,
      indexed: true,
      choices: Object.freeze(["Global", "Instance", "Extension"]),
      // ≈ Escopo (inglês; Global/Instancia/Extensao→Global/Instance/Extension).
      // Opcional nesta fase (campo novo, preenchido via UPDATE nos itens
      // reais já existentes pela migração) — mesmo princípio de
      // kernel/schemas/mse-menu.js#MenuType.
      schemaXml: "<Field Type='Choice' DisplayName='Scope' Name='Scope' StaticName='Scope' Required='FALSE' Indexed='TRUE' Format='Dropdown'><CHOICES><CHOICE>Global</CHOICE><CHOICE>Instance</CHOICE><CHOICE>Extension</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "Module",
      displayName: "Module",
      type: "Text",
      required: false,
      indexed: true,
      // ≈ Modulo (inglês).
      schemaXml: "<Field Type='Text' DisplayName='Module' Name='Module' StaticName='Module' Required='FALSE' Indexed='TRUE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "Theme",
      displayName: "Theme",
      type: "Text",
      required: false,
      // ≈ Tema (inglês).
      schemaXml: "<Field Type='Text' DisplayName='Theme' Name='Theme' StaticName='Theme' Required='FALSE' MaxLength='128' />"
    }),
    Object.freeze({
      internalName: "ConfigurationJson",
      displayName: "Configuration JSON",
      type: "Note",
      required: false,
      // ≈ ConfiguracaoJson (inglês).
      schemaXml: "<Field Type='Note' DisplayName='Configuration JSON' Name='ConfigurationJson' StaticName='ConfigurationJson' Required='FALSE' RichText='FALSE' NumLines='8' />"
    }),
    Object.freeze({
      internalName: "Active",
      displayName: "Active",
      type: "Boolean",
      required: false,
      indexed: true,
      // ≈ Ativo (inglês).
      schemaXml: "<Field Type='Boolean' DisplayName='Active' Name='Active' StaticName='Active' Required='FALSE' Indexed='TRUE'><Default>1</Default></Field>"
    }),
    Object.freeze({
      internalName: "State",
      displayName: "State",
      type: "Choice",
      required: false,
      choices: Object.freeze(["Draft", "Published"]),
      // ≈ Estado (inglês; Rascunho/Publicado→Draft/Published).
      schemaXml: "<Field Type='Choice' DisplayName='State' Name='State' StaticName='State' Required='FALSE' Format='Dropdown'><CHOICES><CHOICE>Draft</CHOICE><CHOICE>Published</CHOICE></CHOICES></Field>"
    }),
    Object.freeze({
      internalName: "ExtensionElement",
      displayName: "Extension element",
      type: "Text",
      required: false,
      indexed: true,
      // ≈ ExtensaoElemento (inglês).
      schemaXml: "<Field Type='Text' DisplayName='Extension element' Name='ExtensionElement' StaticName='ExtensionElement' Required='FALSE' Indexed='TRUE' MaxLength='128' />"
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
      TipoInstancia: "Full",
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
      VersaoSettings: 1,
      VersaoModulo: null,
      Estado: "Publicado",
      Ativo: true,
      // Campos EN (Fase 3b, 23/10/2026) gravados lado a lado com os PT
      // acima, já com o mesmo conteúdo — ver
      // core/configuration-store.js#loadPublished (único leitor).
      Scope: "Global",
      Theme: "default",
      ConfigurationJson: JSON.stringify({
        theme: {
          tokens: {
            fontFamily: "Segoe UI, Arial, sans-serif",
            fontSizeBody: "1rem",
            space3: "1rem",
            radius: "0.5rem"
          }
        }
      }),
      State: "Published",
      Active: true
    }
  });
}

function validateName(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(value)) {
    throw provisioningError("invalid-item", `${label} inválido.`);
  }
  return value;
}

// Fase 3b (23/10/2026): o schema real ainda exige o campo PT `Escopo`
// (Choice Required=TRUE, choices em PT) e `Estado` (idem) — só os campos EN
// `Scope`/`State` usam o vocabulário em inglês. As duas gravações lado a
// lado (ver createConfigurationItem/updateConfigurationItem) precisam do
// valor em CADA vocabulário; normalized.scope/normalized.state (vindos de
// validateEditableItem) já estão em inglês, então estas tabelas convertem
// de volta para PT só para a gravação do campo legado.
const SCOPE_EN_TO_PT = Object.freeze({ Global: "Global", Instance: "Instancia", Extension: "Extensao" });
const STATE_EN_TO_PT = Object.freeze({ Draft: "Rascunho", Published: "Publicado" });
function scopePt(scopeEn) { return SCOPE_EN_TO_PT[scopeEn] ?? scopeEn; }
function statePt(stateEn) { return STATE_EN_TO_PT[stateEn] ?? stateEn; }

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
    view: String(item.view || "Full"),
    layout: String(item.layout || ""),
    theme: item.theme ? validateName(item.theme, "Tema") : null,
    configuration: normalizeConfiguration(item.configuration),
    settingsVersion: item.settingsVersion ?? 1,
    moduleVersion: item.moduleVersion ?? null,
    // Vocabulário em inglês (Fase 3b, 23/10/2026) — equivalente aos valores
    // gravados em Scope/State (core/configuration-store.js#loadPublished é o
    // único leitor real); ver docs/AUDITORIA-JOOMLA-PENTE-FINO.md §2.8.
    state: String(item.state || "Published")
  };

  if (!new Set(["Global", "Instance", "Extension"]).has(normalized.scope)) {
    throw provisioningError("invalid-item", "Escopo deve ser Global, Instance ou Extension.");
  }
  if (!new Set(["Herdar", "Contained", "FullBleed", "Inherit"]).has(normalized.layout)) {
    throw provisioningError("invalid-item", "Layout deve ser Inherit, Contained ou FullBleed.");
  }
  if (typeof normalized.active !== "boolean") {
    throw provisioningError("invalid-item", "Ativo deve ser booleano.");
  }
  if (!new Set(["Full", "Summary"]).has(normalized.view)) {
    throw provisioningError("invalid-item", "Tipo de instância deve ser Full ou Summary.");
  }
  if (!Number.isInteger(normalized.settingsVersion) || normalized.settingsVersion < 1) {
    throw provisioningError("invalid-item", "Versão dos settings deve ser um inteiro positivo.");
  }
  if (normalized.moduleVersion !== null
    && (typeof normalized.moduleVersion !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalized.moduleVersion))) {
    throw provisioningError("invalid-item", "Versão do módulo deve usar SemVer.");
  }
  if (!new Set(["Draft", "Published"]).has(normalized.state)) {
    throw provisioningError("invalid-item", "Estado deve ser Draft ou Published.");
  }
  if (normalized.scope === "Global") {
    if (normalized.key.toLowerCase() !== "global") {
      throw provisioningError("invalid-item", "O registro Global deve usar a chave global.");
    }
    normalized.module = null;
    normalized.extensionElement = null;
  } else if (normalized.scope === "Extension") {
    if (normalized.key.toLowerCase() === "global") {
      throw provisioningError("invalid-item", "A chave global é reservada.");
    }
    normalized.module = null;
    normalized.extensionElement = validateName(normalized.extensionElement, "Elemento da extensão");
  } else {
    if (normalized.key.toLowerCase() === "global") {
      throw provisioningError("invalid-item", "A chave global é reservada.");
    }
    normalized.module = validateName(normalized.module, "Módulo");
    normalized.extensionElement = null;
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
    configuration = JSON.parse(value.ConfigurationJson || "{}");
  } catch (cause) {
    throw provisioningError("invalid-item", `O registro ${itemId} contém JSON inválido.`, { cause });
  }
  // Fase 3b (23/10/2026): mapeia a partir dos campos EN, únicos lidos por
  // código novo — ver CONFIGURATION_FIELDS/core/configuration-store.js.
  const record = validateEditableItem({
    id: value.Id,
    etag,
    key: value.Title,
    scope: value.Scope,
    module: value.Module || null,
    extensionElement: value.ExtensionElement || null,
    view: value.TipoInstancia || "Full",
    layout: value.Layout,
    theme: value.Theme || null,
    configuration,
    settingsVersion: value.VersaoSettings || 1,
    moduleVersion: value.VersaoModulo || null,
    state: value.State || "Published",
    version: value.VersaoConfiguracao,
    active: Boolean(value.Active)
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

export async function listConfigurationItems({
  webUrl,
  listTitle = DEFAULT_LIST_TITLE,
  module,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  const normalizedTitle = normalizeListTitle(listTitle);
  if (typeof fetchImpl !== "function") {
    throw provisioningError("fetch-unavailable", "A API fetch não está disponível.");
  }
  const moduleFilter = module
    ? `&$filter=Module eq '${validateName(module, "Módulo").replaceAll("'", "''")}'`
    : "";
  const response = await fetchResponse(
    fetchImpl,
    `${normalizedWebUrl}${listPath(normalizedTitle)}/items?$select=${CONFIGURATION_FIELDS}${moduleFilter}&$orderby=Title`,
    { headers: { Accept: "application/json;odata=nometadata" } },
    `listar configurações da lista ${normalizedTitle}`
  );
  throwForResponse(response, `listar configurações da lista ${normalizedTitle}`);
  const items = unwrap(await readJson(response, `listar configurações da lista ${normalizedTitle}`));
  if (!Array.isArray(items)) {
    throw provisioningError("invalid-response", `A lista ${normalizedTitle} retornou itens inválidos.`);
  }
  return Object.freeze(items.map((item) => Object.freeze({
    id: item.Id,
    key: item.Title,
    scope: item.Scope,
    module: item.Module || null,
    extensionElement: item.ExtensionElement || null,
    view: item.TipoInstancia || "Full",
    layout: item.Layout,
    theme: item.Theme || null,
    version: item.VersaoConfiguracao,
    settingsVersion: item.VersaoSettings || 1,
    moduleVersion: item.VersaoModulo || null,
    state: item.State || "Published",
    active: Boolean(item.Active)
  })));
}

export async function createConfigurationItem({
  webUrl,
  listTitle = DEFAULT_LIST_TITLE,
  item,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedWebUrl = normalizeWebUrl(webUrl);
  const normalizedTitle = normalizeListTitle(listTitle);
  if (typeof fetchImpl !== "function") {
    throw provisioningError("fetch-unavailable", "A API fetch não está disponível.");
  }
  const normalized = validateEditableItem(item);
  const listResponse = await fetchResponse(
    fetchImpl,
    `${normalizedWebUrl}${listPath(normalizedTitle)}?$select=ListItemEntityTypeFullName`,
    { headers: { Accept: "application/json;odata=nometadata" } },
    `consultar o tipo de item da lista ${normalizedTitle}`
  );
  throwForResponse(listResponse, `consultar o tipo de item da lista ${normalizedTitle}`);
  const list = unwrap(await readJson(listResponse, `consultar o tipo de item da lista ${normalizedTitle}`));
  if (!list?.ListItemEntityTypeFullName) {
    throw provisioningError("invalid-response", `A lista ${normalizedTitle} não informou o tipo de item.`);
  }
  const digest = await getDigest({ webUrl: normalizedWebUrl, fetchImpl });
  const response = await writeJson({
    fetchImpl,
    url: `${normalizedWebUrl}${listPath(normalizedTitle)}/items`,
    digest,
    context: `criar a configuração ${normalized.key}`,
    body: {
      __metadata: { type: list.ListItemEntityTypeFullName },
      Title: normalized.key,
      // PT (ainda Required=TRUE no schema real) e EN (Fase 3b, lido por
      // core/configuration-store.js) gravados lado a lado — mesmo padrão de
      // insertGlobal().
      Escopo: scopePt(normalized.scope),
      Modulo: normalized.module,
      ExtensaoElemento: normalized.extensionElement,
      TipoInstancia: normalized.view,
      Layout: normalized.layout,
      Tema: normalized.theme,
      ConfiguracaoJson: JSON.stringify(normalized.configuration),
      VersaoConfiguracao: 1,
      VersaoSettings: normalized.settingsVersion,
      VersaoModulo: normalized.moduleVersion,
      Estado: statePt(normalized.state),
      Ativo: normalized.active,
      Scope: normalized.scope,
      Module: normalized.module,
      ExtensionElement: normalized.extensionElement,
      Theme: normalized.theme,
      ConfigurationJson: JSON.stringify(normalized.configuration),
      State: normalized.state,
      Active: normalized.active
    }
  });
  const created = unwrap(await readJson(response, `criar a configuração ${normalized.key}`));
  const itemId = Number(created?.Id);
  if (!Number.isInteger(itemId) || itemId < 1) {
    throw provisioningError("invalid-response", "O SharePoint não informou o ID da configuração criada.");
  }
  return loadConfigurationItemForEdit({
    webUrl: normalizedWebUrl,
    listTitle: normalizedTitle,
    itemId,
    fetchImpl
  });
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
      // PT (ainda Required=TRUE no schema real) e EN (Fase 3b, lido por
      // core/configuration-store.js) gravados lado a lado.
      Escopo: scopePt(updated.scope),
      Modulo: updated.module,
      ExtensaoElemento: updated.extensionElement,
      TipoInstancia: updated.view,
      Layout: updated.layout,
      Tema: updated.theme,
      ConfiguracaoJson: JSON.stringify(updated.configuration),
      VersaoConfiguracao: current.record.version + 1,
      VersaoSettings: updated.settingsVersion,
      VersaoModulo: updated.moduleVersion,
      Estado: statePt(updated.state),
      Ativo: updated.active,
      Scope: updated.scope,
      Module: updated.module,
      ExtensionElement: updated.extensionElement,
      Theme: updated.theme,
      ConfigurationJson: JSON.stringify(updated.configuration),
      State: updated.state,
      Active: updated.active
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
