import assert from "node:assert/strict";
import {
  CONFIGURATION_LIST_SCHEMA,
  ConfigurationProvisioningError,
  loadConfigurationItemForEdit,
  provisionConfigurationList,
  updateConfigurationItem
} from "../provisioning.js";

function makeResponse(status, value = {}, etag = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === "etag" ? etag : null },
    async json() {
      return value;
    }
  };
}

function completeFields() {
  return [{
    InternalName: "Title",
    StaticName: "Title",
    Title: "Chave",
    TypeAsString: "Text",
    Required: true,
    Indexed: true,
    EnforceUniqueValues: true,
    Choices: []
  }, ...CONFIGURATION_LIST_SCHEMA.fields.map((field) => ({
    InternalName: field.internalName,
    StaticName: field.internalName,
    Title: field.displayName,
    TypeAsString: field.type,
    Required: field.required,
    Indexed: Boolean(field.indexed),
    EnforceUniqueValues: false,
    Choices: field.choices ? [...field.choices] : []
  }))];
}

function createFakeSharePoint({
  exists = false,
  incompatibleField = null,
  complete = false,
  versioning = exists,
  globalExists = false
} = {}) {
  const state = {
    exists,
    versioning,
    globalExists,
    calls: [],
    writes: [],
    fields: complete ? completeFields() : exists ? [{
      InternalName: "Title",
      StaticName: "Title",
      Title: "Title",
      TypeAsString: "Text",
      Required: true,
      Indexed: false,
      EnforceUniqueValues: false,
      Choices: []
    }] : []
  };
  if (incompatibleField) state.fields.push(incompatibleField);

  const fetchImpl = async (url, options = {}) => {
    const method = options.method || "GET";
    state.calls.push({ url, options, method });
    if (method !== "GET" && !url.endsWith("/_api/contextinfo")) {
      state.writes.push({ url, options });
      assert.equal(options.headers["X-RequestDigest"], "digest-test");
      assert.notEqual(options.headers["If-Match"], "*");
    }

    if (url.endsWith("/_api/contextinfo") && method === "POST") {
      return makeResponse(200, { FormDigestValue: "digest-test" });
    }
    if (url.endsWith("/_api/web/lists") && method === "POST") {
      state.exists = true;
      state.versioning = true;
      state.fields = [{
        InternalName: "Title",
        StaticName: "Title",
        Title: "Title",
        TypeAsString: "Text",
        Required: true,
        Indexed: false,
        EnforceUniqueValues: false,
        Choices: []
      }];
      return makeResponse(201, { d: { Id: "list-id" } });
    }
    if (url.includes("/fields/createfieldasxml") && method === "POST") {
      const parameters = JSON.parse(options.body).parameters;
      assert.equal(parameters.Options, 12);
      const schema = parameters.SchemaXml;
      const attribute = (name) => schema.match(new RegExp(`(?:^|\\s)${name}='([^']+)'`))?.[1];
      const choices = [...schema.matchAll(/<CHOICE>([^<]+)<\/CHOICE>/g)].map((match) => match[1]);
      state.fields.push({
        InternalName: attribute("Name"),
        StaticName: attribute("StaticName"),
        Title: attribute("DisplayName"),
        TypeAsString: attribute("Type"),
        Required: attribute("Required") === "TRUE",
        Indexed: attribute("Indexed") === "TRUE",
        EnforceUniqueValues: false,
        Choices: choices
      });
      return makeResponse(201, {});
    }
    if (url.includes("/fields/getbyinternalnameortitle('Title')") && method === "POST") {
      const title = state.fields.find((field) => field.InternalName === "Title");
      Object.assign(title, {
        Title: "Chave",
        Required: true,
        Indexed: true,
        EnforceUniqueValues: true
      });
      return makeResponse(204, {});
    }
    if (url.includes("getbytitle('MSEConfiguracoes')") && method === "POST"
      && !url.includes("/items")) {
      state.versioning = true;
      return makeResponse(204, {});
    }
    if (url.includes("/items") && method === "POST") {
      state.globalExists = true;
      const body = JSON.parse(options.body);
      assert.equal(body.Title, "global");
      assert.equal(body.Escopo, "Global");
      assert.equal(body.__metadata.type, "SP.Data.MSEConfiguracoesListItem");
      return makeResponse(201, {});
    }

    if (!state.exists && url.includes("getbytitle('MSEConfiguracoes')")) {
      return makeResponse(404);
    }
    if (url.includes("/fields/getbyinternalnameortitle('Title')")) {
      const title = state.fields.find((field) => field.InternalName === "Title");
      return makeResponse(200, title, '"title-etag"');
    }
    if (url.includes("/fields?")) {
      return makeResponse(200, { value: state.fields });
    }
    if (url.includes("/items?")) {
      return makeResponse(200, { value: state.globalExists ? [{ Id: 1, Title: "global" }] : [] });
    }
    if (url.includes("getbytitle('MSEConfiguracoes')")) {
      return makeResponse(200, {
        Id: "list-id",
        Title: "MSEConfiguracoes",
        EnableVersioning: state.versioning,
        ListItemEntityTypeFullName: "SP.Data.MSEConfiguracoesListItem"
      }, '"list-etag"');
    }

    throw new Error(`Requisição não simulada: ${method} ${url}`);
  };

  return { fetchImpl, state };
}

