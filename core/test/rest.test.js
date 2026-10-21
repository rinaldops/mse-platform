import assert from "node:assert/strict";
import {
  SharePointRestError,
  createSharePointRestClient,
  batchGet
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
        "odata.nextLink": "https://contoso.sharepoint.com/teams/core-test/_api/page-2"
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

// client.getDigest() é exposto publicamente (consumido por
// host-adapters/modern-script-editor/site-boot.js#createKernelListLoaders
// para repassar X-RequestDigest ao $batch) e reaproveita o mesmo cache —
// não dispara uma nova chamada /_api/contextinfo enquanto válido.
assert.equal(await writingClient.getDigest(), "digest-1");
assert.equal(digestCalls, 1);

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
    if (url.includes("/RootFolder/Files/add")) {
      return response(201, { ServerRelativeUrl: "/teams/core-test/ForumMidia/forum-123.png" });
    }
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

const imageBytes = Uint8Array.from([137, 80, 78, 71]);
const uploaded = await crudClient.uploadFile(
  { listId: "550E8400-E29B-41D4-A716-446655440000" },
  { fileName: "forum-123.png", content: imageBytes, contentType: "image/png" }
);
const uploadCall = crudCalls.at(-1);
assert.equal(uploaded.serverRelativeUrl, "/teams/core-test/ForumMidia/forum-123.png");
assert.match(uploadCall.url, /RootFolder\/Files\/add\(url='forum-123\.png',overwrite=false\)$/);
assert.equal(uploadCall.options.body, imageBytes);
assert.equal(uploadCall.options.headers["Content-Type"], "image/png");
await assert.rejects(
  crudClient.uploadFile("Midia", { fileName: "../invalido.png", content: imageBytes }),
  /fileName/
);
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

// --- batchGet: $batch REST (multipart/mixed, OData v3) ---------------------

function batchResponseBody(boundary, parts) {
  const lines = [];
  for (const part of parts) {
    const statusText = part.status === 200 ? "OK" : part.status === 404 ? "Not Found" : "Error";
    lines.push(`--${boundary}`);
    lines.push("Content-Type: application/http");
    lines.push("Content-Transfer-Encoding: binary");
    lines.push("");
    lines.push(`HTTP/1.1 ${part.status} ${statusText}`);
    lines.push("Content-Type: application/json;odata=nometadata");
    lines.push("");
    if (part.body !== undefined) lines.push(JSON.stringify(part.body));
    lines.push("");
  }
  lines.push(`--${boundary}--`);
  lines.push("");
  return lines.join("\r\n");
}

function batchResponse(boundary, parts) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => name.toLowerCase() === "content-type" ? `multipart/mixed; boundary=${boundary}` : null
    },
    async text() { return batchResponseBody(boundary, parts); }
  };
}

