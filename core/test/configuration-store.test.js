import assert from "node:assert/strict";
import { createSharePointConfigurationStore } from "../configuration-store.js";

const calls = [];
const item = { __metadata: { type: "SP.Data.MSEConfiguracoesListItem" }, Id: 4, Title: "forum-principal", Escopo: "Instancia", Modulo: "forum", Layout: "Herdar", Tema: null, ConfiguracaoJson: JSON.stringify({ forum: { pageSize: 20 } }), VersaoConfiguracao: 1, Ativo: true };
const summaryItem = { ...item, Id: 5, Title: "forum-resumo", TipoInstancia: "Summary", ConfiguracaoJson: JSON.stringify({ layout: { marginTop: 32 }, title: { visible: true, text: "Discussões" } }) };
const response = (status, body, etag = null) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => etag }, json: async () => body });
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  if (url.includes("$filter=Ativo eq 1")) return response(200, { value: [item, summaryItem] });
  if (url.includes("/items?") && url.includes("$orderby=Title")) return response(200, { value: [item, summaryItem] });
  if (url.includes("/items(4)/versions")) return response(200, { value: [{ VersionId: 2, VersionLabel: "2.0", Created: "2026-09-19T12:00:00Z", CreatedBy: { Title: "Pessoa Exemplo" } }] });
  if (url.includes("/items(4)") && (options.method || "GET") === "GET") return response(200, { d: item }, '"etag-4"');
  if (url.endsWith("/_api/contextinfo")) return response(200, { FormDigestValue: "digest" });
  if (url.includes("/items(4)") && options.method === "POST") {
    const update = JSON.parse(options.body);
    item.ConfiguracaoJson = update.ConfiguracaoJson;
    item.VersaoConfiguracao = update.VersaoConfiguracao;
    return response(204, {});
  }
  throw new Error(`Requisição inesperada: ${url}`);
};

const store = createSharePointConfigurationStore({ webUrl: "/sites/demo", fetchImpl });
assert.deepEqual(await store.load({ moduleId: "forum", instanceId: "forum-principal" }), { forum: { pageSize: 20 } });
assert.deepEqual(await store.load({ moduleId: "forum", instanceId: "forum-resumo" }), { layout: { marginTop: 32 }, title: { visible: true, text: "Discussões" } });
const forumEpubs = await store.list("forum");
assert.deepEqual(forumEpubs.map(({ id, key, view }) => ({ id, key, view })), [
  { id: 4, key: "forum-principal", view: "Full" },
  { id: 5, key: "forum-resumo", view: "Summary" }
]);
const editable = await store.loadForEdit(4);
const saved = await store.save(editable, { forum: { pageSize: 50 } });
assert.equal(saved.version, 2);
assert.equal(saved.configuration.forum.pageSize, 50);
const history = await store.history(4);
assert.deepEqual(history[0], { id: 2, label: "2.0", created: "2026-09-19T12:00:00Z", author: "Pessoa Exemplo" });
assert.ok(calls.some(({ options }) => options.headers?.["If-Match"] === '"etag-4"'));
await assert.rejects(store.load({ moduleId: "forum", instanceId: "inválido" }), /instanceId inválido/);

console.log("configuration-store.test.js: verificações concluídas com sucesso.");