assert.equal(CONFIGURATION_LIST_SCHEMA.version, 1);
assert.equal(CONFIGURATION_LIST_SCHEMA.fields.length, 7);

const cancelledServer = createFakeSharePoint();
let cancelledPlan;
const cancelled = await provisionConfigurationList({
  webUrl: "/sites/core-test",
  fetchImpl: cancelledServer.fetchImpl,
  confirm(plan) {
    cancelledPlan = plan;
    return false;
  }
});
assert.equal(cancelled.status, "cancelled");
assert.equal(cancelledPlan.createList, true);
assert.equal(cancelledPlan.fieldsToCreate.length, 7);
assert.equal(cancelledServer.state.writes.length, 0);

await assert.rejects(
  provisionConfigurationList({
    webUrl: "/sites/core-test",
    fetchImpl: cancelledServer.fetchImpl
  }),
  (error) => error instanceof ConfigurationProvisioningError
    && error.code === "confirmation-required"
);

const server = createFakeSharePoint();
const confirmedPlans = [];
const provisioned = await provisionConfigurationList({
  webUrl: "/sites/core-test",
  fetchImpl: server.fetchImpl,
  confirm(plan) {
    confirmedPlans.push(plan);
    return true;
  }
});
assert.equal(provisioned.status, "provisioned");
assert.equal(confirmedPlans.length, 1);
assert.equal(server.state.exists, true);
assert.equal(server.state.versioning, true);
assert.equal(server.state.globalExists, true);
assert.equal(server.state.fields.length, 8);
assert.equal(
  server.state.fields.find((field) => field.InternalName === "Title").EnforceUniqueValues,
  true
);

let unexpectedConfirmation = false;
const unchanged = await provisionConfigurationList({
  webUrl: "/sites/core-test",
  fetchImpl: server.fetchImpl,
  confirm() {
    unexpectedConfirmation = true;
    return true;
  }
});
assert.equal(unchanged.status, "unchanged");
assert.equal(unexpectedConfirmation, false);
assert.ok(Object.isFrozen(unchanged.plan));

const versioningServer = createFakeSharePoint({
  exists: true,
  complete: true,
  versioning: false,
  globalExists: true
});
const versioned = await provisionConfigurationList({
  webUrl: "/sites/core-test",
  fetchImpl: versioningServer.fetchImpl,
  confirm(plan) {
    assert.equal(plan.enableVersioning, true);
    assert.equal(plan.fieldsToCreate.length, 0);
    return true;
  }
});
assert.equal(versioned.status, "provisioned");
const versioningWrite = versioningServer.state.writes.find(({ options }) =>
  options.headers["X-HTTP-Method"] === "MERGE"
  && JSON.parse(options.body).EnableVersioning === true
);
assert.equal(versioningWrite.options.headers["If-Match"], '"list-etag"');

const conflictServer = createFakeSharePoint({
  exists: true,
  incompatibleField: {
    InternalName: "Escopo",
    StaticName: "Escopo",
    Title: "Escopo",
    TypeAsString: "Text",
    Required: true,
    Indexed: false,
    EnforceUniqueValues: false,
    Choices: []
  }
});
await assert.rejects(
  provisionConfigurationList({
    webUrl: "/sites/core-test",
    fetchImpl: conflictServer.fetchImpl,
    confirm: () => true
  }),
  (error) => error.code === "schema-conflict" && /Escopo/.test(error.message)
);
assert.equal(conflictServer.state.writes.length, 0);