// Montagem correta do corpo multipart da requisição: uma única chamada POST
// para "$batch", com o boundary do header refletido no corpo, e uma
// sub-requisição GET por item de `requests`.
{
  let batchCalls = 0;
  let capturedUrl;
  let capturedOptions;
  const result = await batchGet(
    [
      { key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id&$top=10" },
      { key: "extensoes", path: "/_api/web/lists/getbytitle('MSEExtensoes')/items?$select=Id&$top=10" }
    ],
    {
      webUrl: "/teams/core-test",
      boundaryImpl: () => "batch_fixo",
      fetchImpl: async (url, options) => {
        batchCalls += 1;
        capturedUrl = url;
        capturedOptions = options;
        return batchResponse("batchresponse_fixo", [
          { status: 200, body: { value: [{ Id: 1 }] } },
          { status: 200, body: { value: [{ Id: 2 }] } }
        ]);
      }
    }
  );
  assert.equal(batchCalls, 1);
  assert.equal(capturedUrl, "/teams/core-test/_api/$batch");
  assert.equal(capturedOptions.method, "POST");
  assert.equal(capturedOptions.headers["Content-Type"], "multipart/mixed; boundary=batch_fixo");
  assert.match(capturedOptions.body, /--batch_fixo\r\n/);
  assert.match(capturedOptions.body, /GET \/teams\/core-test\/_api\/web\/lists\/getbytitle\('MSEMenu'\)\/items\?\$select=Id&\$top=10 HTTP\/1\.1/);
  assert.match(capturedOptions.body, /GET \/teams\/core-test\/_api\/web\/lists\/getbytitle\('MSEExtensoes'\)\/items\?\$select=Id&\$top=10 HTTP\/1\.1/);
  assert.match(capturedOptions.body, /--batch_fixo--/);
  assert.deepEqual(result.menu, { data: { value: [{ Id: 1 }] }, status: 200 });
  assert.deepEqual(result.extensoes, { data: { value: [{ Id: 2 }] }, status: 200 });

  console.log("rest.test.js: batchGet monta o corpo multipart da requisição ok.");
}

// digest: quando informado, vai no header X-RequestDigest da chamada
// externa POST .../_api/$batch — confirmado contra tenant real que, sem
// esse header, o SharePoint responde HTTP 403 "security validation...
// invalid" mesmo para um $batch "flat" só de GETs (ver nota no cabeçalho
// de batchGet). Quando omitido, o comportamento de antes é preservado
// (nenhum X-RequestDigest é enviado).
{
  let capturedOptionsWithDigest;
  await batchGet(
    [{ key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id" }],
    {
      webUrl: "/teams/core-test",
      boundaryImpl: () => "batch_digest",
      digest: "digest-123",
      fetchImpl: async (url, options) => {
        capturedOptionsWithDigest = options;
        return batchResponse("batchresponse_digest", [{ status: 200, body: { value: [] } }]);
      }
    }
  );
  assert.equal(capturedOptionsWithDigest.headers["X-RequestDigest"], "digest-123");

  let capturedOptionsWithoutDigest;
  await batchGet(
    [{ key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id" }],
    {
      webUrl: "/teams/core-test",
      boundaryImpl: () => "batch_sem_digest",
      fetchImpl: async (url, options) => {
        capturedOptionsWithoutDigest = options;
        return batchResponse("batchresponse_sem_digest", [{ status: 200, body: { value: [] } }]);
      }
    }
  );
  assert.equal("X-RequestDigest" in capturedOptionsWithoutDigest.headers, false);

  await assert.rejects(
    batchGet(
      [{ key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id" }],
      { webUrl: "/teams/core-test", digest: "", fetchImpl: async () => batchResponse("b", [{ status: 200 }]) }
    ),
    (error) => error instanceof TypeError
  );

  console.log("rest.test.js: batchGet repassa digest opcional como X-RequestDigest ok.");
}

// Falha parcial: uma sub-requisição com status 404 não aborta o parse das
// demais — cada entrada do mapa de retorno carrega seu próprio status.
{
  const result = await batchGet(
    [
      { key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id" },
      { key: "modulos", path: "/_api/web/lists/getbytitle('MSEModulos')/items?$select=Id" },
      { key: "modulosMenu", path: "/_api/web/lists/getbytitle('MSEModulosMenu')/items?$select=Id" }
    ],
    {
      webUrl: "/teams/core-test",
      fetchImpl: async () => batchResponse("resp_boundary", [
        { status: 404 },
        { status: 200, body: { value: [{ Id: 10 }] } },
        { status: 200, body: { value: [{ Id: 11 }] } }
      ])
    }
  );
  assert.equal(result.menu.status, 404);
  assert.equal(result.modulos.status, 200);
  assert.deepEqual(result.modulos.data, { value: [{ Id: 10 }] });
  assert.equal(result.modulosMenu.status, 200);
  assert.deepEqual(result.modulosMenu.data, { value: [{ Id: 11 }] });

  console.log("rest.test.js: batchGet mapeia falha parcial sem abortar as demais ok.");
}

// Falha total do $batch (erro de rede): propaga SharePointRestError
// "batch-failed", sem tentar parsear nada.
await assert.rejects(
  batchGet(
    [{ key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id" }],
    {
      webUrl: "/teams/core-test",
      fetchImpl: async () => { throw new Error("falha de rede simulada."); }
    }
  ),
  (error) => error instanceof SharePointRestError && error.code === "batch-failed"
);

// Falha total do $batch (resposta HTTP de nível superior não-200/207):
// também propaga "batch-failed".
await assert.rejects(
  batchGet(
    [{ key: "menu", path: "/_api/web/lists/getbytitle('MSEMenu')/items?$select=Id" }],
    {
      webUrl: "/teams/core-test",
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        headers: { get: () => null },
        async text() { return ""; }
      })
    }
  ),
  (error) => error instanceof SharePointRestError && error.code === "batch-failed" && error.status === 500
);

console.log("rest.test.js: verificações concluídas com sucesso.");
