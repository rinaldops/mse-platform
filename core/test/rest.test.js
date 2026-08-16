import assert from "node:assert/strict";
import {
  SharePointRestError,
  createSharePointRestClient
} from "../rest.js";

function response(status, data = null, headers = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => normalized.get(name.toLowerCase()) ?? null },
    async json() {
      return data;
    }
  };
}

let releaseFirst;
const firstResponse = new Promise((resolve) => releaseFirst = resolve);
let deduplicatedCalls = 0;
const deduplicatedClient = createSharePointRestClient({
  webUrl: "/teams/core-test/",
  fetchImpl: async (url, options) => {
    deduplicatedCalls += 1;
    assert.equal(url, "/teams/core-test/_api/web?$select=Title");
    assert.equal(options.method, "GET");
    return firstResponse;
  }
});
assert.throws(
  () => createSharePointRestClient({ webUrl: "https://example.com/teams/core-test" }),
  /server-relative/
);
const simultaneousA = deduplicatedClient.request("/_api/web?$select=Title");
const simultaneousB = deduplicatedClient.request("/_api/web?$select=Title");
releaseFirst(response(200, { Title: "Core Test" }, { ETag: '"web-1"' }));
const [deduplicatedResult, deduplicatedResultB] = await Promise.all([
  simultaneousA,
  simultaneousB
]);
assert.equal(deduplicatedCalls, 1);
assert.equal(deduplicatedResult.data.Title, "Core Test");
assert.equal(deduplicatedResultB.data.Title, "Core Test");
assert.equal(deduplicatedResult.etag, '"web-1"');
assert.equal(deduplicatedClient.webUrl, "/teams/core-test");

await assert.rejects(
  deduplicatedClient.request("/teams/outro/_api/web"),
  /API REST do site atual/
);
await assert.rejects(
  deduplicatedClient.request("/_api/web", { method: "PATCH" }),
  /method deve ser/
);

const pageCalls = [];
const pagedClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  fetchImpl: async (url) => {
    pageCalls.push(url);
    if (pageCalls.length === 1) {
      return response(200, {
        value: [{ Id: 1 }],
        "@odata.nextLink": "https://contoso.sharepoint.com/teams/core-test/_api/page-2"
      });
    }
    return response(200, { value: [{ Id: 2 }] });
  }
});
assert.deepEqual(
  await pagedClient.getAll("/_api/web/lists/getbytitle('Topicos')/items?$select=Id"),
  [{ Id: 1 }, { Id: 2 }]
);
assert.equal(pageCalls[1], "/teams/core-test/_api/page-2");

const singlePage = await pagedClient.getListItemPage("Topicos", { select: ["Id"], top: 1 });
assert.deepEqual(singlePage.items, [{ Id: 2 }]);
assert.equal(singlePage.next, null);

let listItemsUrl;
const listClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  fetchImpl: async (url) => {
    listItemsUrl = url;
    return response(200, { value: [] });
  }
});
await listClient.getListItems("Fórum d'Ajuda", {
  select: ["Id", "Title", "Author/Title"],
  expand: "Author",
  filter: "Status eq 'Aberto'",
  orderBy: "Modified desc",
  top: 25
});
assert.match(listItemsUrl, /getbytitle\('Fórum d''Ajuda'\)/);
assert.match(listItemsUrl, /\$select=Id,Title,Author%2FTitle/);
assert.match(listItemsUrl, /\$top=25/);
assert.match(listItemsUrl, /\$filter=Status%20eq%20'Aberto'/);
await listClient.getListItems({ listId: "550E8400-E29B-41D4-A716-446655440000" }, {
  select: ["Id"]
});
assert.match(listItemsUrl, /lists\(guid'550e8400-e29b-41d4-a716-446655440000'\)/);
assert.throws(
  () => listClient.getListItems("Topicos", { select: ["*"] }),
  /nomes internos/
);

const waits = [];
let throttledCalls = 0;
const retryingClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  sleepImpl: async (milliseconds) => waits.push(milliseconds),
  fetchImpl: async () => {
    throttledCalls += 1;
    return throttledCalls === 1
      ? response(429, {}, { "Retry-After": "2" })
      : response(200, { value: [] });
  }
});
await retryingClient.request("/_api/web/lists?$select=Id");
assert.equal(throttledCalls, 2);
assert.deepEqual(waits, [2000]);

const exhaustedClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  maxRetries: 1,
  sleepImpl: async () => {},
  fetchImpl: async () => response(503, {}, { "Retry-After": "3" })
});
await assert.rejects(
  exhaustedClient.request("/_api/web?$select=Id"),
  (error) => error instanceof SharePointRestError
    && error.code === "throttled"
    && error.status === 503
    && error.retryAfterMs === 3000
);

