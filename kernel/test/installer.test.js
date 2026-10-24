import assert from "node:assert/strict";
import { createKernelInstaller, KERNEL_LIST_SCHEMAS } from "../installer.js";
import { ListProvisioningError } from "../../core/list-provisioning.js";

/**
 * Fake client em memória para `core/list-provisioning.js`, no mesmo padrão
 * de `core/test/list-provisioning.test.js`/`core/test/installer.test.js`:
 * simula o catálogo de listas, campos e escritas do SharePoint sem rede
 * real. Reaproveitado por `kernel/test/seed.test.js` via `createFakeClient`
 * exportado deste módulo? Não — cada arquivo de teste mantém sua própria
 * cópia local, pelo mesmo motivo dos testes de `core/`: evitar acoplamento
 * entre suítes de teste.
 */
function xmlAttribute(xml, name) {
  return xml.match(new RegExp(`(?:^|\\s)${name}='([^']*)'`))?.[1];
}

function createFakeClient() {
  const state = { lists: new Map(), writes: [] };

  const request = async (path, options = {}) => {
    const method = options.method ?? "GET";

    if (path.startsWith("/_api/web/lists?$select=")) {
      return {
        data: { value: [...state.lists.values()].map((list) => ({
          Id: list.id,
          BaseTemplate: list.template,
          RootFolder: { Name: list.internalName, ServerRelativeUrl: `/Lists/${list.internalName}` }
        })) },
        etag: null,
        status: 200
      };
    }

    if (path === "/_api/web/lists" && method === "POST") {
      const body = options.body;
      const id = `00000000-0000-4000-8000-${String(state.lists.size + 1).padStart(12, "0")}`;
      state.writes.push({ path, options });
      state.lists.set(body.Title, {
        id,
        internalName: body.Title,
        displayName: body.Title,
        template: body.BaseTemplate,
        versioning: Boolean(body.EnableVersioning),
        readSecurity: body.ReadSecurity ?? 1,
        writeSecurity: body.WriteSecurity ?? 1,
        etag: '"list-1"',
        fields: [{
          InternalName: "Title",
          StaticName: "Title",
          Title: "Title",
          TypeAsString: "Text",
          Required: false,
          Indexed: false,
          EnforceUniqueValues: false,
          Choices: []
        }]
      });
      return { data: { Id: id }, etag: '"list-1"', status: 201 };
    }

    const listId = path.match(/lists\(guid'([^']+)'\)/)?.[1];
    const list = [...state.lists.values()].find((candidate) => candidate.id === listId);
    if (!list) throw Object.assign(new Error("ausente"), { code: "not-found", status: 404 });

    if (path.includes("/fields/createfieldasxml") && method === "POST") {
      state.writes.push({ path, options });
      const xml = options.body.parameters.SchemaXml;
      const choices = [...xml.matchAll(/<CHOICE>([^<]+)<\/CHOICE>/g)].map((match) => match[1]);
      list.fields.push({
        InternalName: xmlAttribute(xml, "Name"),
        StaticName: xmlAttribute(xml, "StaticName"),
        Title: xmlAttribute(xml, "DisplayName"),
        TypeAsString: xmlAttribute(xml, "Type"),
        Required: xmlAttribute(xml, "Required") === "TRUE",
        Indexed: xmlAttribute(xml, "Indexed") === "TRUE",
        EnforceUniqueValues: xmlAttribute(xml, "EnforceUniqueValues") === "TRUE",
        Choices: choices,
        "@odata.etag": '"field-1"'
      });
      return { data: {}, etag: null, status: 201 };
    }
    if (path.includes("/fields/getbyinternalnameortitle('Title')") && method === "MERGE") {
      state.writes.push({ path, options });
      const field = list.fields.find((candidate) => candidate.InternalName === "Title");
      Object.assign(field, {
        Title: options.body.Title,
        Required: options.body.Required,
        Indexed: options.body.Indexed,
        EnforceUniqueValues: options.body.EnforceUniqueValues
      });
      return { data: null, etag: null, status: 204 };
    }
    if (path.includes("/fields/getbyinternalnameortitle('Title')") && method === "GET") {
      return { data: { InternalName: "Title" }, etag: null, status: 200 };
    }
    if (path.includes("/fields/getbyinternalnameortitle('") && method === "MERGE") {
      state.writes.push({ path, options });
      const internalName = path.match(/getbyinternalnameortitle\('([^']+)'\)/)?.[1];
      Object.assign(list.fields.find((candidate) => candidate.InternalName === internalName), options.body);
      return { data: null, etag: null, status: 204 };
    }
    if (method === "MERGE") {
      state.writes.push({ path, options });
      if (options.body.Title !== undefined) list.displayName = options.body.Title;
      if (options.body.EnableVersioning !== undefined) list.versioning = options.body.EnableVersioning;
      if (options.body.ReadSecurity !== undefined) list.readSecurity = options.body.ReadSecurity;
      if (options.body.WriteSecurity !== undefined) list.writeSecurity = options.body.WriteSecurity;
      return { data: null, etag: null, status: 204 };
    }
    if (path.includes("/fields?")) {
      return { data: { value: list.fields }, etag: null, status: 200 };
    }
    return {
      data: {
        Id: list.id,
        Title: list.displayName,
        BaseTemplate: list.template,
        EnableVersioning: list.versioning,
        ReadSecurity: list.readSecurity,
        WriteSecurity: list.writeSecurity,
        RootFolder: { Name: list.internalName }
      },
      etag: list.etag,
      status: 200
    };
  };

  return { client: { request }, state };
}

