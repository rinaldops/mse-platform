import assert from "node:assert/strict";
import { bootSiteKernel, createManifestResolver } from "../../host-adapters/modern-script-editor/site-boot.js";

// --- createManifestResolver: convenÃ§Ã£o de pasta fixa + override pontual ---

{
  const resolve = createManifestResolver("/sites/demo/SiteAssets/mse-platform/current");
  assert.equal(resolve("blog"), "/sites/demo/SiteAssets/mse-platform/current/modules/mod_blog/manifest.js");

  const resolveWithOverride = createManifestResolver(
    "/sites/demo/SiteAssets/mse-platform/current/",
    { "explore-mais": "modules/mod_recursos/manifest.js" }
  );
  assert.equal(
    resolveWithOverride("explore-mais"),
    "/sites/demo/SiteAssets/mse-platform/current/modules/mod_recursos/manifest.js"
  );
  const resolveAbsolute = createManifestResolver("/sites/demo/SiteAssets/mse-platform/current", {
    blog: "https://example.invalid/camap/modules/mod_blog/manifest.js"
  });
  assert.equal(resolveAbsolute("blog"), "https://example.invalid/camap/modules/mod_blog/manifest.js");
  assert.equal(
    resolveWithOverride("blog"),
    "/sites/demo/SiteAssets/mse-platform/current/modules/mod_blog/manifest.js"
  );

  assert.throws(() => createManifestResolver(""), /releaseBase/);
  assert.throws(() => createManifestResolver("   "), /releaseBase/);

  console.log("site-boot.test.js: createManifestResolver (convenção + override) ok.");
}

// --- bootSiteKernel: integraÃ§Ã£o ponta a ponta sobre fetchImpl falso (sem
// rede real), cobrindo as 4 listas MSE* via core/rest.js e a configuraÃ§Ã£o
// global via core/configuration-store.js -----------------------------------
//
// `createKernelListLoaders` (site-boot.js) resolve o `listId` real de cada
// lista MSE* via `/_api/web/lists?...&$expand=RootFolder` (casando por
// `RootFolder/Name`, nunca por `Title`) ANTES de montar o `$batch` â€” ver o
// comentÃ¡rio de `resolveKernelListIds` em site-boot.js para o porquÃª (o
// `Title` da lista Ã© renomeado pelo provisionamento, `getbytitle()` por
// nome interno quebraria). O fetchImpl falso abaixo simula esse catÃ¡logo
// com um GUID fixo por lista, e as sub-requisiÃ§Ãµes do `$batch` passam a
// usar `lists(guid'...')`, nÃ£o `getbytitle('MSEMenu')`.

const LIST_IDS = Object.freeze({
  MSEMenu: "11111111-1111-4111-8111-111111111111",
  MSEExtensoes: "22222222-2222-4222-8222-222222222222",
  MSEModulos: "33333333-3333-4333-8333-333333333333",
  MSEModulosMenu: "44444444-4444-4444-8444-444444444444"
});

function catalogResponse() {
  return jsonResponse({
    value: Object.entries(LIST_IDS).map(([internalName, id]) => ({
      Id: id,
      RootFolder: { Name: internalName }
    }))
  });
}

// --- FakeElement/document mÃ­nimos (mesmo padrÃ£o de kernel/test/application.test.js) ---

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.ownerDocument = null;
    this.textContent = "";
    this.parentNode = null;
    this.dataset = {};
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  dispatch(type, event = {}) { this.listeners.get(type)?.(event); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...children);
  }
  get firstChild() { return this.children[0] ?? null; }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
}

const document = {
  createElement(tag) {
    const node = new FakeElement(tag);
    node.ownerDocument = document;
    return node;
  },
  getElementById() { return null; }
};

function createRoot() {
  const root = new FakeElement("div");
  root.ownerDocument = document;
  return root;
}

function createWindow(initialHash = "#/") {
  return {
    location: { hash: initialHash },
    document,
    listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); },
    matchMedia: () => ({ matches: false })
  };
}

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    async json() { return body; }
  };
}