const internalNameServer = createFakeSharePoint({
  exists: true,
  incompatibleField: {
    InternalName: "M_x00f3_dulo",
    StaticName: "Modulo",
    Title: "Módulo",
    TypeAsString: "Text",
    Required: false,
    Indexed: true,
    EnforceUniqueValues: false,
    Choices: []
  }
});
await assert.rejects(
  provisionConfigurationList({
    webUrl: "/sites/core-test",
    fetchImpl: internalNameServer.fetchImpl,
    confirm: () => true
  }),
  (error) => error.code === "schema-conflict" && /nome interno/.test(error.message)
);
assert.equal(internalNameServer.state.writes.length, 0);

function createItemEditor({ raceOnWrite = false } = {}) {
  const state = {
    etag: '"item-etag-1"',
    writes: 0,
    item: {
      __metadata: { type: "SP.Data.MSEConfiguracoesListItem" },
      Id: 1,
      Title: "global",
      Escopo: "Global",
      Modulo: null,
      Layout: "Contained",
      Tema: "default",
      ConfiguracaoJson: JSON.stringify({ pageSize: 20 }),
      VersaoConfiguracao: 1,
      Ativo: true
    }
  };
  const fetchImpl = async (url, options = {}) => {
    const method = options.method || "GET";
    if (url.endsWith("/_api/contextinfo")) {
      return makeResponse(200, { FormDigestValue: "digest-test" });
    }
    if (url.includes("/items(1)") && method === "GET") {
      return makeResponse(200, { d: { ...state.item } }, state.etag);
    }
    if (url.includes("/items(1)") && method === "POST") {
      state.writes += 1;
      assert.equal(options.headers["If-Match"], state.etag);
      assert.equal(options.headers["X-HTTP-Method"], "MERGE");
      assert.equal(options.headers["X-RequestDigest"], "digest-test");
      if (raceOnWrite) return makeResponse(412);
      Object.assign(state.item, JSON.parse(options.body));
      state.etag = '"item-etag-2"';
      return makeResponse(204);
    }
    throw new Error(`Requisição de edição não simulada: ${method} ${url}`);
  };
  return { fetchImpl, state };
}

const editor = createItemEditor();
const editable = await loadConfigurationItemForEdit({
  webUrl: "/sites/core-test",
  itemId: 1,
  fetchImpl: editor.fetchImpl
});
assert.equal(editable.etag, '"item-etag-1"');
assert.equal(editable.version, 1);
assert.equal(editable.configuration.pageSize, 20);
assert.ok(Object.isFrozen(editable));
assert.ok(Object.isFrozen(editable.configuration));

const edited = await updateConfigurationItem({
  webUrl: "/sites/core-test",
  itemId: 1,
  etag: editable.etag,
  changes: {
    layout: "FullBleed",
    configuration: { pageSize: 25 }
  },
  fetchImpl: editor.fetchImpl
});
assert.equal(edited.etag, '"item-etag-2"');
assert.equal(edited.layout, "FullBleed");
assert.equal(edited.configuration.pageSize, 25);
assert.equal(edited.version, 2);
assert.equal(editor.state.writes, 1);

await assert.rejects(
  updateConfigurationItem({
    webUrl: "/sites/core-test",
    itemId: 1,
    etag: editable.etag,
    changes: { active: false },
    fetchImpl: editor.fetchImpl
  }),
  (error) => error.code === "concurrency-conflict"
);
assert.equal(editor.state.writes, 1);

const racingEditor = createItemEditor({ raceOnWrite: true });
await assert.rejects(
  updateConfigurationItem({
    webUrl: "/sites/core-test",
    itemId: 1,
    etag: '"item-etag-1"',
    changes: { active: false },
    fetchImpl: racingEditor.fetchImpl
  }),
  (error) => error.code === "concurrency-conflict" && error.status === 412
);
assert.equal(racingEditor.state.writes, 1);

await assert.rejects(
  updateConfigurationItem({
    webUrl: "/sites/core-test",
    itemId: 1,
    etag: "*",
    changes: { active: false },
    fetchImpl: editor.fetchImpl
  }),
  (error) => error.code === "etag-required"
);

console.log("provisioning.test.js: verificações concluídas com sucesso.");