// KERNEL_LIST_SCHEMAS deve conter exatamente as 7 listas fixas do kernel.
// Fase 3 da normalização Joomla!: MSEMenu continua com esse internalName
// (campos novos em inglês acrescentados in-place), as outras 4 passam a
// ser as listas novas em inglês. MSETemplateStyles (≈ #__template_styles)
// acrescentada junto com o mecanismo de Templates instaláveis/fallback.
// MSECategories (≈ #__categories) acrescentada junto com o componente
// com_categories (components/com_categories). MSETags (≈ #__tags)
// acrescentada junto com o componente com_tags. MSEMedia (biblioteca de
// documentos do component com_media) acrescentada junto com o
// gerenciador de mídia do Administrator.
assert.equal(KERNEL_LIST_SCHEMAS.length, 9);
assert.deepEqual(
  KERNEL_LIST_SCHEMAS.map((schema) => schema.internalName),
  ["MSEMenuTypes", "MSEMenu", "MSEExtensions", "MSEModules", "MSEModulesMenu", "MSETemplateStyles", "MSECategories", "MSETags", "MSEMedia"]
);
assert.ok(Object.isFrozen(KERNEL_LIST_SCHEMAS));

// inspect() detecta as 9 listas ausentes quando o site não tem nenhuma delas.
{
  const { client } = createFakeClient();
  const installer = createKernelInstaller({ client });
  const inspection = await installer.inspect();
  assert.equal(inspection.status, "changes-required");
  assert.equal(inspection.plan.lists.length, 9);
  assert.equal(inspection.plan.lists.every((list) => list.createList), true);
}

// apply(confirm) sem confirmação (confirm nega) não escreve nada.
{
  const { client, state } = createFakeClient();
  const installer = createKernelInstaller({ client });
  const cancelled = await installer.apply(() => false);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(state.writes.length, 0);
  assert.equal(state.lists.size, 0);
}

// apply(confirm) com confirm ausente lança erro de confirmação exigida, sem escrever nada.
{
  const { client, state } = createFakeClient();
  const installer = createKernelInstaller({ client });
  await assert.rejects(
    installer.apply(),
    (error) => error instanceof ListProvisioningError && error.code === "confirmation-required"
  );
  assert.equal(state.writes.length, 0);
}

// apply(confirm) autorizado cria as 9 listas + campos; verify() confirma estado final.
{
  const { client, state } = createFakeClient();
  const installer = createKernelInstaller({ client });

  const applied = await installer.apply(() => true);
  assert.equal(applied.status, "provisioned");
  assert.equal(state.lists.size, 9);
  assert.equal(state.lists.get("MSEMenuTypes").fields.some((field) => field.InternalName === "Key"), true);
  assert.equal(state.lists.get("MSEMenu").fields.some((field) => field.InternalName === "Alias"), true);
  assert.equal(state.lists.get("MSEMenu").fields.some((field) => field.InternalName === "Component"), true);
  assert.equal(state.lists.get("MSEExtensions").fields.some((field) => field.InternalName === "Element"), true);
  assert.equal(state.lists.get("MSEModules").fields.some((field) => field.InternalName === "Module"), true);
  assert.equal(state.lists.get("MSEModulesMenu").fields.some((field) => field.InternalName === "ModuleId"), true);
  assert.equal(state.lists.get("MSETemplateStyles").fields.some((field) => field.InternalName === "Template"), true);
  assert.equal(state.lists.get("MSECategories").fields.some((field) => field.InternalName === "Alias"), true);
  assert.equal(state.lists.get("MSETags").fields.some((field) => field.InternalName === "Alias"), true);
  assert.equal(state.lists.get("MSEMedia").fields.some((field) => field.InternalName === "AltText"), true);

  const verified = await installer.verify();
  assert.equal(verified.status, "ready");
}

// Cenário de erro: schema com conflito (campo existente de tipo incompatível)
// propaga erro sem escrita parcial que corrompa o estado.
{
  const { client, state } = createFakeClient();
  state.lists.set("MSEMenuTypes", {
    id: "00000000-0000-4000-8000-000000000099",
    internalName: "MSEMenuTypes",
    displayName: "Tipos de menu",
    template: 100,
    versioning: true,
    readSecurity: 1,
    writeSecurity: 1,
    etag: '"list-conflict"',
    fields: [{
      InternalName: "Title",
      StaticName: "Title",
      Title: "Título",
      TypeAsString: "Text",
      Required: true,
      Indexed: false,
      EnforceUniqueValues: false,
      Choices: []
    }, {
      InternalName: "Key",
      StaticName: "Key",
      Title: "Key",
      TypeAsString: "Number", // conflita com o schema (Text)
      Required: true,
      Indexed: true,
      EnforceUniqueValues: false,
      Choices: []
    }]
  });
  const installer = createKernelInstaller({ client });
  await assert.rejects(
    installer.apply(() => true),
    (error) => error instanceof ListProvisioningError
      && error.code === "schema-conflict"
      && error.fieldName === "Key"
  );
  assert.equal(state.writes.length, 0);
  // Nenhuma das outras 4 listas foi criada: inspectSchemas falha antes do confirm.
  assert.equal(state.lists.size, 1);
}

console.log("installer.test.js (kernel): verificações concluídas com sucesso.");