/**
 * Resposta fake de `POST {webUrl}/_api/contextinfo`, usada pelo
 * `fetchImpl` dos testes abaixo para que `client.getDigest()` (consumido
 * por `createKernelListLoaders#runBatch` antes de montar o `$batch` â€”
 * ver cabeÃ§alho de `site-boot.js`, nota sobre `X-RequestDigest`) resolva
 * sem lanÃ§ar, replicando o shape real do SharePoint (`FormDigestValue`).
 *
 * @returns {{ ok: boolean, status: number, headers: object, json: () => Promise<object> }}
 */
function digestResponse() {
  return jsonResponse({ FormDigestValue: "digest-fake", FormDigestTimeoutSeconds: 1800 });
}

/**
 * Extrai, na ordem em que aparecem no corpo multipart de uma requisiÃ§Ã£o
 * `$batch` (ver `core/rest.js`#`batchGet`), a URL de cada sub-requisiÃ§Ã£o GET
 * (linha `GET {url} HTTP/1.1`) â€” usado pelo `fetchImpl` falso abaixo para
 * decidir, por posiÃ§Ã£o, qual sub-resposta simular para cada lista.
 *
 * @param {string} body
 * @returns {string[]}
 */
function subRequestUrls(body) {
  const matches = body.matchAll(/^GET (\S+) HTTP\/1\.1$/gm);
  return [...matches].map((match) => match[1]);
}

/**
 * Monta uma resposta multipart/mixed de `$batch` fake: para cada URL de
 * sub-requisiÃ§Ã£o (na ordem capturada por `subRequestUrls`), decide o
 * status/corpo via `responseForUrl(url)` â€” que deve devolver
 * `{ status, body }` ou lanÃ§ar/retornar `null` para simular 404.
 *
 * @param {string[]} urls
 * @param {(url: string) => { status: number, body?: object }} responseForUrl
 * @returns {{ ok: boolean, status: number, headers: object, text: () => Promise<string> }}
 */
function batchFetchResponse(urls, responseForUrl) {
  const boundary = "batchresponse_fake";
  const lines = [];
  for (const url of urls) {
    const { status, body } = responseForUrl(url);
    lines.push(`--${boundary}`);
    lines.push("Content-Type: application/http");
    lines.push("Content-Transfer-Encoding: binary");
    lines.push("");
    lines.push(`HTTP/1.1 ${status} Status`);
    lines.push("Content-Type: application/json;odata=nometadata");
    lines.push("");
    if (body !== undefined) lines.push(JSON.stringify(body));
    lines.push("");
  }
  lines.push(`--${boundary}--`);
  lines.push("");
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => name.toLowerCase() === "content-type" ? `multipart/mixed; boundary=${boundary}` : null
    },
    async text() { return lines.join("\r\n"); }
  };
}