let currentTime = 1000;
let digestCalls = 0;
const writes = [];
const writingClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  nowImpl: () => currentTime,
  fetchImpl: async (url, options) => {
    if (url.endsWith("/_api/contextinfo")) {
      digestCalls += 1;
      return response(200, {
        FormDigestValue: `digest-${digestCalls}`,
        FormDigestTimeoutSeconds: 120
      });
    }
    writes.push({ url, options });
    return response(204);
  }
});
await writingClient.request("/_api/web/lists/getbytitle('Topicos')/items(1)", {
  method: "MERGE",
  etag: '"item-1"',
  body: { Title: "Atualizado" }
});
await writingClient.request("/_api/web/lists/getbytitle('Topicos')/items", {
  method: "POST",
  body: { Title: "Novo" }
});
assert.equal(digestCalls, 1);
assert.equal(writes[0].options.method, "POST");
assert.equal(writes[0].options.headers["X-HTTP-Method"], "MERGE");
assert.equal(writes[0].options.headers["If-Match"], '"item-1"');
assert.equal(writes[0].options.headers["X-RequestDigest"], "digest-1");
assert.equal(writes[0].options.body, JSON.stringify({ Title: "Atualizado" }));
assert.equal(writes[1].options.headers["X-RequestDigest"], "digest-1");

const crudCalls = [];
const crudClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  fetchImpl: async (url, options) => {
    if (url.endsWith("/_api/contextinfo")) {
      return response(200, { FormDigestValue: "crud-digest", FormDigestTimeoutSeconds: 120 });
    }
    crudCalls.push({ url, options });
    if (options.method === "GET") return response(200, { Id: 7, Title: "Novo" }, { ETag: '"item-7"' });
    if (options.headers["X-HTTP-Method"] === "DELETE") return response(204);
    if (options.headers["X-HTTP-Method"] === "MERGE") return response(204, null, { ETag: '"item-8"' });
    return response(201, { Id: 7, Title: "Novo" }, { ETag: '"item-7"' });
  }
});
const createdItem = await crudClient.createListItem("Topicos", { Title: "Novo" });
assert.equal(createdItem.item.Id, 7);
assert.equal(createdItem.etag, '"item-7"');
const loadedItem = await crudClient.getListItem("Topicos", 7, { select: ["Id", "Title"] });
assert.equal(loadedItem.item.Title, "Novo");
await crudClient.updateListItem("Topicos", 7, { Title: "Atualizado" }, { etag: '"item-7"' });
await crudClient.deleteListItem("Topicos", 7, { etag: '"item-8"' });
assert.match(crudCalls[0].url, /getbytitle\('Topicos'\)\/items$/);
assert.match(crudCalls[1].url, /items\(7\)\?\$select=Id,Title$/);
assert.equal(crudCalls[2].options.headers["X-HTTP-Method"], "MERGE");
assert.equal(crudCalls[3].options.headers["X-HTTP-Method"], "DELETE");
await assert.rejects(crudClient.createListItem("Topicos", {}), /objeto não vazio|nomes internos/);
await assert.rejects(
  crudClient.updateListItem("Topicos", 7, { Title: "Sem ETag" }),
  (error) => error.code === "etag-required"
);

const emptySuccessClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  fetchImpl: async (url) => {
    if (url.endsWith("/_api/contextinfo")) {
      return response(200, { FormDigestValue: "digest", FormDigestTimeoutSeconds: 120 });
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      async text() { return ""; }
    };
  }
});
const emptyDelete = await emptySuccessClient.request(
  "/_api/web/lists/getbytitle('Topicos')/items(1)",
  { method: "DELETE", etag: '"item-1"' }
);
assert.equal(emptyDelete.status, 200);
assert.equal(emptyDelete.data, null);

currentTime += 91000;
await writingClient.request("/_api/web/lists/getbytitle('Topicos')/items", {
  method: "POST",
  body: { Title: "Após expiração" }
});
assert.equal(digestCalls, 2);

await assert.rejects(
  writingClient.request("/_api/web/lists/getbytitle('Topicos')/items(1)", {
    method: "DELETE",
    etag: "*"
  }),
  (error) => error.code === "etag-required"
);
await writingClient.request("/_api/web/lists/getbytitle('Topicos')/fields/getbyinternalnameortitle('Title')", {
  method: "MERGE",
  etag: "*",
  allowWildcardEtag: true,
  body: { Title: "Título" }
});
assert.equal(writes.at(-1).options.headers["If-Match"], "*");

let writeThrottleCalls = 0;
const safeWriteClient = createSharePointRestClient({
  webUrl: "/teams/core-test",
  sleepImpl: async () => assert.fail("A gravação não deve repetir automaticamente."),
  fetchImpl: async (url) => {
    if (url.endsWith("/_api/contextinfo")) {
      return response(200, { FormDigestValue: "digest", FormDigestTimeoutSeconds: 120 });
    }
    writeThrottleCalls += 1;
    return response(429, {}, { "Retry-After": "1" });
  }
});
await assert.rejects(
  safeWriteClient.request("/_api/web/lists", { method: "POST", body: { Title: "Lista" } }),
  (error) => error.code === "throttled" && error.retryAfterMs === 1000
);
assert.equal(writeThrottleCalls, 1);

for (const [status, code] of [
  [403, "access-denied"],
  [404, "not-found"],
  [412, "concurrency-conflict"]
]) {
  const errorClient = createSharePointRestClient({
    webUrl: "/teams/core-test",
    fetchImpl: async () => response(status)
  });
  await assert.rejects(
    errorClient.request(`/_api/error-${status}`),
    (error) => error.code === code
      && error.status === status
      && error.path === `/teams/core-test/_api/error-${status}`
  );
}

console.log("rest.test.js: verificações concluídas com sucesso.");
