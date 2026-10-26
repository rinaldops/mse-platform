// mse-platform/host-adapters/modern-script-editor/test/spmiddle-rest-adapter.test.js
//
// Teste de contrato de `createSpmiddleRestClient`: confirma que o client
// devolvido tem a MESMA forma externa que `core/rest.js#createSharePointRestClient`
// já fornece a `site-boot.js`/`kernel/*` (getListItems devolve um array
// plano de itens, não o envelope OData; getListItem/createListItem/
// updateListItem devolvem `{item, etag, status}`; deleteListItem devolve
// `{etag, status}`) — sem rede real, via um `fetchImpl` falso.

import assert from "node:assert/strict";
import { createSpmiddleRestClient } from "../spmiddle-rest-adapter.js";

const LIST_ID = "11111111-1111-4111-8111-111111111111";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() { return body; },
    async text() { return JSON.stringify(body); }
  };
}

function digestResponse() {
  return jsonResponse({ FormDigestValue: "digest-fake", FormDigestTimeoutSeconds: 1800 });
}

// --- getListItems: devolve um array plano (desembrulha @odata/value),
// mesmo contrato externo de client.getListItems(list, options) ------------

{
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith("/_api/contextinfo")) return digestResponse();
    if (url.includes(`lists(guid'${LIST_ID}')/items`)) {
      return jsonResponse({ value: [{ Id: 1, Title: "Artigo", Alias: "artigo" }] });
    }
    throw new Error(`requisição inesperada: ${url}`);
  };

  const client = createSpmiddleRestClient({ webUrl: "/sites/demo", fetchImpl });
  const items = await client.getListItems({ listId: LIST_ID }, { select: ["Id", "Title", "Alias"], top: 10 });

  assert.deepEqual(items, [{ Id: 1, Title: "Artigo", Alias: "artigo" }]);
  assert.ok(calls.some((url) => url.includes(`lists(guid'${LIST_ID}')/items`) && url.includes("%24select=Id%2CTitle%2CAlias")));
  console.log("spmiddle-rest-adapter.test.js: getListItems devolve array plano ok.");
}

// --- getListItems: list sem { listId } lança erro claro -------------------

{
  const client = createSpmiddleRestClient({ webUrl: "/sites/demo", fetchImpl: async () => jsonResponse({}) });
  await assert.rejects(() => client.getListItems("MSEMenu", {}), /listId/);
  console.log("spmiddle-rest-adapter.test.js: getListItems rejeita lista sem { listId } ok.");
}

// --- getListItem/createListItem/updateListItem/deleteListItem: shape
// { item, etag, status } / { etag, status } ---------------------------------

{
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith("/_api/contextinfo")) return digestResponse();
    if (options.method === "GET" && url.includes("/items(5)")) {
      return jsonResponse({ Id: 5, Title: "Item" });
    }
    if (options.method === "POST" && url.endsWith("/items") && !options.headers?.["X-HTTP-Method"]) {
      return jsonResponse({ Id: 6, Title: "Criado" });
    }
    if (options.headers?.["X-HTTP-Method"] === "MERGE") {
      return jsonResponse({ Id: 5, Title: "Atualizado" });
    }
    if (options.headers?.["X-HTTP-Method"] === "DELETE") {
      return jsonResponse(null, 204);
    }
    throw new Error(`requisição inesperada: ${url} (${options.method})`);
  };

  const client = createSpmiddleRestClient({ webUrl: "/sites/demo", fetchImpl });
  const list = { listId: LIST_ID };

  const got = await client.getListItem(list, 5, { select: ["Id", "Title"] });
  assert.deepEqual(got, { item: { Id: 5, Title: "Item" }, etag: null, status: 200 });

  const created = await client.createListItem(list, { Title: "Criado" });
  assert.deepEqual(created, { item: { Id: 6, Title: "Criado" }, etag: null, status: 200 });

  const updated = await client.updateListItem(list, 5, { Title: "Atualizado" }, { etag: '"1"' });
  assert.deepEqual(updated, { item: { Id: 5, Title: "Atualizado" }, etag: null, status: 200 });

  const deleted = await client.deleteListItem(list, 5, { etag: '"1"' });
  assert.deepEqual(deleted, { etag: null, status: 204 });

  console.log("spmiddle-rest-adapter.test.js: getListItem/createListItem/updateListItem/deleteListItem no shape esperado ok.");
}

// --- webUrl/request/getDigest: reaproveitados tal como o transporte do
// SPMIDDLE já fornece (sem wrapper) ------------------------------------------

{
  const fetchImpl = async (url) => {
    if (url.endsWith("/_api/contextinfo")) return digestResponse();
    return jsonResponse({ ok: true });
  };
  const client = createSpmiddleRestClient({ webUrl: "/sites/demo", fetchImpl });
  assert.equal(client.webUrl, "/sites/demo");
  assert.equal(typeof client.request, "function");
  assert.equal(await client.getDigest(), "digest-fake");
  console.log("spmiddle-rest-adapter.test.js: webUrl/request/getDigest expostos tal como o transporte do SPMIDDLE ok.");
}

console.log("spmiddle-rest-adapter.test.js: verificações concluídas com sucesso.");