{
  const root = createRoot();
  const window = createWindow("#/");
  const calls = [];
  let batchBody;
  let batchHeaders;

  const fetchImpl = async (url, options = {}) => {
    calls.push(url);
    if (url.includes("getbytitle('MSEConfiguracoes')")) return jsonResponse({ value: [] });
    if (url.endsWith("/_api/contextinfo")) return digestResponse();
    if (url.includes("/_api/web/lists?") && url.includes("$expand=RootFolder")) return catalogResponse();
    if (url.endsWith("/_api/$batch")) {
      batchBody = options.body;
      batchHeaders = options.headers;
      const urls = subRequestUrls(options.body);
      return batchFetchResponse(urls, () => ({ status: 200, body: { value: [] } }));
    }
    throw new Error(`RequisiÃ§Ã£o inesperada em bootSiteKernel: ${url} (${options.method ?? "GET"})`);
  };

  const app = await bootSiteKernel({
    root,
    window,
    webUrl: "/sites/demo",
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    positions: ["topo"],
    fetchImpl
  });

  // Nenhum item de menu publicado -> rota raiz cai em "not-found"; nenhum
  // Componente/MÃ³dulo Ã© montado, entÃ£o nenhum import() Ã© tentado (ver nota
  // no cabeÃ§alho de site-boot.js: importModule sÃ³ Ã© usado quando hÃ¡ algo a
  // montar) e a asserÃ§Ã£o central aqui Ã© que o catÃ¡logo de listas foi
  // consultado (resoluÃ§Ã£o de listId por RootFolder/Name, imune ao bug de
  // renomeaÃ§Ã£o de Title) e que o `$batch` simulado (4 listas em uma Ãºnica
  // chamada) + a chamada separada de config foram feitos, cada um com os
  // campos/orderby/top esperados, usando `lists(guid'...')` em vez de
  // `getbytitle(nomeInterno)`.
  const [componentElement] = root.children;
  assert.equal(componentElement.dataset.mseDispatchReason, "not-found");

  assert.equal(calls.filter((url) => url.endsWith("/_api/$batch")).length, 1);
  assert.equal(batchHeaders["X-RequestDigest"], "digest-fake");
  assert.ok(batchBody.includes(`lists(guid'${LIST_IDS.MSEMenu}')`) && batchBody.includes("$orderby=Ordem") && batchBody.includes("$top=2000"));
  assert.ok(batchBody.includes(`lists(guid'${LIST_IDS.MSEExtensoes}')`) && batchBody.includes("$top=500"));
  assert.ok(batchBody.match(new RegExp(`lists\\(guid'${LIST_IDS.MSEModulos}'\\)[^\\n]*\\$top=2000[^\\n]*\\$orderby=Ordem`)));
  assert.ok(batchBody.includes(`lists(guid'${LIST_IDS.MSEModulosMenu}')`) && batchBody.includes("$top=5000"));
  assert.ok(calls.some((url) => url.includes("getbytitle('MSEConfiguracoes')") && url.includes("$filter=Ativo eq 1")));

  await app.dispose();

  console.log("site-boot.test.js: bootSiteKernel resolve listId por RootFolder/Name e carrega as 4 listas MSE* via $batch + config global ok.");
}

// --- bootSiteKernel: falha de uma lista degrada para fallback (lista
// vazia), sem derrubar o boot â€” repassa onLoadError do host ----------------

{
  const root = createRoot();
  const window = createWindow("#/");
  const loadErrors = [];

  const fetchImpl = async (url, options = {}) => {
    if (url.includes("getbytitle('MSEConfiguracoes')")) return jsonResponse({ value: [] });
    if (url.endsWith("/_api/contextinfo")) return digestResponse();
    if (url.includes("/_api/web/lists?") && url.includes("$expand=RootFolder")) return catalogResponse();
    if (url.endsWith("/_api/$batch")) {
      const urls = subRequestUrls(options.body);
      return batchFetchResponse(urls, (subUrl) => subUrl.includes(`lists(guid'${LIST_IDS.MSEMenu}')`)
        ? { status: 404 }
        : { status: 200, body: { value: [] } });
    }
    throw new Error(`RequisiÃ§Ã£o inesperada: ${url}`);
  };

  const app = await bootSiteKernel({
    root,
    window,
    webUrl: "/sites/demo",
    releaseBase: "/sites/demo/SiteAssets/mse-platform/current",
    positions: [],
    fetchImpl,
    onLoadError: (error, chave) => loadErrors.push(chave)
  });

  // "resolveLayout" também aparece aqui: bootSiteKernel agora liga
  // incondicionalmente o resolveLayout de Templates (ver site-boot.js#
  // createTemplateLayoutResolver); como esta configuração de teste não
  // publica nenhum Tema (MSEConfiguracoes vazio), resolveLayout rejeita por
  // design (ver seu próprio JSDoc: "não decide o fallback, só rejeita
  // quando theme.name está ausente"), e kernel/application.js repassa essa
  // rejeição isolada via onLoadError (mesmo princípio de loadSnapshot) antes
  // de cair para o layout neutro padrão — não é uma falha de rede, é o
  // caminho esperado quando nenhum Template está configurado.
  assert.deepEqual(loadErrors, ["menuItems", "resolveLayout"]);
  const [componentElement] = root.children;
  assert.equal(componentElement.dataset.mseDispatchReason, "not-found");

  await app.dispose();

  console.log("site-boot.test.js: falha ao carregar MSEMenu via $batch (sub-resposta 404) degrada para fallback (onLoadError) ok.");
}

console.log("site-boot.test.js: verificaÃ§Ãµes concluÃ­das com sucesso.");
