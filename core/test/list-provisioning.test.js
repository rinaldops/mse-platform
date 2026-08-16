import assert from "node:assert/strict";
import {
  ListProvisioningError,
  defineListSchema,
  provisionLists
} from "../list-provisioning.js";

const schemas = [
  {
    key: "module-items",
    internalName: "ModuloItens",
    displayName: "Módulo — Itens",
    description: "Itens do módulo de teste.",
    version: 1,
    readSecurity: 1,
    writeSecurity: 2,
    titleField: { displayName: "Título", required: true, indexed: true },
    fields: [
      {
        internalName: "Chave",
        displayName: "Chave",
        type: "Text",
        required: true,
        indexed: true,
        unique: true,
        maxLength: 128
      },
      {
        internalName: "Status",
        displayName: "Status",
        type: "Choice",
        required: true,
        indexed: true,
        choices: ["Ativo", "Arquivado"],
        defaultValue: "Ativo"
      },
      {
        internalName: "Conteudo",
        displayName: "Conteúdo",
        type: "Note",
        richText: true
      },
      {
        internalName: "Ativo",
        displayName: "Ativo",
        type: "Boolean",
        indexed: true,
        defaultValue: true
      }
    ]
  },
  {
    key: "module-media",
    internalName: "ModuloMidia",
    displayName: "Módulo — Mídia",
    template: 101,
    titleField: { displayName: "Título", required: false },
    fields: [{ internalName: "ItemId", displayName: "Item", type: "Number", indexed: true }]
  }
];

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
          RootFolder: { Name: list.internalName }
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
      assert.equal(options.body.parameters.Options, 12);
      return { data: {}, etag: null, status: 201 };
    }
    if (path.includes("/fields/getbyinternalnameortitle('Title')") && method === "MERGE") {
      state.writes.push({ path, options });
      assert.equal(options.etag, "*");
      assert.equal(options.allowWildcardEtag, true);
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
      assert.equal(options.headers.Accept, "application/json;odata=verbose");
      return {
        data: { InternalName: "Title" },
        etag: null,
        status: 200
      };
    }
    if (method === "MERGE") {
      state.writes.push({ path, options });
      assert.equal(options.etag, list.etag);
      if (options.body.Title !== undefined) list.displayName = options.body.Title;
      if (options.body.EnableVersioning !== undefined) {
        list.versioning = options.body.EnableVersioning;
      }
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

const normalized = defineListSchema(schemas[0]);
assert.ok(Object.isFrozen(normalized));
assert.ok(Object.isFrozen(normalized.fields));
assert.equal(normalized.fields[0].unique, true);
assert.throws(
  () => defineListSchema({
    key: "invalid-list",
    internalName: "ListaInvalida",
    displayName: "Inválida",
    fields: [{ internalName: "Detalhes", displayName: "Detalhes", type: "Note", indexed: true }]
  }),
  /não aceita índice/
);
assert.throws(
  () => defineListSchema({
    key: "invalid-list",
    internalName: "ListaInvalida",
    displayName: "Inválida",
    fields: [{
      internalName: "Ativo",
      displayName: "Ativo",
      type: "Boolean",
      indexed: true,
      unique: true
    }]
  }),
  /para ser único/
);
assert.throws(
  () => defineListSchema({
    key: "invalid-library",
    internalName: "BibliotecaInvalida",
    displayName: "Biblioteca inválida",
    template: 101,
    writeSecurity: 2
  }),
  /biblioteca.*1\/1/
);

const cancelledServer = createFakeClient();
let cancelledPlan;
const cancelled = await provisionLists({
  schemas,
  client: cancelledServer.client,
  confirm(plan) {
    cancelledPlan = plan;
    return false;
  }
});
assert.equal(cancelled.status, "cancelled");
assert.equal(cancelledPlan.lists.length, 2);
assert.equal(cancelledPlan.lists[0].createList, true);
assert.equal(cancelledPlan.lists[0].configureSecurity, true);
assert.equal(cancelledPlan.lists[0].writeSecurity, 2);
assert.ok(Object.isFrozen(cancelledPlan));
assert.equal(cancelledServer.state.writes.length, 0);

await assert.rejects(
  provisionLists({ schemas, client: cancelledServer.client }),
  (error) => error instanceof ListProvisioningError && error.code === "confirmation-required"
);

const server = createFakeClient();
const provisioned = await provisionLists({
  schemas,
  client: server.client,
  confirm: () => true
});
assert.equal(provisioned.status, "provisioned");
assert.equal(provisioned.lists[0].key, "module-items");
assert.match(provisioned.lists[0].listId, /^[0-9a-f-]{36}$/);
assert.equal(server.state.lists.size, 2);
assert.equal(server.state.lists.get("ModuloItens").template, 100);
assert.equal(server.state.lists.get("ModuloItens").displayName, "Módulo — Itens");
assert.equal(server.state.lists.get("ModuloItens").internalName, "ModuloItens");
assert.equal(server.state.lists.get("ModuloMidia").template, 101);
assert.equal(server.state.lists.get("ModuloItens").versioning, true);
assert.equal(server.state.lists.get("ModuloItens").writeSecurity, 2);
assert.equal(server.state.lists.get("ModuloItens").fields.length, 5);
assert.equal(
  server.state.lists.get("ModuloItens").fields.find((field) => field.InternalName === "Chave")
    .EnforceUniqueValues,
  true
);

let repeatedConfirmation = false;
const unchanged = await provisionLists({
  schemas,
  client: server.client,
  confirm() {
    repeatedConfirmation = true;
    return true;
  }
});
assert.equal(unchanged.status, "unchanged");
assert.equal(unchanged.lists[1].key, "module-media");
assert.equal(repeatedConfirmation, false);

const conflictServer = createFakeClient();
conflictServer.state.lists.set("ModuloItens", {
  id: "00000000-0000-4000-8000-000000000010",
  internalName: "ModuloItens",
  displayName: "Módulo — Itens",
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
    Indexed: true,
    EnforceUniqueValues: false,
    Choices: [],
    "@odata.etag": '"title-conflict"'
  }, {
    InternalName: "Chave",
    StaticName: "Chave",
    Title: "Chave",
    TypeAsString: "Number",
    Required: true,
    Indexed: true,
    EnforceUniqueValues: true,
    Choices: []
  }]
});
await assert.rejects(
  provisionLists({ schemas: [schemas[0]], client: conflictServer.client, confirm: () => true }),
  (error) => error.code === "schema-conflict" && error.fieldName === "Chave"
);
assert.equal(conflictServer.state.writes.length, 0);

const securityServer = createFakeClient();
securityServer.state.lists.set("ModuloItens", {
  id: "00000000-0000-4000-8000-000000000011",
  internalName: "ModuloItens",
  displayName: "Módulo — Itens",
  template: 100,
  versioning: true,
  readSecurity: 1,
  writeSecurity: 2,
  etag: '"list-security"',
  fields: []
});
await assert.rejects(
  provisionLists({
    schemas: [{ ...schemas[0], writeSecurity: 1 }],
    client: securityServer.client,
    confirm: () => true
  }),
  (error) => error.code === "schema-conflict" && /segurança mais restritiva/.test(error.message)
);
assert.equal(securityServer.state.writes.length, 0);

await assert.rejects(
  provisionLists({
    schemas: [{
      ...schemas[0],
      listId: "550e8400-e29b-41d4-a716-446655440000"
    }],
    client: createFakeClient().client,
    confirm: () => true
  }),
  (error) => error.code === "list-id-not-found"
);

console.log("list-provisioning.test.js: verificações concluídas com sucesso.");
